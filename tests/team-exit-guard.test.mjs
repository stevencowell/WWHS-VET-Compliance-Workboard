import test from 'node:test';
import assert from 'node:assert/strict';
import {enrich} from '../morning-launchpad/assets/summary-core.mjs';
import {KEYS,DATA_KEYS,snapshot} from '../assets/js/team-handover-core.mjs';
import {hasProgressChanges,isWorkboardDestination,installTeamExitGuard,acknowledgeSafetyBackup,SAFETY_RECEIPT_KEY} from '../assets/js/team-exit-guard.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
function forecast(extra={}){
  return {version:1,managed:true,active:true,section:'ready',kind:'scheduled',reason:'Scheduled work',
    scheduledDate:'2026-09-21',windowStart:null,windowEnd:null,period:'Term 3',sourceStatus:'review',
    blocked:false,blockerReason:'',asOf:'2026-09-18',role:'htvet',roleLabel:'Head Teacher VET',
    year:'2026',sourceYear:'2026',horizonDays:21,...extra};
}
function card(key='task',extra={}){
  return enrich({id:`local-${key}`,taskKey:`workboard:vet:${key}`,title:`Task ${key}`,action:'Review the task',
    origin:{wing:'vet',taskId:key,recordKey:key,route:`#task/${key}`,cycle:'2026'},
    workstream:'vet',createdOn:'2026-09-18',...extra});
}
function stores(items=[card()],workboardImports=['vet:task']){
  return {
    [KEYS.vet]:{schemaVersion:3,role:'htvet',guidance:true,links:{private:'https://private.example/vet'},
      records:{task:{status:'in-progress',evidenceRef:'Reference one',stepChecks:{0:true}}},
      assignments:{task:'Head Teacher VET'},gaps:{gap:{status:'in-progress',reference:'Reference two'}},eventOccurrences:[]},
    [KEYS.tas]:{schemaVersion:2,mode:'guided',links:{private:'https://private.example/tas'},
      records:{task:{status:'in-progress',steps:{0:true},exceptionReason:'Waiting for reply'}},
      weekly:{'2026-09-14':{0:true}},eventOccurrences:{},scheduleOverrides:{}},
    [KEYS.review]:{version:1,records:{'vet:2026:task':{completed:true,reviewedOn:'2026-09-18'}}},
    [KEYS.inbox]:{version:2,items,workboardImports,briefing:'PRIVATE BRIEFING'}
  };
}
function project(values){return snapshot({getItem:key=>values[key]===undefined?null:JSON.stringify(values[key])});}
function fixture(items,imports){return project(stores(items,imports));}

test('unchanged shared progress and object/card ordering stay quiet',()=>{
  const before=fixture([card('one'),card('two')],['vet:one','vet:two']);
  assert.equal(hasProgressChanges(before,copy(before)),false);
  const after=copy(before);
  after.inbox.items.reverse();after.inbox.workboardImports.reverse();
  after.vet.records.task=Object.fromEntries(Object.entries(after.vet.records.task).reverse());
  assert.equal(hasProgressChanges(before,after),false);
  assert.deepEqual(before,fixture([card('one'),card('two')],['vet:one','vet:two']),'comparison does not mutate either snapshot');
});

test('native VET/TAS records, assignments, gaps, weekly checks and reviews warn; restoring them clears the warning',()=>{
  const before=fixture();
  const changes=[
    data=>data.vet.records.task.evidenceRef='A new reference',
    data=>data.vet.records.task.stepChecks[0]=false,
    data=>data.vet.assignments.task='VET Coordinator',
    data=>data.vet.gaps.gap.reference='Gap evidence added',
    data=>data.tas.records.task.exceptionReason='Reply received',
    data=>data.tas.weekly['2026-09-14'][0]=false,
    data=>data.review.records['vet:2026:task'].completed=false
  ];
  for(const change of changes){const after=copy(before);change(after);assert.equal(hasProgressChanges(before,after),true);}
  assert.equal(hasProgressChanges(before,copy(before)),false);
});

