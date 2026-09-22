// Manual team handover only. This module never reads files or sends data anywhere.
import {INBOX_KEY, EDITABLE, validateInbox, validDate, validWorkOrigin, mergeWorkboardImports} from '../../morning-launchpad/assets/summary-core.mjs?v=edit-card-text-1';

export const KEYS = Object.freeze({
  vet:'wwhs-vet-compliance-workboard:v3', tas:'wwhs-head-teacher-tas-workboard:v2',
  review:'wwhs-task-register-review:v1', inbox:INBOX_KEY,
  metadata:'wwhs-team-handover:v1', vetMetadata:'wwhs-team-handover:vet:v1', tasMetadata:'wwhs-team-handover:tas:v1', journal:'wwhs-team-handover-journal:v1'
});
export const DATA_KEYS = Object.freeze([KEYS.vet,KEYS.tas,KEYS.review,KEYS.inbox]);
const WRITABLE_KEYS = [...DATA_KEYS,KEYS.metadata,KEYS.vetMetadata,KEYS.tasMetadata];
export const metadataKey = scope=>scope==='vet'?KEYS.vetMetadata:scope==='tas'?KEYS.tasMetadata:KEYS.metadata;
const MAX_SIZE = 12000000;
const FORBIDDEN_KEYS = new Set(['__proto__','prototype','constructor']);
const VET_FIELDS = ['records','assignments','gaps','eventOccurrences'];
const TAS_FIELDS = ['records','weekly','eventOccurrences','scheduleOverrides'];
export const TEAM_ITEM_FIELDS = Object.freeze(['taskKey','title','action','noteText','workstream','origin','forecast','taskHelp',
  'progressOverride','sectionOverride','createdOn','lastActionOn','personal','priority','nextAction','dueDate','eventDate','followUpDate',
  'dateNote','owner','waitingOn','instruction','reason','score','group','status','dependsOn','dirty']);
const TEAM_DIRTY_FIELDS = EDITABLE.filter(key=>TEAM_ITEM_FIELDS.includes(key));
const FORECAST_FIELDS = ['version','managed','active','section','kind','reason','scheduledDate','windowStart','windowEnd','period',
  'sourceStatus','blocked','blockerReason','asOf','role','roleLabel','year','sourceYear','horizonDays'];
const WORK_ROLES = ['Head Teacher VET','VET Coordinator','VET Coordinator Assistant','Trainer/assessor','Principal or delegate',
  'Workplace learning coordinator','Authorised NESA staff','RTO/VSO support'];
const STATUS = ['not-started','in-progress','waiting','performed','recorded','completed','verified','exception','not-applicable'];
const VET_RECORD_FIELDS = ['status','evidenceRef','verifier','sourceChecked','doneWhenConfirmed','independentVerifierConfirmed',
  'dependencyExceptionConfirmed','sourceCheckedAt','reviewDate','escalationDate','waitingForRole','handoffTo','handoffState','exceptionSummary','stepChecks','history'];
