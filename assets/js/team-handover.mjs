import {KEYS, DATA_KEYS, readRaw, snapshot, createBackup, parseBackup, checkRevision, buildImportPlan, atomicApply, recoverTransaction} from './team-handover-core.mjs?v=team-handover-1';

const $=id=>document.getElementById(id), home=new URL('../../',import.meta.url);
const workDestination=new URL(new URLSearchParams(location.search).get('wing')==='tas'?'head-teacher-tas/#home':'#vet-home',home).href;
let selected=null, selectedBefore=null, busy=false;
const rawMeta=()=>localStorage.getItem(KEYS.metadata);
function metadata(){
  const raw=rawMeta(); if(!raw)return null;
  const value=JSON.parse(raw);
  if(value?.version!==1||!value.lastFile?.workspaceId||!Number.isInteger(value.lastFile.revision))throw Error('The team session record cannot be read. Keep this browser data intact for recovery.');
  return value;
}
const stamp=value=>new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'Australia/Sydney'}).format(new Date(value));
const expectedSnapshot=()=>({...readRaw(localStorage),[KEYS.metadata]:rawMeta()});
const fileInfo=payload=>Object.fromEntries(['workspaceId','revision','parentRevision','parentExportId','exportId','savedAt','savedBy','note','changes'].map(key=>[key,payload[key]]));
const fileContents=payload=>JSON.stringify(payload,null,2);
function say(message,error=false){$('handover-message').textContent=message;$('handover-message').classList.toggle('is-error',error);}
function editor(id){const value=$(id).value.trim();if(!value||value.length>80)throw Error('Enter your name or initials first.');return value;}
function download(payload,name='WWHS-team-handover.json'){
  const url=URL.createObjectURL(new Blob([fileContents(payload)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function saveMeta(before,next){
  atomicApply(localStorage,before,{...before,[KEYS.metadata]:JSON.stringify(next)});
  window.dispatchEvent(new Event('wwhs:team-session-updated'));
}
function clearSelection(){selected=null;selectedBefore=null;$('team-file').value='';$('file-preview').hidden=true;$('only-editor').checked=false;}
function render(){
  const meta=metadata(), active=meta?.active, pending=meta?.pendingExport, info=pending||meta?.lastFile;
  $('active-session').hidden=active?.phase!=='editing';$('pending-session').hidden=!pending;
  $('start-section').hidden=!!active;$('setup-section').hidden=!!meta;$('recovery-section').hidden=!meta?.recovery;
  $('resume-editing').hidden=!!active?.firstFile;
  $('status-title').textContent=!meta?'This browser is working individually':pending?'Handover ready to save':active?'Your team session is open':'Viewing the last shared snapshot';
  $('status-copy').textContent=!meta?'Create the first team file here, or import your colleague’s file. Your current progress stays unchanged until you choose.':pending?'Editing is paused. Put this file in Google Drive, then confirm below.':active?`Editing as ${active.editor}. Your changes are saved on this computer until you export and upload them.`:'Shared progress is view-only. Import the latest file to begin an editing session.';
  $('snapshot-facts').replaceChildren();
  if(info)for(const [title,value] of [['Version',String(info.revision)],['Saved by',info.savedBy],['File created',stamp(info.savedAt)]]){const wrap=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=title;dd.textContent=value;wrap.append(dt,dd);$('snapshot-facts').append(wrap);}
  $('last-note').textContent=info?.note?`Handover note: ${info.note}`:'';
  $('active-copy').textContent=active?`Session started ${stamp(active.startedAt)}. Save your work before exporting.`:'';
  $('pending-copy').textContent=pending?`Version ${pending.revision}, prepared by ${pending.savedBy} on ${stamp(pending.savedAt)}.`:'';
  $('team-file-contents').textContent=pending?fileContents(pending):'';
  if(!pending)$('copy-file-fallback').open=false;
  $('start-session').disabled=!selected;$('view-file').disabled=!selected;
  $('changes-list').replaceChildren();for(const change of info?.changes?.length?info.changes:['No changes summary recorded.']){const li=document.createElement('li');li.textContent=change;$('changes-list').append(li);}
}
function changedCounts(before,after){
  const sections=[['VET records',before.vet.records,after.vet.records],['VET assignments',before.vet.assignments,after.vet.assignments],['VET gaps',before.vet.gaps,after.vet.gaps],['VET triggered work',before.vet.eventOccurrences,after.vet.eventOccurrences],['TAS records',before.tas.records,after.tas.records],['TAS weekly checks',before.tas.weekly,after.tas.weekly],['TAS triggered work',before.tas.eventOccurrences,after.tas.eventOccurrences],['TAS adjusted dates',before.tas.scheduleOverrides,after.tas.scheduleOverrides],['Overall review ticks',before.review.records,after.review.records],['Shared working cards',Object.fromEntries(before.inbox.items.map(item=>[item.taskKey,item])),Object.fromEntries(after.inbox.items.map(item=>[item.taskKey,item]))]];
  const changes=[];for(const [label,old,next] of sections){const count=[...new Set([...Object.keys(old),...Object.keys(next)])].filter(key=>JSON.stringify(old[key])!==JSON.stringify(next[key])).length;if(count)changes.push(`${label}: ${count} changed`);}return changes.length?changes:['No changes to shared progress.'];
}
function run(action){return async()=>{if(busy)return;busy=true;try{await action();render();}catch(error){say(error.message,true);try{render();}catch{}}finally{busy=false;}};}
function checkSelectionFresh(){
  if(!selected||!selectedBefore)throw Error('Choose the latest shared JSON file first.');
  if(Object.entries(selectedBefore).some(([key,value])=>localStorage.getItem(key)!==value)){clearSelection();throw Error('Progress changed in another tab after you chose the file. Save and close that tab, then choose the file again.');}
}
$('team-file').addEventListener('change',run(async()=>{
  const file=$('team-file').files[0];selected=null;selectedBefore=null;$('file-preview').hidden=true;
  if(!file)return;if(file.size>12000000)throw Error('This file is too large for a team handover.');
  const before=expectedSnapshot(),meta=metadata();if(meta?.active)throw Error('Finish this browser’s current session first.');
  const payload=parseBackup(await file.text());checkRevision(payload,meta?.lastFile,{firstConnection:!meta});
  if(Object.entries(before).some(([key,value])=>localStorage.getItem(key)!==value))throw Error('Progress changed while the file was being read. Please choose it again.');
  selected=payload;selectedBefore=before;
  $('preview-heading').textContent=`Version ${payload.revision} · ${payload.savedBy}`;$('preview-copy').textContent=`Created ${stamp(payload.savedAt)}. Nothing has been imported yet.`;
  $('preview-note').textContent=payload.note?`Handover note: ${payload.note}`:'';
  $('preview-counts').textContent=`${Object.keys(payload.data.vet.records).length} VET records · ${Object.keys(payload.data.tas.records).length} TAS records · ${payload.data.inbox.items.length} shared working cards`;
  $('file-preview').hidden=false;say(meta&&payload.revision>meta.lastFile.revision+1?'This skips one or more versions. Confirm it came from the current shared folder; intermediate history cannot be checked.':'File checked. Choose whether to edit or view it.');
}));
async function importFile(editing){
  checkSelectionFresh();const before=expectedSnapshot(),meta=metadata();if(meta?.active)throw Error('Finish this browser’s current session first.');
  const name=editing?editor('editor-name'):null;if(editing&&!$('only-editor').checked)throw Error('Confirm you have the latest shared file and nobody else is editing.');
  const plan=buildImportPlan(localStorage,selected,{lastFile:meta?.lastFile,firstConnection:!meta});
  if(!meta&&Object.values(plan.before).some(Boolean)&&!confirm('Replace shared VET/TAS progress here with the selected team file? A local recovery copy will be kept. Personal notes and Finance stay here.'))return;
  checkSelectionFresh();const next={version:1,lastFile:fileInfo(selected),active:editing?{id:crypto.randomUUID(),editor:name,startedAt:new Date().toISOString(),phase:'editing',baseExportId:selected.exportId,baselineData:selected.data}:null,pendingExport:null,recovery:{capturedAt:new Date().toISOString(),lastFile:meta?.lastFile||null,data:plan.beforeSnapshot,raw:plan.before}};
  atomicApply(localStorage,{...plan.before,[KEYS.metadata]:before[KEYS.metadata]},{...plan.after,[KEYS.metadata]:JSON.stringify(next)});
  // Full navigation reloads native workboard closures after importing new state.
  location.assign(workDestination);
}
$('start-session').addEventListener('click',run(()=>importFile(true)));
$('view-file').addEventListener('click',run(()=>importFile(false)));
$('create-team').addEventListener('click',run(()=>{
  const before=expectedSnapshot();if(metadata())throw Error('This browser already has a team workspace. Import the latest shared file instead.');
  const name=editor('setup-editor'),data=snapshot(localStorage),payload=createBackup({snapshot:data,editor:name,workspaceId:crypto.randomUUID(),note:'First shared team snapshot.',changes:['First team file created from the saved VET and TAS progress on this computer.']});
  saveMeta(before,{version:1,lastFile:fileInfo(payload),active:{id:crypto.randomUUID(),editor:name,startedAt:new Date().toISOString(),phase:'exporting',firstFile:true,baseExportId:payload.exportId,baselineData:data},pendingExport:payload,recovery:null});
  download(payload);say('The first file is ready and its download has been requested. Check it saved on your device, then upload it to the shared folder and confirm below.');
}));
$('finish-session').addEventListener('click',run(()=>{
  const before=expectedSnapshot(),meta=metadata();if(meta?.active?.phase!=='editing')throw Error('There is no editing session to finish.');
  if(!$('notes-saved').checked)throw Error('Save your task notes and close other editing tabs, then tick the confirmation.');
  const data=snapshot(localStorage),payload=createBackup({snapshot:data,previous:meta.lastFile,editor:meta.active.editor,note:$('handover-note').value.trim(),changes:changedCounts(meta.active.baselineData,data)});
  saveMeta(before,{...meta,active:{...meta.active,phase:'exporting'},pendingExport:payload});
  download(payload);say('The updated file is ready and its download has been requested. Check it saved on your device, then upload it to the current handover folder and confirm below.');
}));
$('download-again').addEventListener('click',run(()=>{const payload=metadata()?.pendingExport;if(!payload)throw Error('There is no handover waiting to be saved.');download(payload);say('Another download of the same file has been requested. Check it saved on your device; use the copy option below if the download does not appear.');}));
$('copy-file-contents').addEventListener('click',run(async()=>{
  const payload=metadata()?.pendingExport;if(!payload)throw Error('There is no handover waiting to be saved.');
  const text=fileContents(payload);$('team-file-contents').textContent=text;
  try{
    await navigator.clipboard.writeText(text);
    say('File contents copied. Save the complete text as WWHS-team-handover.json, then upload that file to the current handover folder.');
  }catch{
    $('copy-file-fallback').open=true;
    say('Automatic copying was blocked. Select and copy all the file contents below, then save them as WWHS-team-handover.json.',true);
  }
}));
$('confirm-finish').addEventListener('click',run(()=>{
  const before=expectedSnapshot(),meta=metadata();if(!meta?.pendingExport)throw Error('There is no handover waiting to be saved.');
  saveMeta(before,{...meta,lastFile:fileInfo(meta.pendingExport),active:null,pendingExport:null});
  clearSelection();$('notes-saved').checked=false;$('handover-note').value='';say('Handover finished. Let your colleague know the latest file is ready in Google Drive. This browser is now view-only.');
}));
$('resume-editing').addEventListener('click',run(()=>{
  const before=expectedSnapshot(),meta=metadata();if(!meta?.pendingExport||!meta.active||meta.active.firstFile)throw Error('Save the first shared file, then import it to start editing.');
  if(!confirm('Return to editing? The prepared file will become outdated. Do not upload or share it. Export a fresh file when you finish.'))return;
  saveMeta(before,{...meta,pendingExport:null,active:{...meta.active,phase:'editing'}});location.assign(workDestination);
}));
$('download-recovery').addEventListener('click',run(()=>{
  const recovery=metadata()?.recovery;if(!recovery)throw Error('No earlier import recovery copy is stored in this browser.');
  const payload=createBackup({snapshot:recovery.data,editor:'Local recovery copy',workspaceId:crypto.randomUUID(),note:`For review only: progress before import on ${stamp(recovery.capturedAt)}. Do not replace the current shared file.`});
  download(payload,'WWHS-team-recovery-review-only.json');say('The recovery copy is ready and its download has been requested. Check it saved on your device. Current progress is unchanged.');
}));
window.addEventListener('storage',event=>{if(event.key===null||[...DATA_KEYS,KEYS.metadata,KEYS.journal].includes(event.key)){clearSelection();try{render();say('Saved progress or the team session changed in another tab. Check the current status before continuing.');}catch(error){say(error.message,true);}}});
try{
  if(localStorage.getItem('morning-launchpad-theme')==='dark')document.documentElement.dataset.theme='dark';
  const recovered=recoverTransaction(localStorage);render();if(recovered.status!=='none')say('The interrupted handover has been recovered. Check the current status before continuing.');
}catch(error){say(error.message,true);for(const control of document.querySelectorAll('button,input,textarea'))control.disabled=true;}