test('plain shared notes and meaningful card fields warn',()=>{
  const before=fixture();
  const changes=[{noteText:'A saved working note'},{action:'Contact the verifier'},{owner:'Team coordinator'},
    {status:'done',progressOverride:true},{group:'waiting'},{dependsOn:['workboard:tas:prerequisite']}];
  for(const fields of changes){
    const after=copy(before);Object.assign(after.inbox.items[0],fields);
    assert.equal(hasProgressChanges(before,after),true,JSON.stringify(fields));
  }
});

test('untouched forecast-generated additions and their import history stay quiet',()=>{
  const before=fixture([],[]),after=fixture([card('automatic',{forecast:forecast()})],['vet:automatic']);
  assert.equal(hasProgressChanges(before,after),false);
});

test('generated review sign-off text is already shared, but a later staff note is a change',()=>{
  const before=fixture([],[]),after=copy(before);
  after.inbox=fixture([card('task',{status:'done',noteText:'Reviewed complete for 2026 on 2026-09-18. Generated overall sign-off.'})]).inbox;
  assert.equal(hasProgressChanges(before,after),false);
  after.inbox.items[0].noteText+=' Staff follow-up.';after.inbox.items[0].dirty=['noteText'];
  assert.equal(hasProgressChanges(before,after),true);
});

test('forecast metadata and source-owned fields can refresh without a staff edit',()=>{
  const before=fixture([card('task',{forecast:forecast()})]);
  const after=copy(before),item=after.inbox.items[0];
  item.forecast={...item.forecast,asOf:'2026-09-19',active:false,role:'coordinator',section:'upcoming'};
  Object.assign(item,{title:'Updated source title',action:'Updated source action',dueDate:'2026-09-24',
    waitingOn:'Source prerequisite',reason:'Updated automatic explanation',score:30,createdOn:'2026-09-19'});
  assert.equal(hasProgressChanges(before,after),false);
});

test('saved edits to a generated card warn, while reverting the value clears incidental edit markers',()=>{
  const before=fixture([card('task',{forecast:forecast()})]),after=copy(before),item=after.inbox.items[0];
  item.action='A staff-written next step';item.dirty=['action'];item.lastActionOn='2026-09-19';
  assert.equal(hasProgressChanges(before,after),true);
  item.action=before.inbox.items[0].action;
  assert.equal(hasProgressChanges(before,after),false);
  item.noteText='A shared note';item.dirty.push('noteText');
  assert.equal(hasProgressChanges(before,after),true);
});

test('removing a baseline card warns even when it was an untouched forecast card',()=>{
  for(const extra of [{},{forecast:forecast()}]){
    const before=fixture([card('task',extra)]),after=copy(before);after.inbox.items=[];
    assert.equal(hasProgressChanges(before,after),true);
  }
});

test('deleting a newly generated card is detected through its new suppression entry',()=>{
  const before=fixture([],[]),after=copy(before);after.inbox.workboardImports=['vet:generated-then-deleted'];
  assert.equal(hasProgressChanges(before,after),true);
  assert.equal(hasProgressChanges(after,copy(after)),false,'pre-existing deletion is already handed over');
});

test('personal mail, private links, pins and native preferences do not create shared changes',()=>{
  const saved=stores([card(),enrich({id:'email',taskKey:'email:private',title:'Private email',action:'Private reply',workstream:'personal'})]);
  const before=project(saved),next=copy(saved);
  Object.assign(next[KEYS.vet],{role:'coordinator',guidance:false,links:{private:'https://private.example/new'}});
  next[KEYS.tas].mode='expert';next[KEYS.inbox].briefing='A different private briefing';
  Object.assign(next[KEYS.inbox].items[0],{source:'PRIVATE MAIL',url:'https://private.example/source',noteHtml:'<p>Private formatting only</p>',pinnedDate:'2026-09-19'});
  next[KEYS.inbox].items[1].noteText='Private reply notes';
  assert.equal(hasProgressChanges(before,project(next)),false);
});

test('the actual pin-only update markers do not warn, but changing shared status does',()=>{
  const saved=stores([card('task',{forecast:forecast()})]),before=project(saved),next=copy(saved);
  Object.assign(next[KEYS.inbox].items[0],{pinnedDate:'2026-09-19',status:'review',sectionOverride:'',
    progressOverride:true,lastActionOn:'2026-09-19',dirty:['pinnedDate','sectionOverride']});
  assert.equal(hasProgressChanges(before,project(next)),false);
  next[KEYS.inbox].items[0].status='done';
  assert.equal(hasProgressChanges(before,project(next)),true);
});