const TAS_RECORD_FIELDS = ['status','steps','milestones','evidenceRef','verifier','sourceChecked','doneConfirmed','exceptionReason','updatedAt'];
const own = (value,key)=>Object.hasOwn(value,key);
const object = value=>!!value && typeof value==='object' && !Array.isArray(value);
const clone = value=>JSON.parse(JSON.stringify(value));
const field = (value,key,fallback)=>own(value,key)?value[key]:fallback;
function fail(message){throw new Error(message);}
function bounded(value,max,label,{required=false}={}){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(`Invalid ${label}.`);
  return value;
}
function identity(value,max=2000){
  bounded(value,max,'task identity',{required:true});
  if(/[\u0000-\u001f\u007f]/.test(value)||FORBIDDEN_KEYS.has(value))fail('Invalid task identity.');
  return value;
}
function keys(value,allowed,label){if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key)))fail(`Unrecognised ${label} fields.`);}
function timestamp(value,label,{empty=true}={}){
  if(empty&&value==='')return value;
  if(typeof value!=='string'||value.length>40||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||!validDate(value.slice(0,10)))fail(`Invalid ${label}.`);
  return value;
}
function date(value,label){if(typeof value!=='string'||!validDate(value))fail(`Invalid ${label}.`);return value;}
function boolean(value,label){if(typeof value!=='boolean')fail(`Invalid ${label}.`);return value;}
function enumValue(value,values,label){if(!values.includes(value))fail(`Invalid ${label}.`);return value;}
function pick(value,fields){return Object.fromEntries(fields.filter(key=>own(value,key)).map(key=>[key,clone(value[key])]));}
function map(value,fn,label,max=2000){
  if(!object(value)||Object.keys(value).length>max)fail(`Invalid ${label}.`);
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[identity(key),fn(item,key)]));
}
function checks(value){
  return map(value,(item,key)=>{if(!/^\d{1,3}$/.test(key))fail('Invalid checklist index.');return boolean(item,'checklist tick');},'checklist',200);
}
function history(value){
  if(!Array.isArray(value)||value.length>30)fail('Invalid progress history.');
  return value.map(item=>{
    keys(item,['when','action'],'progress history');
    return {when:timestamp(item.when,'progress history date',{empty:false}),action:bounded(item.action,240,'progress history action',{required:true})};
  });
}
function record(value,wing,strict){
  if(!object(value))fail(`Invalid ${wing.toUpperCase()} task record.`);
  const fields=wing==='vet'?VET_RECORD_FIELDS:TAS_RECORD_FIELDS;
  if(strict)keys(value,fields,'task record');
  const result=pick(value,fields);
  for(const [key,item] of Object.entries(result)){
    if(key==='status')enumValue(item,wing==='vet'?STATUS:STATUS.filter(status=>!['performed','recorded'].includes(status)),'task status');
    else if(['sourceChecked','doneWhenConfirmed','independentVerifierConfirmed','dependencyExceptionConfirmed','doneConfirmed'].includes(key))boolean(item,key);
    else if(['steps','milestones','stepChecks'].includes(key))result[key]=checks(item);
    else if(key==='history')result[key]=history(item);
    else if(['sourceCheckedAt','updatedAt'].includes(key))timestamp(item,key);
    else if(['reviewDate','escalationDate'].includes(key))date(item,key);
    else if(key==='handoffState')enumValue(item,['none','sent','accepted','returned','verified'],'handover stage');
    // TAS forms historically allowed longer notes than their reload sanitiser.
    // Preserve those saved notes without inventing or truncating their content.
    else bounded(item,({evidenceRef:200000,verifier:2000,exceptionSummary:200000,exceptionReason:200000,waitingForRole:120,handoffTo:120})[key],key);
  }
  return result;
}
function vetData(value,{strict=false}={}){
  if(!object(value)||value.schemaVersion!==3)fail('This VET backup format is not supported. Nothing has been replaced.');
  if(strict)keys(value,['schemaVersion',...VET_FIELDS],'VET handover');
  if(strict&&VET_FIELDS.some(key=>!own(value,key)))fail('The VET handover is incomplete.');
  const records=map(field(value,'records',{}),item=>record(item,'vet',strict),'VET records');
  const assignments=map(field(value,'assignments',{}),role=>enumValue(role,WORK_ROLES,'assigned role'),'VET assignments');
  const gaps=map(field(value,'gaps',{}),raw=>{
    const item=typeof raw==='string'&&!strict?{status:raw}:raw;
    if(!object(item))fail('Invalid VET gap.');
    const fields=['status','reference','verifier','sourceChecked','updatedAt'];
    if(strict)keys(item,fields,'VET gap');
    const result=pick(item,fields);
    for(const [key,val] of Object.entries(result)){
      if(key==='status')enumValue(val,['unconfirmed','in-progress','resolved'],'gap status');
      else if(key==='sourceChecked')boolean(val,'gap source check');
      else if(key==='updatedAt')timestamp(val,'gap update');
      else bounded(val,key==='verifier'?2000:200000,`gap ${key}`);
    }
    return result;
  },'VET gaps');
  const events=field(value,'eventOccurrences',[]);
  if(!Array.isArray(events)||events.length>100)fail('Invalid VET event occurrences.');
  const eventOccurrences=events.map(item=>{
    if(!object(item))fail('Invalid VET event occurrence.');
    const fields=['id','templateId','workflowId','createdAt','term'];
    if(strict)keys(item,fields,'VET event occurrence');
    const result=pick(item,fields);
    identity(result.id,180);identity(result.templateId,120);identity(result.workflowId,80);
    if(!/^2027-event-[a-z0-9-]+-[a-z0-9]+$/i.test(result.id)||!Number.isInteger(result.term)||result.term<1||result.term>4)fail('Invalid VET event occurrence.');
    timestamp(result.createdAt,'event start',{empty:false});return result;
  });
  if(new Set(eventOccurrences.map(item=>item.id)).size!==eventOccurrences.length)fail('Duplicate VET event occurrence.');
  return {schemaVersion:3,records,assignments,gaps,eventOccurrences};
}
function tasData(value,{strict=false}={}){
  if(!object(value)||value.schemaVersion!==2)fail('This TAS backup format is not supported. Nothing has been replaced.');
  if(strict)keys(value,['schemaVersion',...TAS_FIELDS],'TAS handover');
  if(strict&&TAS_FIELDS.some(key=>!own(value,key)))fail('The TAS handover is incomplete.');
  const records=map(field(value,'records',{}),item=>record(item,'tas',strict),'TAS records');
  const weekly=map(field(value,'weekly',{}),(item,key)=>{if(!key||!validDate(key))fail('Invalid weekly review date.');return checks(item);},'weekly reviews');
  const eventOccurrences=map(field(value,'eventOccurrences',{}),token=>{
    if(typeof token!=='string'||!/^event-[a-z0-9-]{1,100}$/i.test(token))fail('Invalid TAS event occurrence.');return token;
  },'TAS event occurrences');
  const scheduleOverrides=map(field(value,'scheduleOverrides',{}),item=>{
    const fields=['dueDate','milestones','confirmed','sourceNote','updatedAt'];
    if(!object(item))fail('Invalid TAS planning dates.');
    if(strict)keys(item,fields,'TAS planning dates');
    const result=pick(item,fields);
    if(!date(result.dueDate,'planning due date'))fail('Invalid planning due date.');
    if(!Array.isArray(result.milestones)||result.milestones.length>100)fail('Invalid planning milestones.');
    result.milestones.forEach((item,index)=>{
      if(!date(item,'milestone date')||item.slice(0,4)!==result.dueDate.slice(0,4)||(index&&item<result.milestones[index-1]))fail('Invalid planning milestone date.');
    });
    if(result.milestones.length&&result.dueDate!==result.milestones[0])fail('Planning due date must match its first milestone.');
    if(own(result,'confirmed'))boolean(result.confirmed,'planning confirmation');
    if(own(result,'sourceNote'))bounded(result.sourceNote,240,'planning source note');
    if(result.confirmed&&!result.sourceNote?.trim())fail('Confirmed planning dates need their saved source note.');
    if(own(result,'updatedAt'))timestamp(result.updatedAt,'planning update');
    return result;
  },'TAS planning dates');
  return {schemaVersion:2,records,weekly,eventOccurrences,scheduleOverrides};
}
function reviewData(value,{strict=false}={}){
  if(!object(value)||value.version!==1)fail('This completion-tick format is not supported. Nothing has been replaced.');
  if(strict)keys(value,['version','records'],'review handover');
  if(strict&&!own(value,'records'))fail('The review handover is incomplete.');
  return {version:1,records:map(field(value,'records',{}),(item,key)=>{
    if(!/^(vet|tas):\d{4}:.+$/.test(key))fail('Invalid review task identity.');
    keys(item,['completed','reviewedOn','completedEarly'],'review record');
    boolean(item.completed,'review tick');
    if(own(item,'completedEarly'))boolean(item.completedEarly,'early completion');
    if(!date(item.reviewedOn,'review date'))fail('Missing review date.');
    return {...item};
  },'task reviews')};
}
function parseSaved(raw,fallback,label){
  if(raw===null)return clone(fallback);
  if(typeof raw!=='string'||raw.length>MAX_SIZE)fail(`Invalid saved ${label}.`);
  let value;try{value=JSON.parse(raw);}catch{fail(`Saved ${label} could not be read. Nothing has been replaced.`);}
  if(!object(value))fail(`Invalid saved ${label}.`);return value;
}
export function isTeamItem(item){
  return !!(object(item)&&item.origin&&validWorkOrigin(item.origin)&&item.workstream===item.origin.wing&&item.personal===false&&typeof item.taskKey==='string'&&item.taskKey.startsWith(`workboard:${item.origin.wing}:`));
}
function originIdentity(item){return item.origin&&validWorkOrigin(item.origin)?`${item.origin.wing}:${item.origin.recordKey}`:null;}
function portableItem(item){
  const result=pick(item,TEAM_ITEM_FIELDS);
  result.origin=pick(item.origin,['wing','taskId','recordKey','route','cycle']);
  result.dirty=item.dirty.filter(key=>TEAM_DIRTY_FIELDS.includes(key));
  result.dependsOn=item.dependsOn.filter(key=>/^workboard:(vet|tas):.+/.test(key));
  if(result.forecast)result.forecast=pick(result.forecast,FORECAST_FIELDS);
  if(result.taskHelp)result.taskHelp.links=[];
  return result;
}
function portableInbox(raw){
  const inbox=validateInbox(raw),items=inbox.items.filter(isTeamItem).map(portableItem);
  if(new Set(items.map(originIdentity)).size!==items.length)fail('The shared list has duplicate tasks. Check the duplicates before saving the backup.');
  return {version:2,items,workboardImports:mergeWorkboardImports(inbox.workboardImports)};
}
function validatePortableInbox(value){
  keys(value,['version','items','workboardImports'],'team task list');
  if(value.version!==2||!Array.isArray(value.items)||value.items.length>300||!Array.isArray(value.workboardImports))fail('Invalid team task list.');
  value.items.forEach(item=>{
    keys(item,TEAM_ITEM_FIELDS,'team task');
    if(TEAM_ITEM_FIELDS.some(key=>!own(item,key))||!isTeamItem(item))fail('Only complete origin-linked VET or TAS tasks can enter the team file.');
    keys(item.origin,['wing','taskId','recordKey','route','cycle'],'task origin');
    if(item.forecast)keys(item.forecast,FORECAST_FIELDS,'team forecast');
    if(!Array.isArray(item.dirty)||item.dirty.some(key=>!TEAM_DIRTY_FIELDS.includes(key))||!Array.isArray(item.dependsOn)||item.dependsOn.some(key=>!/^workboard:(vet|tas):.+/.test(key))||item.taskHelp?.links?.length)fail('Private task fields are not allowed in a team handover.');
  });
  const checked=validateInbox(JSON.stringify({...value,items:value.items.map((item,index)=>({...item,id:`handover-${index}`}))}));
  if(new Set(checked.items.map(originIdentity)).size!==checked.items.length)fail('The shared list has duplicate tasks.');
  return {version:2,items:checked.items.map(portableItem),workboardImports:mergeWorkboardImports(value.workboardImports)};
}
function validateData(value){
  keys(value,['vet','tas','review','inbox'],'team snapshot');
  return {vet:vetData(value.vet,{strict:true}),tas:tasData(value.tas,{strict:true}),review:reviewData(value.review,{strict:true}),inbox:validatePortableInbox(value.inbox)};
}
export function readRaw(storage){return Object.fromEntries(DATA_KEYS.map(key=>[key,storage.getItem(key)]));}
export function snapshot(storageOrRaw){
  const raw=typeof storageOrRaw?.getItem==='function'?readRaw(storageOrRaw):storageOrRaw;
  if(!object(raw)||DATA_KEYS.some(key=>!own(raw,key)))fail('The saved team snapshot is incomplete.');
  return {
    vet:vetData(parseSaved(raw[KEYS.vet],{schemaVersion:3},'VET progress')),
    tas:tasData(parseSaved(raw[KEYS.tas],{schemaVersion:2},'TAS progress')),
    review:reviewData(parseSaved(raw[KEYS.review],{version:1},'task reviews')),
    inbox:portableInbox(raw[KEYS.inbox])
  };
}
export function scopeSnapshot(data,scope){
  if(!scope)return clone(data);
  if(!['vet','tas'].includes(scope))fail('Unrecognised backup area.');
  const result=clone(data),other=scope==='vet'?'tas':'vet';
  result[other]=snapshot({getItem:()=>null})[other];
  result.review.records=Object.fromEntries(Object.entries(result.review.records).filter(([key])=>key.startsWith(`${scope}:`)));
  result.inbox.items=result.inbox.items.filter(item=>item.origin.wing===scope);
  result.inbox.workboardImports=result.inbox.workboardImports.filter(key=>key.startsWith(`${scope}:`));
  return result;
}
const META_FIELDS=['scope','kind','schemaVersion','workspaceId','revision','parentRevision','parentExportId','exportId','savedAt','savedBy','note','changes','data'];
function metadata(value){
  if(!object(value)||value.kind!=='WWHS-TEAM-HANDOVER'||value.schemaVersion!==1)fail('This is not a supported WWHS team handover file.');
  keys(value,META_FIELDS,'team handover');if(own(value,'scope')&&!['vet','tas'].includes(value.scope))fail('Unrecognised backup area.');identity(value.workspaceId,150);identity(value.exportId,150);
  if(!Number.isSafeInteger(value.revision)||value.revision<1)fail('Invalid team file revision.');
  if(value.revision===1){
    if(value.parentRevision!==null||value.parentExportId!==null)fail('The first backup has an unexpected earlier-version link.');
  }else if(!Number.isSafeInteger(value.parentRevision)||value.parentRevision!==value.revision-1||typeof value.parentExportId!=='string')fail('Invalid parent revision.');
  if(value.parentExportId!==null){identity(value.parentExportId,150);if(value.parentExportId===value.exportId)fail('The backup incorrectly lists itself as its earlier version.');}
  timestamp(value.savedAt,'team file save time',{empty:false});bounded(value.savedBy,100,'editor name',{required:true});bounded(value.note,2000,'handover note');
  if(!Array.isArray(value.changes)||value.changes.length>2000)fail('Invalid changed-task summary.');
  value.changes.forEach(item=>bounded(item,500,'changed-task summary',{required:true}));
}
export function parseBackup(input){
  let value=input;
  if(typeof input==='string'){
    if(input.length>MAX_SIZE)fail('The team file is too large.');
    try{value=JSON.parse(input);}catch{fail('The team file is not valid JSON.');}
  }else{
    try{if(JSON.stringify(value).length>MAX_SIZE)fail('The team file is too large.');value=clone(value);}catch{fail('The team file could not be read.');}
  }
  metadata(value);const data=validateData(value.data);
  if(value.scope&&JSON.stringify(data)!==JSON.stringify(scopeSnapshot(data,value.scope)))fail('This area backup contains records from another area. Nothing has changed.');
  return {...value,data};
}
export function createBackup({snapshot:data,previous=null,editor,note='',workspaceId,exportId=globalThis.crypto.randomUUID(),savedAt=new Date().toISOString(),changes=[],scope=previous?.scope}){
  if(previous&&(!Number.isSafeInteger(previous.revision)||previous.revision<1||!previous.exportId||!previous.workspaceId))fail('Invalid previous team file.');
  if(previous&&workspaceId&&workspaceId!==previous.workspaceId)fail('The next backup must belong to the same shared work.');
  return parseBackup({...(scope?{scope}:{}),kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,workspaceId:previous?.workspaceId||workspaceId||globalThis.crypto.randomUUID(),
    revision:previous?previous.revision+1:1,parentRevision:previous?.revision??null,parentExportId:previous?.exportId??null,
    exportId,savedAt,savedBy:editor,note,changes,data:scopeSnapshot(data,scope)});
}
export function checkRevision(input,lastFile,{firstConnection=false}={}){
  const payload=parseBackup(input);
  if(!lastFile){if(!firstConnection)fail('Choose the first team connection explicitly before importing.');return {same:false,firstConnection:true};}
  if(!object(lastFile)||!Number.isSafeInteger(lastFile.revision)||lastFile.revision<1||typeof lastFile.workspaceId!=='string'||typeof lastFile.exportId!=='string')fail('The saved team connection is invalid.');
  if(payload.workspaceId!==lastFile.workspaceId)fail('This file belongs to a different team workspace.');
  if(payload.revision<lastFile.revision)fail('This team file is older than the revision already opened here.');
  if(payload.revision===lastFile.revision){
    if(payload.exportId!==lastFile.exportId)fail('Two copies have the same version number but different changes. Agree with your colleague which file to use.');
    return {same:true,firstConnection:false};
  }
  if(payload.revision===lastFile.revision+1&&payload.parentExportId!==lastFile.exportId)fail('This version was made from a different backup. Agree with your colleague which file to use first.');
  // A single-parent file cannot prove the ancestry of skipped revisions.
  // The manual file selection remains necessary; no concurrent snapshots merge.
  return {same:false,firstConnection:false};
}
function reconcileInbox(raw,incoming,createId,scope){
  const checked=validateInbox(raw),saved=raw===null?{version:2,items:[],importedAt:null,briefing:''}:JSON.parse(raw);
  const oldById=new Map(saved.items.map(item=>[item.id,item])),team=new Map(),privateItems=[];
  for(const item of checked.items){
    if(isTeamItem(item)){
      const key=originIdentity(item);if(team.has(key))fail('The shared list on this browser has duplicate tasks.');team.set(key,item);
    }else privateItems.push(item);
  }
  const incomingByIdentity=new Map(incoming.items.map(item=>[originIdentity(item),item]));
  const aliases=new Map(incoming.items.map(item=>[item.taskKey,team.get(originIdentity(item))?.taskKey||item.taskKey]));
  for(const item of privateItems){
    if(incomingByIdentity.has(originIdentity(item))||incoming.items.some(next=>next.taskKey===item.taskKey))fail('A shared task matches a private task here. Keep the private task and check which area it belongs to before opening this backup.');
  }
  const items=[],usedIds=new Set(checked.items.map(item=>item.id));let added=0,updated=0,removed=0;
  for(const existing of checked.items){
    const original=oldById.get(existing.id);
    if(!isTeamItem(existing)||scope&&existing.origin.wing!==scope){items.push(original);continue;}
    const key=originIdentity(existing),incomingItem=incomingByIdentity.get(key);
    if(!incomingItem){removed++;continue;}
    const next={...original,...clone(incomingItem),id:existing.id,taskKey:existing.taskKey};
    next.dependsOn=[...new Set([...existing.dependsOn.filter(key=>!/^workboard:(vet|tas):.+/.test(key)),...incomingItem.dependsOn.map(key=>aliases.get(key)||key)])];
    if(next.taskHelp&&existing.taskHelp)next.taskHelp={...next.taskHelp,links:clone(existing.taskHelp.links)};
    // Rich HTML belongs to this browser. Do not let it hide an imported plain note.
    if(existing.noteText!==incomingItem.noteText)next.noteHtml='';
    next.dirty=[...new Set([...existing.dirty.filter(name=>!TEAM_DIRTY_FIELDS.includes(name)),...incomingItem.dirty])];
    if(JSON.stringify(portableItem(existing))!==JSON.stringify(incomingItem))updated++;
    items.push(next);incomingByIdentity.delete(key);
  }
  for(const item of incomingByIdentity.values()){
    const id=createId();identity(id,150);
    if(usedIds.has(id))fail('A new task could not be given a unique reference. Try opening the backup again.');usedIds.add(id);
    items.push({...clone(item),id,dependsOn:item.dependsOn.map(key=>aliases.get(key)||key)});added++;
  }
  const workboardImports=mergeWorkboardImports(checked.workboardImports,incoming.workboardImports);
  const result={...saved,version:2,items,workboardImports};
  validateInbox(JSON.stringify(result));
  return {raw:JSON.stringify(result),counts:{added,updated,removed,privateKept:privateItems.length}};
}
export function buildImportPlan(storage,input,{lastFile=null,firstConnection=false,createId=()=>globalThis.crypto.randomUUID(),scope=null}={}){
  const payload=parseBackup(input);
  if(scope&&payload.scope&&scope!==payload.scope)fail(`This is a ${payload.scope.toUpperCase()} backup. Open it in that area; nothing has changed.`);
  scope=scope||payload.scope||null;
  const data=scopeSnapshot(payload.data,scope),gate=checkRevision(payload,lastFile,{firstConnection}),before=readRaw(storage),beforeSnapshot=snapshot(before);
  const vet=parseSaved(before[KEYS.vet],{schemaVersion:3},'VET progress'),tas=parseSaved(before[KEYS.tas],{schemaVersion:2},'TAS progress');
  const inbox=reconcileInbox(before[KEYS.inbox],data.inbox,createId,scope);
  const reviews=scope?{version:1,records:{...Object.fromEntries(Object.entries(beforeSnapshot.review.records).filter(([key])=>!key.startsWith(`${scope}:`))),...data.review.records}}:data.review;
  const after={
    [KEYS.vet]:scope==='tas'?before[KEYS.vet]:JSON.stringify({...vet,...data.vet}),
    [KEYS.tas]:scope==='vet'?before[KEYS.tas]:JSON.stringify({...tas,...data.tas}),
    [KEYS.review]:JSON.stringify(reviews),
    [KEYS.inbox]:inbox.raw
  };
  return {before,after,beforeSnapshot,counts:inbox.counts,payload,same:gate.same};
}

