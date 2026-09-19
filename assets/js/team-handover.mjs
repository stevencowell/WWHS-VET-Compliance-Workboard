import {KEYS,DATA_KEYS,readRaw,snapshot,createBackup,parseBackup} from './team-handover-core.mjs?v=team-handover-1';
import {applyTeamTransaction,recoverTeamTransaction} from './team-handover-transaction.mjs?v=backup-flow-2';
import {prepareTeamMetadata,hydrateTeamMetadata,inspectTeamMetadata} from './team-handover-payloads.mjs?v=backup-flow-2';
import {createSafetyBackup,parseTeamFile,buildReconnectPlan,prepareReconnectPlan} from './team-handover-recovery.mjs?v=backup-flow-2';
import {downloadDestination} from './save-backup-file.mjs?v=backup-flow-2';
import {getBackupFolder} from './backup-folder.mjs?v=backup-flow-2';
import {mountBackupFolderSettings} from './backup-folder-ui.mjs?v=backup-flow-2';

const $=id=>document.getElementById(id),home=new URL('../../',import.meta.url);
const storage=()=>window.WWHS_STORAGE||localStorage,teamFolder=getBackupFolder('team');
mountBackupFolderSettings($('team-backup-folder'),{scope:'team'});
const workDestination=new URL(new URLSearchParams(location.search).get('wing')==='tas'?'head-teacher-tas/#home':'#vet-home',home).href;
let selected=null,selectedBefore=null,busy=true,inspection=null,currentData=null,saveAttemptId=null,safetyAttempt=null;
const stamp=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'Australia/Sydney'}).format(new Date(value)):'Unknown date';
const rawMeta=()=>storage().getItem(KEYS.metadata);
const expectedSnapshot=()=>({...readRaw(storage()),[KEYS.metadata]:rawMeta()});
const contents=value=>JSON.stringify(value);
const info=file=>Object.fromEntries(['workspaceId','revision','parentRevision','parentExportId','exportId','savedAt','savedBy','note','changes'].map(key=>[key,file[key]]));
const count=data=>`${Object.keys(data.vet.records).length} VET records · ${Object.keys(data.tas.records).length} TAS records · ${Object.keys(data.review.records).length} review ticks · ${data.inbox.items.length} shared cards`;
const validName=value=>typeof value==='string'&&value.trim().length<=80?value.trim():'';
const editor=id=>validName($(id).value)||validName(inspection?.stored?.active?.editor)||'Workboard user';
function say(message,error=false){$('handover-message').textContent=message;$('handover-message').classList.toggle('is-error',error);$('handover-message').setAttribute('role',error?'alert':'status');}
function assertUnchanged(before){if(Object.entries(before).some(([key,value])=>storage().getItem(key)!==value))throw Error('Progress changed in another tab. Your work is kept. Reload this page before continuing.');}
function assertExpected(before){
  assertUnchanged(before);
  if(storage().getItem(KEYS.journal)!==null)throw Error('An interrupted handover needs recovery. You can still save a safety copy, then use Check again.');
  if(storage().getItem('morning-launchpad-restore:v1')!==null)throw Error('A Launchpad backup needs to finish opening. Return to Launchpad before replacing shared progress.');
}
async function metadata(before=expectedSnapshot()){
  let value;try{value=before[KEYS.metadata]===null?null:JSON.parse(before[KEYS.metadata]);}catch{throw Error('The handover history needs reconnecting. Save a safety copy, then open the latest shared backup.');}
  const result=await hydrateTeamMetadata(value);assertExpected(before);return result;
}
function clearSelection(){selected=null;selectedBefore=null;$('team-file').value='';$('file-preview').hidden=true;}
function openBackupAction(focus=true){
  const opening=['#import-backup','#start-section'].includes(location.hash);
  $('start-section').hidden=!opening;$('save-panel').hidden=opening;
  $('handover-import-link').setAttribute('aria-current',opening?'page':'false');$('handover-save-link').setAttribute('aria-current',opening?'false':'page');
  if(focus){const panel=$(opening?'start-section':'save-panel');panel.focus({preventScroll:true});panel.scrollIntoView({block:'start'});}
}
for(const id of ['handover-import-link','handover-save-link'])$(id).addEventListener('click',event=>{event.preventDefault();history.replaceState(null,'',event.currentTarget.getAttribute('href'));openBackupAction();});
window.addEventListener('hashchange',()=>openBackupAction());
function enableControls(enabled){
  $('team-backup-folder').inert=!enabled;
  for(const control of document.querySelectorAll('button,input,textarea'))if(!control.closest('#team-backup-folder'))control.disabled=!enabled;
  if(enabled){
    const interrupted=storage().getItem(KEYS.journal)!==null||storage().getItem('morning-launchpad-restore:v1')!==null;
    $('start-session').disabled=$('view-file').disabled=!selected||interrupted;
    $('confirm-finish').disabled=!saveAttemptId||saveAttemptId!==inspection?.hydrated?.pendingExport?.exportId;
    for(const id of ['create-team','finish-session','save-safety','download-current','save-current-safety','save-independent-copy'])$(id).disabled=!currentData;
  }
}
async function render(){
  inspection=await inspectTeamMetadata(rawMeta());
  const meta=inspection.hydrated,healthy=inspection.complete,active=meta?.active,pending=healthy?meta?.pendingExport:null;
  const interrupted=storage().getItem(KEYS.journal)!==null||storage().getItem('morning-launchpad-restore:v1')!==null;
  let problem='';try{currentData=snapshot(storage());}catch(error){currentData=null;problem=error.message;}
  $('save-counts').textContent=currentData?count(currentData):'Current progress needs checking before it can be saved.';
  const damaged=!healthy||interrupted||(active?.phase==='exporting'&&!pending);
  $('history-warning').hidden=!damaged&&!problem;
  $('history-warning-copy').textContent=problem||(!healthy?'Part of the previous handover history is unavailable in this browser. The current task records are stored separately.':'An interrupted backup needs checking. A safety copy preserves the readable records currently on this computer.');
  $('setup-section').hidden=damaged||!!meta;
  $('active-session').hidden=damaged||active?.phase!=='editing';
  $('pending-session').hidden=!pending||interrupted;
  $('snapshot-session').hidden=!damaged&&(!meta||!!active);
  $('snapshot-copy').textContent=damaged?'Save the VET/TAS progress currently on this computer before reconnecting.':'You are viewing a shared copy. You can save a safety backup of it without opening another file.';
  $('pending-copy').textContent=pending?`Backup prepared ${stamp(pending.savedAt)}. Save it, then confirm it is in the shared Drive folder.`:'';
  $('resume-editing').hidden=!!active?.firstFile;
  $('recovery-section').hidden=!meta?.recovery?.data;
  const details=pending||inspection.stored?.lastFile;
  $('status-title').textContent=damaged?'Handover history needs reconnecting':!meta?'Working on this computer':pending?'Backup ready to save':active?'Editing shared progress':'Viewing shared progress';
  $('status-copy').textContent=active?.editor?`Editing as ${active.editor}.`:'';
  $('snapshot-facts').replaceChildren();
  if(details)for(const [title,value] of [['Version',String(details.revision)],['Saved by',details.savedBy||'Unknown'],['Created',stamp(details.savedAt)]]){const wrap=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=title;dd.textContent=value;wrap.append(dt,dd);$('snapshot-facts').append(wrap);}
  $('last-note').textContent=details?.note||'';
  $('changes-list').replaceChildren();for(const change of Array.isArray(details?.changes)?details.changes.filter(item=>typeof item==='string'):[]){const li=document.createElement('li');li.textContent=change;$('changes-list').append(li);}
  openBackupAction(false);
}
function run(action){return async()=>{
  if(busy)return;busy=true;enableControls(false);
  try{await action();$('save-fallback').hidden=true;}catch(error){say(error.message,true);if(currentData&&location.hash!=='#import-backup')$('save-fallback').hidden=false;}
  finally{try{await render();busy=false;enableControls(true);}catch(error){busy=false;say(error.message,true);$('cancel-open').disabled=false;$('retry-recovery').disabled=false;}}
};}
function chooseDestination(name,downloadOnly=false){return downloadOnly?Promise.resolve(downloadDestination(name)):teamFolder.destination(name,{direct:true});}
async function checkDestination(destination,payload,{safety=false}={}){
  if(!destination.read)return;
  const existing=await destination.read();if(!existing?.trim())return existing;
  if(safety)throw Error('Please save this safety copy with a new filename. The existing file has not been changed.');
  let old;try{old=parseBackup(existing);}catch{throw Error('That location contains a different kind of file. Choose a new filename; the existing file has not been changed.');}
  if(old.workspaceId!==payload.workspaceId||![payload.parentExportId,payload.exportId].includes(old.exportId))throw Error('The file in that folder is a different or newer handover. It has not been overwritten. Open the latest shared backup, or save a safety copy with a new filename.');
  return existing;
}
async function savePreparedFile(payload,destination,before){
  assertExpected(before);const expectedText=await checkDestination(destination,payload);assertExpected(before);
  let result;try{result=await destination.write(contents(payload),{expectedText,verify:()=>assertExpected(before)});}catch(error){throw Error('The file could not be saved there, or changed while saving. Your task progress and prepared backup are kept. Try again or use Download instead of Save as in Backup settings.');}
  assertExpected(before);saveAttemptId=payload.exportId;
  $('save-receipt').textContent=result.saved?'Backup saved to the location you chose. If it is in your Google Drive folder, wait for syncing, then finish below.':'Download started. Find the file in Downloads or Files, put it in the shared Google Drive folder, then finish below.';
  say('Backup prepared. Your current task progress has been kept.');
}
async function saveMeta(before,next){
  const compact=await prepareTeamMetadata(next),after={...before,[KEYS.metadata]:JSON.stringify(compact)};
  assertExpected(before);window.WWHS_TEAM_STORAGE_REPORT?.recordPlan(before,after);
  await applyTeamTransaction(storage(),before,after);assertExpected(after);window.dispatchEvent(new Event('wwhs:team-session-updated'));return after;
}
function changes(before,after){
  const rows=[];for(const [key,title] of [['vet','VET'],['tas','TAS'],['review','Review ticks'],['inbox','Shared working cards']])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))rows.push(`${title} updated.`);
  return rows.length?rows:['No changes to shared progress.'];
}
async function createTeam(downloadOnly=false){
  const before=expectedSnapshot(),name=editor('setup-editor'),destination=await chooseDestination('WWHS-team-handover.json',downloadOnly);
  if(!destination){say('Save cancelled. Nothing changed.');return;}
  if(await metadata(before))throw Error('The saved handover changed. Reload before saving.');
  const payload=createBackup({snapshot:snapshot(storage()),editor:name,note:'First shared team backup.',changes:['First shared backup created.']});
  await checkDestination(destination,payload);assertExpected(before);
  const after=await saveMeta(before,{version:1,lastFile:info(payload),active:{id:crypto.randomUUID(),editor:name,startedAt:new Date().toISOString(),phase:'exporting',firstFile:true,baseExportId:payload.exportId},pendingExport:payload,recovery:null});
  await savePreparedFile(payload,destination,after);
}
async function finishSession(downloadOnly=false){
  const before=expectedSnapshot(),destination=await chooseDestination('WWHS-team-handover.json',downloadOnly);
  if(!destination){say('Save cancelled. Your work is unchanged.');return;}
  const meta=await metadata(before);if(meta?.active?.phase!=='editing')throw Error('The editing session changed. Reload before saving.');
  const data=snapshot(storage()),payload=createBackup({snapshot:data,previous:meta.lastFile,editor:meta.active.editor,note:$('handover-note').value.trim(),changes:changes(meta.active.baselineData,data)});
  await checkDestination(destination,payload);assertExpected(before);
  const after=await saveMeta(before,{...meta,active:{...meta.active,phase:'exporting'},pendingExport:payload});await savePreparedFile(payload,destination,after);
}
async function saveAgain(downloadOnly=false){
  const before=expectedSnapshot(),destination=await chooseDestination('WWHS-team-handover.json',downloadOnly);
  if(!destination){say('Save cancelled. The prepared backup is kept.');return;}
  const payload=(await metadata(before))?.pendingExport;if(!payload)throw Error('The prepared backup changed. Reload before saving.');
  await savePreparedFile(payload,destination,before);
}
async function saveSafety(downloadOnly=false,dataOverride=null){
  const before=expectedSnapshot(),data=dataOverride||snapshot(before);
  const journals=[storage().getItem(KEYS.journal),storage().getItem('morning-launchpad-restore:v1')];
  const payload=createSafetyBackup({snapshot:data,editor:editor('editor-name'),note:dataOverride?'Saved progress before an earlier backup was opened.':'Safety copy of readable progress on this computer. Review before using it as a new shared starting point.'});
  const name=`WWHS-VET-TAS-safety-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  const destination=await chooseDestination(name,downloadOnly);if(!destination){say('Save cancelled. Nothing changed.');return;}
  const unchanged=()=>{assertUnchanged(before);if(journals[0]!==storage().getItem(KEYS.journal)||journals[1]!==storage().getItem('morning-launchpad-restore:v1'))throw Error('Recovery changed while saving. Keep the file for review and save again after recovery finishes.');};
  unchanged();const expectedText=await checkDestination(destination,payload,{safety:true});unchanged();const result=await destination.write(contents(payload),{expectedText,verify:unchanged});unchanged();
  safetyAttempt={before,journals,isCurrent:!dataOverride};$('safety-receipt').hidden=result.saved;
  $('save-receipt').textContent=result.saved?'Safety backup saved to the location you chose. Current progress and the shared handover file are unchanged.':'Safety backup download started. Your current progress is unchanged.';
  say(result.saved?'Safety copy saved. You can now open the latest shared backup to reconnect.':'Check the downloaded safety copy before continuing.');
  if(result.saved&&!dataOverride)try{await window.WWHS_TEAM_EXIT_GUARD?.acknowledgeSafetyBackup({before,journals});}catch{say('The safety file was saved, but the close reminder could not be reset. Keep the file; current progress is unchanged.',true);}
}
$('create-team').addEventListener('click',run(()=>createTeam()));
$('finish-session').addEventListener('click',run(()=>finishSession()));
$('download-again').addEventListener('click',run(()=>saveAgain()));
$('save-safety').addEventListener('click',run(()=>saveSafety()));
$('save-current-safety').addEventListener('click',run(()=>saveSafety()));
$('save-independent-copy').addEventListener('click',run(()=>saveSafety()));
$('download-current').addEventListener('click',run(()=>!$('setup-section').hidden?createTeam(true):!$('active-session').hidden?finishSession(true):!$('pending-session').hidden?saveAgain(true):saveSafety(true)));
$('confirm-safety').addEventListener('click',run(async()=>{if(!safetyAttempt)throw Error('Save a safety copy first.');assertUnchanged(safetyAttempt.before);if(safetyAttempt.journals[0]!==storage().getItem(KEYS.journal)||safetyAttempt.journals[1]!==storage().getItem('morning-launchpad-restore:v1'))throw Error('Recovery changed after that download. Save a fresh backup.');if(safetyAttempt.isCurrent)await window.WWHS_TEAM_EXIT_GUARD?.acknowledgeSafetyBackup(safetyAttempt);$('safety-receipt').hidden=true;say('Safety copy confirmed. Current progress is unchanged.');}));
$('confirm-finish').addEventListener('click',run(async()=>{
  const before=expectedSnapshot(),meta=await metadata(before);if(!saveAttemptId||meta?.pendingExport?.exportId!==saveAttemptId)throw Error('Save this backup first, then confirm the file is in Google Drive.');
  await saveMeta(before,{...meta,lastFile:info(meta.pendingExport),active:null,pendingExport:null});saveAttemptId=null;clearSelection();$('handover-note').value='';$('save-receipt').textContent='Handover finished. Your colleague can open the shared file.';say('Handover finished. This computer now shows the saved copy.');
}));
$('resume-editing').addEventListener('click',run(async()=>{
  const before=expectedSnapshot(),meta=await metadata(before);if(!meta?.pendingExport||!meta.active||meta.active.firstFile)throw Error('Save the first shared backup before continuing.');
  if(!confirm('Continue editing? Any prepared file will be out of date. Save a fresh backup when you finish.'))return;
  await saveMeta(before,{...meta,pendingExport:null,active:{...meta.active,phase:'editing'}});window.WWHS_TEAM_EXIT_GUARD?.allowNavigation(workDestination);location.assign(workDestination);
}));
function checkSelection(){if(!selected||!selectedBefore)throw Error('Choose a backup file first.');assertExpected(selectedBefore);}
$('team-file').addEventListener('change',run(async()=>{
  selected=null;selectedBefore=null;$('file-preview').hidden=true;const file=$('team-file').files[0];if(!file)return;if(file.size>48000000)throw Error('This backup is too large to open safely. Current progress is unchanged.');
  const before=expectedSnapshot(),text=await file.text();let parsed;
  try{parsed=parseTeamFile(text);}catch(error){let other;try{other=JSON.parse(text);}catch{}if(other?.items||other?.kind==='WWHS-LAUNCHPAD-BACKUP'||other?.format==='wwhs-launchpad-backup')throw Error('This is a Launchpad backup. Open it in Launchpad; no VET/TAS progress has changed.');throw error;}
  assertExpected(before);
  const plan=buildReconnectPlan(storage(),parsed.file,{editor:editor('editor-name'),allowUnverifiedLineage:true});assertUnchanged(before);
  selected=parsed;selectedBefore=before;
  $('preview-heading').textContent=parsed.type==='safety'?'Safety backup':`Shared backup · version ${parsed.file.revision}`;
  $('preview-copy').textContent=`Saved ${stamp(parsed.file.savedAt)} by ${parsed.file.savedBy}. Nothing has changed yet.`;
  $('preview-counts').textContent=count(parsed.data);$('preview-note').textContent=parsed.file.note||'';
  $('preview-warning').textContent=parsed.type==='safety'?'This safety copy will become a new shared starting point. Your current progress and old handover record will be kept for recovery.':plan.lineage==='unverified-reconnect'?'The old connection cannot be checked. Only open this if it is your trusted shared file. Current progress and the old record will be kept.':inspection?.stored?.active?'Opening this file replaces the current editing copy. Its saved progress will be kept in a recovery copy first.':plan.skipsRevisions?'This skips some shared versions. Check that you chose the newest file.':'Opening this backup keeps a recovery copy of the current saved progress first.';
  $('file-preview').hidden=false;say('File checked. Review it, then choose Open for editing or Open to view only.');
}));
async function openSelected(editing){
  checkSelection();const plan=buildReconnectPlan(storage(),selected.file,{editor:editor('editor-name'),editing,allowUnverifiedLineage:true});
  assertUnchanged(selectedBefore);const prepared=await prepareReconnectPlan(plan);checkSelection();
  window.WWHS_TEAM_STORAGE_REPORT?.recordPlan(prepared.before,prepared.after);await applyTeamTransaction(storage(),prepared.before,prepared.after);assertExpected(prepared.after);
  window.WWHS_TEAM_EXIT_GUARD?.allowNavigation(workDestination);location.assign(workDestination);
}
$('start-session').addEventListener('click',run(()=>openSelected(true)));$('view-file').addEventListener('click',run(()=>openSelected(false)));
$('cancel-open').addEventListener('click',()=>{if(busy)return;clearSelection();history.replaceState(null,'','#save-backup');say('Open cancelled. Current progress is unchanged.');openBackupAction();enableControls(true);});
$('download-recovery').addEventListener('click',run(async()=>{const current=await inspectTeamMetadata(rawMeta());if(!current.hydrated?.recovery?.data)throw Error('That previous copy is unavailable. Current progress is unchanged.');await saveSafety(false,current.hydrated.recovery.data);}));
$('retry-recovery').addEventListener('click',run(async()=>{await recoverTeamTransaction(storage());say('Checked the saved records. You can save current progress or open a trusted backup.');}));
window.addEventListener('storage',event=>{if(event.key===null||[...DATA_KEYS,KEYS.metadata,KEYS.journal,'morning-launchpad-restore:v1'].includes(event.key)){clearSelection();saveAttemptId=null;if(!busy)run(async()=>say('Progress changed in another tab. Review the current records before continuing.'))();}});
enableControls(false);
try{if(storage().getItem('morning-launchpad-theme')==='dark')document.documentElement.dataset.theme='dark';await recoverTeamTransaction(storage());}catch(error){say(error.message,true);}
try{await render();busy=false;enableControls(true);openBackupAction();}catch(error){busy=false;say(error.message,true);$('cancel-open').disabled=false;$('retry-recovery').disabled=false;}