test('moving an existing shared card into personal is a shared removal',()=>{
  const saved=stores(),before=project(saved);saved[KEYS.inbox].items[0].workstream='personal';
  assert.equal(hasProgressChanges(before,project(saved)),true);
});

test('only exact same-repository workboard destinations are eligible for navigation exemption',()=>{
  const base='https://stevencowell.github.io/WWHS-VET-Compliance-Workboard/';
  const allowed=['','index.html','head-teacher-tas/','head-teacher-tas/index.html',
    'morning-launchpad/','morning-launchpad/index.html','team-handover/','team-handover/index.html'];
  for(const path of allowed){
    assert.equal(isWorkboardDestination(new URL(path,base).href,base),true,path);
    assert.equal(isWorkboardDestination(`${path}?wing=tas#start-section`,base),true,path+' query/hash');
  }
  for(const href of ['https://other.example/WWHS-VET-Compliance-Workboard/',
    'http://stevencowell.github.io/WWHS-VET-Compliance-Workboard/',
    'https://stevencowell.github.io/another-repository/team-handover/',
    '../Finance/', 'task-sources/','head-teacher-tas/task/','team-handover-extra/',
    'team-handover/file.json','assets/js/team-exit-guard.mjs','javascript:void(0)','mailto:someone@example.com']){
    assert.equal(isWorkboardDestination(href,base),false,href);
  }
});

test('preview root destinations obey the same exact-path and origin rules',()=>{
  const base='http://127.0.0.1:43175/';
  for(const path of ['/','#vet-home','head-teacher-tas/','morning-launchpad/','team-handover/?wing=tas'])assert.equal(isWorkboardDestination(path,base),true,path);
  assert.equal(isWorkboardDestination('http://127.0.0.1:43176/team-handover/',base),false);
  assert.equal(isWorkboardDestination('http://localhost:43175/team-handover/',base),false);
});

test('automatically recreated cards with already-shared native notes or completion stay quiet',()=>{
  for(const wing of ['vet','tas'])for(const closed of [false,true]){
    const saved=stores([],[]),record=saved[KEYS[wing]].records.task;
    record[wing==='vet'?'exceptionSummary':'exceptionReason']='Already shared source note';
    if(closed)record.status='completed';
    const before=project(saved),after=copy(before);
    const item=card('task',{taskKey:`workboard:${wing}:task`,workstream:wing,
      origin:{wing,taskId:'task',recordKey:'task',route:'#task/task',cycle:'2026'},
      noteText:'Already shared source note',status:closed?'done':'review',forecast:closed?null:forecast()});
    const generated=stores([item],[`${wing}:task`]);after.inbox=project(generated).inbox;
    assert.equal(hasProgressChanges(before,after),false,`${wing} closed=${closed}`);
    after.inbox.items[0].noteText+=' plus new staff work';after.inbox.items[0].dirty=['noteText'];
    assert.equal(hasProgressChanges(before,after),true);
  }
});

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function session(baseline,id='session-one'){
  return {version:1,lastFile:{workspaceId:'team',revision:1},active:{id,phase:'editing',baselineData:baseline}};
}
function harness(meta,hydrate=async value=>copy(value)){
  const saved=stores(),values=new Map(Object.entries(saved).map(([key,value])=>[key,JSON.stringify(value)]));
  if(meta)values.set(KEYS.metadata,JSON.stringify(meta));
  const storage={writes:0,getItem:key=>values.get(key)??null,setItem(key,value){this.writes++;values.set(key,value);},removeItem(key){this.writes++;values.delete(key);}};
  const win=new EventTarget(),doc=new EventTarget();
  win.location={href:'https://example.test/workboard/#vet-home'};doc.hidden=false;
  const guard=installTeamExitGuard(win,doc,storage,{hydrate});
  const unload=()=>{const event=new Event('beforeunload',{cancelable:true});Object.defineProperty(event,'returnValue',{value:undefined,writable:true});win.dispatchEvent(event);return event.defaultPrevented;};
  return {guard,win,doc,storage,values,unload,setMeta:value=>values.set(KEYS.metadata,JSON.stringify(value))};
}