function storageValue(value){return value===null||typeof value==='string'&&value.length<=MAX_SIZE;}
function transactionMaps(before,after){
  if(!object(before)||!object(after)||!Object.keys(after).length||Object.keys(before).length!==Object.keys(after).length||Object.keys(after).some(key=>!WRITABLE_KEYS.includes(key)||!own(before,key)||!storageValue(before[key])||!storageValue(after[key])))fail('Invalid team storage transaction.');
}
function writeValue(storage,key,value){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}
function assertCurrent(storage,expected){
  for(const [key,value] of Object.entries(expected))if(storage.getItem(key)!==value)fail('Saved progress changed in another tab. Reload and reopen the latest team file before continuing.');
}
function readJournal(storage){
  const raw=storage.getItem(KEYS.journal);if(raw===null)return null;
  let value;try{value=JSON.parse(raw);}catch{fail('The interrupted backup record could not be read. Keep your browser data for recovery.');}
  keys(value,['version','transactionId','phase','before','after'],'team import recovery');
  if(value.version!==1||!['prepared','committed'].includes(value.phase))fail('Unrecognised team import recovery journal.');
  identity(value.transactionId,150);transactionMaps(value.before,value.after);return {raw,value};
}
function assertJournalOwner(storage,journal){
  const current=readJournal(storage);
  if(!current||current.value.transactionId!==journal.transactionId)fail('Another tab changed the recovery record. Its work has not been replaced.');
}
function rollback(storage,journal){
  assertJournalOwner(storage,journal);
  for(const key of Object.keys(journal.before)){
    const current=storage.getItem(key);
    if(current!==journal.before[key]&&current!==journal.after[key])fail('Progress changed during recovery. The recovery copy is kept, and the newer work was not replaced.');
  }
  for(const [key,value] of Object.entries(journal.before)){
    assertJournalOwner(storage,journal);
    const current=storage.getItem(key);
    if(current!==value&&current!==journal.after[key])fail('Saved progress changed during recovery. Its new value has been protected.');
    if(current!==value)writeValue(storage,key,value);
  }
  assertCurrent(storage,journal.before);assertJournalOwner(storage,journal);storage.removeItem(KEYS.journal);
}
export function recoverTransaction(storage){
  const journal=readJournal(storage);if(!journal)return {status:'none'};
  if(journal.value.phase==='committed'){
    assertCurrent(storage,journal.value.after);assertJournalOwner(storage,journal.value);
    storage.removeItem(KEYS.journal);return {status:'committed'};
  }
  rollback(storage,journal.value);return {status:'rolled-back'};
}
export function atomicApply(storage,before,after,{transactionId=globalThis.crypto.randomUUID()}={}){
  transactionMaps(before,after);identity(transactionId,150);
  if(storage.getItem(KEYS.journal)!==null)fail('An unfinished team import needs recovery before another change.');
  assertCurrent(storage,before);
  const journal={version:1,transactionId,phase:'prepared',before:clone(before),after:clone(after)},prepared=JSON.stringify(journal);
  // Persist the rollback copy before touching any data, including team metadata.
  storage.setItem(KEYS.journal,prepared);
  try{
    if(storage.getItem(KEYS.journal)!==prepared)fail('The team import recovery copy could not be verified.');
    assertCurrent(storage,before);
    const expected={...before};
    for(const [key,value] of Object.entries(after)){
      if(storage.getItem(KEYS.journal)!==prepared)fail('Another tab changed the recovery record.');
      assertCurrent(storage,expected);
      if(value!==before[key])writeValue(storage,key,value);
      expected[key]=value;
    }
    assertCurrent(storage,after);
    if(storage.getItem(KEYS.journal)!==prepared)fail('Another tab changed the recovery record.');
    storage.setItem(KEYS.journal,JSON.stringify({...journal,phase:'committed'}));
  }catch(error){
    let recoveryError;
    try{rollback(storage,journal);}catch(failure){recoveryError=failure;}
    const failure=new Error(recoveryError?'The import did not finish and recovery is required. Its saved recovery copy has been kept.':`The import was cancelled and previous progress restored. ${error.message}`);
    failure.cause=error;failure.recoveryRequired=!!recoveryError;throw failure;
  }
  try{assertJournalOwner(storage,journal);storage.removeItem(KEYS.journal);return {committed:true,cleanupPending:false};}
  catch{return {committed:true,cleanupPending:true};}
}
