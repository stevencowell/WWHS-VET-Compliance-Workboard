import test from 'node:test';
import assert from 'node:assert/strict';
import {enrich} from '../morning-launchpad/assets/summary-core.mjs';
import {KEYS,snapshot} from '../assets/js/team-handover-core.mjs';
import {hasProgressChanges,isWorkboardDestination,installTeamExitGuard} from '../assets/js/team-exit-guard.mjs';

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
  const storage={writes:0,getItem:key=>values.get(key)??null,setItem(){this.writes++;},removeItem(){this.writes++;}};
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