test('guard changes state after saved edits, checks pending exports synchronously, and clears after confirmation without writes',async()=>{
  const baseline=fixture(),h=harness(session(baseline));await settle();
  assert.equal(h.guard.status(),'clean');assert.equal(h.unload(),false);
  const edited=JSON.parse(h.values.get(KEYS.vet));edited.records.task.evidenceRef='New evidence';h.values.set(KEYS.vet,JSON.stringify(edited));
  assert.equal(h.unload(),true,'final synchronous inspection catches changes before a save event');
  await h.guard.refresh();assert.equal(h.guard.status(),'changed');
  h.values.set(KEYS.vet,JSON.stringify(stores()[KEYS.vet]));await h.guard.refresh();assert.equal(h.guard.status(),'clean');
  h.setMeta({...session(baseline),pendingExport:{exportId:'pending'}});
  assert.equal(h.unload(),true,'pending export is detected without waiting for hydration');
  await h.guard.refresh();assert.equal(h.guard.status(),'upload');
  h.setMeta({version:1,lastFile:{workspaceId:'team',revision:2},active:null,pendingExport:null});await h.guard.refresh();
  assert.equal(h.guard.status(),'idle');assert.equal(h.unload(),false);assert.equal(h.storage.writes,0);
});

test('a missing baseline stays visibly uncertain and still warns',async()=>{
  const h=harness(session(fixture()),async()=>{throw new Error('Missing IndexedDB payload');});await settle();
  assert.equal(h.guard.status(),'check');assert.equal(h.unload(),true);assert.equal(h.storage.writes,0);
});

test('a late baseline cannot replace the baseline for a newer session',async()=>{
  const pending=[],baseline=fixture(),h=harness(session(baseline),value=>new Promise(resolve=>pending.push({value,resolve})));
  assert.equal(h.guard.status(),'checking');assert.equal(h.unload(),true);
  h.setMeta(session(baseline,'session-two'));const second=h.guard.refresh();
  assert.equal(pending.length,2);pending[1].resolve(copy(pending[1].value));await second;
  assert.equal(h.guard.status(),'clean');
  const stale=copy(pending[0].value);stale.active.baselineData.vet.records.task.evidenceRef='Unrelated old baseline';
  pending[0].resolve(stale);await settle();
  assert.equal(h.guard.status(),'clean');assert.equal(h.unload(),false);assert.equal(h.storage.writes,0);
});

const launchpadJournal='morning-launchpad-restore:v1';
const capture=h=>({before:Object.fromEntries([...DATA_KEYS,KEYS.metadata].map(key=>[key,h.storage.getItem(key)])),
  journals:[h.storage.getItem(KEYS.journal),h.storage.getItem(launchpadJournal)]});
const missingHistory=()=>harness(session(fixture()),async()=>{throw Error('Missing history');});

test('a confirmed current safety file clears only the close warning, preserving damaged handover history and plaintext privacy',async()=>{
  const h=missingHistory();await h.guard.refresh();const before=capture(h);
  assert.equal(h.unload(),true);assert.equal(h.guard.hasSafetyBackup(),false);
  await h.guard.acknowledgeSafetyBackup(before);
  assert.equal(h.guard.status(),'check','history is still visibly uncertain');assert.equal(h.unload(),false);assert.equal(h.guard.hasSafetyBackup(),true);
  assert.equal(h.values.get(KEYS.metadata),before.before[KEYS.metadata]);assert.equal(h.storage.writes,1);
  const receipt=h.values.get(SAFETY_RECEIPT_KEY);assert.ok(receipt.length<110);
  assert.deepEqual(Object.keys(JSON.parse(receipt)),['version','digest']);assert.equal(receipt.includes('Reference'),false);assert.equal(receipt.includes('PRIVATE'),false);
  for(const key of DATA_KEYS)assert.equal(h.values.get(key),before.before[key]);
});

test('a receipt verifies after reload, while every shared data store and either journal immediately invalidate it',async()=>{
  for(const key of [...DATA_KEYS,KEYS.metadata,KEYS.journal,launchpadJournal]){
    const h=missingHistory();await h.guard.refresh();await h.guard.acknowledgeSafetyBackup(capture(h));
    const next=missingHistory();next.values.set(SAFETY_RECEIPT_KEY,h.values.get(SAFETY_RECEIPT_KEY));await next.guard.refresh();
    assert.equal(next.unload(),false,`${key}: receipt reloads`);
    if([KEYS.journal,launchpadJournal].includes(key))next.values.set(key,'new recovery marker');
    else if(key===KEYS.metadata)next.values.set(key,'changed handover history');
    else {const value=JSON.parse(next.values.get(key));
      if(key===KEYS.vet)value.records.task.evidenceRef='Later evidence';
      if(key===KEYS.tas)value.records.task.exceptionReason='Later TAS work';
      if(key===KEYS.review)value.records['vet:2026:task'].reviewedOn='2026-09-19';
      if(key===KEYS.inbox)value.items[0].noteText='Later shared note';
      next.values.set(key,JSON.stringify(value));}
    assert.equal(next.unload(),true,`${key}: final synchronous inspection warns`);assert.equal(next.guard.hasSafetyBackup(),false);
  }
});

test('a safety confirmation refuses changed data or either changed journal before creating a receipt',async()=>{
  for(const key of [KEYS.vet,KEYS.metadata,KEYS.journal,launchpadJournal]){
    const h=missingHistory();await h.guard.refresh();const before=capture(h);h.values.set(key,'different');
    await assert.rejects(h.guard.acknowledgeSafetyBackup(before),/changed after this safety copy/);
    assert.equal(h.values.has(SAFETY_RECEIPT_KEY),false);assert.equal(h.unload(),true);
  }
});

test('later edits during digest calculation or a quota error do not acknowledge the file',async()=>{
  const h=missingHistory();await h.guard.refresh();const before=capture(h);
  const cryptoProvider={subtle:{async digest(...args){h.values.set(launchpadJournal,'interrupted restore');return crypto.subtle.digest(...args);}}};
  await assert.rejects(acknowledgeSafetyBackup(h.storage,before,{cryptoProvider}),/changed after this safety copy/);
  assert.equal(h.values.has(SAFETY_RECEIPT_KEY),false);h.values.delete(launchpadJournal);
  h.storage.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};
  await assert.rejects(h.guard.acknowledgeSafetyBackup(before),{name:'QuotaExceededError'});
  assert.equal(h.unload(),true);assert.equal(h.guard.hasSafetyBackup(),false);assert.equal(h.values.has(SAFETY_RECEIPT_KEY),false);
});

test('private-only Launchpad edits do not invalidate a confirmed shared safety file',async()=>{
  const h=missingHistory();await h.guard.refresh();await h.guard.acknowledgeSafetyBackup(capture(h));
  const value=JSON.parse(h.values.get(KEYS.inbox));value.briefing='New PRIVATE briefing';h.values.set(KEYS.inbox,JSON.stringify(value));
  assert.equal(h.unload(),false);assert.equal(h.guard.hasSafetyBackup(),true);
});

test('a download or a previous-copy export never clears warning without a matching explicit acknowledgement',async()=>{
  const h=missingHistory();await h.guard.refresh();const before=capture(h);
  assert.equal(h.unload(),true);assert.equal(h.storage.writes,0);
  // A downloaded file alone causes no guard call. A previous-copy capture is
  // deliberately different from current progress and cannot be acknowledged.
  const older=copy(before),value=JSON.parse(older.before[KEYS.vet]);value.records.task.evidenceRef='Old evidence';older.before[KEYS.vet]=JSON.stringify(value);
  await assert.rejects(h.guard.acknowledgeSafetyBackup(older),/changed after this safety copy/);
  assert.equal(h.unload(),true);assert.equal(h.storage.writes,0);
});

test('receipt removal, corruption or an unrelated digest fails closed',async()=>{
  const h=missingHistory();await h.guard.refresh();await h.guard.acknowledgeSafetyBackup(capture(h));
  for(const value of [null,'{',JSON.stringify({version:1,digest:'0'.repeat(64)})]){
    if(value===null)h.values.delete(SAFETY_RECEIPT_KEY);else h.values.set(SAFETY_RECEIPT_KEY,value);
    assert.equal(h.unload(),true);await h.guard.refresh();assert.equal(h.unload(),true);
  }
});


test('area reminders inspect only their own progress and saving one leaves the other warning active',async()=>{
  const baseline=fixture(),h=harness(null),hydrate=async value=>copy(value);
  h.values.set(KEYS.vetMetadata,JSON.stringify(session(baseline,'vet-session')));
  h.values.set(KEYS.tasMetadata,JSON.stringify(session(baseline,'tas-session')));
  const vet=installTeamExitGuard(h.win,h.doc,h.storage,{hydrate,scope:'vet'}),tas=installTeamExitGuard(h.win,h.doc,h.storage,{hydrate,scope:'tas'});
  await Promise.all([vet.refresh(),tas.refresh()]);assert.equal(vet.status(),'clean');assert.equal(tas.status(),'clean');
  const edited=JSON.parse(h.values.get(KEYS.tas));edited.records.task.exceptionReason='Unsaved TAS work';h.values.set(KEYS.tas,JSON.stringify(edited));
  await Promise.all([vet.refresh(),tas.refresh()]);assert.equal(vet.status(),'clean');assert.equal(tas.status(),'changed');
  h.values.set(KEYS.vetMetadata,JSON.stringify({version:1,lastFile:{workspaceId:'vet',revision:2},active:null,pendingExport:null}));
  await Promise.all([vet.refresh(),tas.refresh()]);assert.equal(vet.status(),'idle');assert.equal(tas.status(),'changed');assert.equal(h.unload(),true);
});
test('area safety receipt cannot silence the other area and survives only irrelevant other-area changes',async()=>{
  const baseline=fixture(),h=harness(null),hydrate=async value=>copy(value);
  h.values.set(KEYS.vetMetadata,JSON.stringify(session(baseline,'vet-session')));h.values.set(KEYS.tasMetadata,JSON.stringify(session(baseline,'tas-session')));
  const vet=installTeamExitGuard(h.win,h.doc,h.storage,{hydrate,scope:'vet'}),tas=installTeamExitGuard(h.win,h.doc,h.storage,{hydrate,scope:'tas'});
  for(const scope of ['vet','tas']){const edited=JSON.parse(h.values.get(KEYS[scope]));edited.records.task[scope==='vet'?'exceptionSummary':'exceptionReason']='Changed';h.values.set(KEYS[scope],JSON.stringify(edited));}
  await Promise.all([vet.refresh(),tas.refresh()]);
  await vet.acknowledgeSafetyBackup({scope:'vet',before:Object.fromEntries([...DATA_KEYS,KEYS.vetMetadata].map(key=>[key,h.storage.getItem(key)])),journals:[null,null]});
  assert.equal(vet.hasSafetyBackup(),true);assert.equal(tas.hasSafetyBackup(),false);assert.equal(h.unload(),true);
  const changed=JSON.parse(h.values.get(KEYS.tas));changed.records.task.exceptionReason='Later TAS work';h.values.set(KEYS.tas,JSON.stringify(changed));
  assert.equal(vet.hasSafetyBackup(),true,'saving VET is independent of future TAS work');
});


test('scoped safety receipt binds legacy fallback session until the area has its own metadata',async()=>{
  const baseline=fixture(),h=harness(null),legacy=session(baseline,'legacy-session');
  h.values.set(KEYS.metadata,JSON.stringify(legacy));
  const vet=installTeamExitGuard(h.win,h.doc,h.storage,{hydrate:async value=>copy(value),scope:'vet'});
  await vet.refresh();
  const expected={scope:'vet',before:Object.fromEntries([...DATA_KEYS,KEYS.vetMetadata,KEYS.metadata].map(key=>[key,h.storage.getItem(key)])),journals:[null,null]};
  await vet.acknowledgeSafetyBackup(expected);assert.equal(vet.hasSafetyBackup(),true);
  h.values.set(KEYS.metadata,JSON.stringify({...legacy,active:{...legacy.active,phase:'exporting'},pendingExport:{exportId:'next-file'}}));
  assert.equal(vet.hasSafetyBackup(),false,'a new effective legacy session invalidates the old receipt immediately');
  await vet.refresh();assert.equal(vet.status(),'upload');assert.equal(h.unload(),true);
  await assert.rejects(vet.acknowledgeSafetyBackup(expected),/changed/);
});
