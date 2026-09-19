import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {enrich} from '../morning-launchpad/assets/summary-core.mjs';
import {KEYS} from '../assets/js/team-handover-core.mjs';

const script=readFileSync(new URL('../assets/js/team-session.js',import.meta.url),'utf8');
const json=JSON.stringify;
const metadata=(active=null)=>({version:1,lastFile:{workspaceId:'test-team',revision:3,exportId:'file-three'},active,pendingExport:null});
const editing=(id='session-one')=>({id,editor:'Steve',phase:'editing',startedAt:'2026-09-19T00:00:00.000Z'});
function forecast(){
  return {version:1,managed:true,active:true,section:'ready',kind:'scheduled',reason:'From the workboard',scheduledDate:'2026-09-21',windowStart:null,windowEnd:null,
    period:'Term 3',sourceStatus:'in-progress',blocked:false,blockerReason:'',asOf:'2026-09-19',role:'htvet',roleLabel:'Head Teacher VET',year:'2026',sourceYear:'2026',horizonDays:21};
}
function taskHelp(){
  return {version:1,wing:'vet',taskId:'task',canonicalTaskId:'task',title:'Team task',recordKey:'task::2026',cycle:'2026',asOf:'2026-09-19',sourceAsAt:'2026 source',sourceStatus:'in-progress',
    objective:'Prepare the team task',nextStep:'Check the source',steps:['Review the record'],roles:['Head Teacher VET'],sources:['Authorised handbook'],links:[{label:'This browser source',url:'https://private.example/original'}]};
}
function teamCard(){
  return enrich({id:'team-card',title:'Team task',action:'Check the source',taskKey:'workboard:vet:task::2026',workstream:'vet',
    origin:{wing:'vet',taskId:'task',recordKey:'task::2026',route:'#task/task',cycle:'2026'},createdOn:'2026-09-19',noteText:'Shared working note',
    taskHelp:taskHelp(),forecast:forecast(),dependsOn:['workboard:tas:other','email:private'],dirty:['noteText','source'],source:'Private source text'});
}
function personalCard(){return enrich({id:'personal-card',title:'Personal email',action:'Reply privately',taskKey:'email:private',workstream:'personal',source:'Private email content'});}
function stores(){
  return {
    [KEYS.vet]:json({schemaVersion:3,records:{task:{status:'in-progress',stepChecks:{0:false},exceptionSummary:'Working note'}},assignments:{},gaps:{},eventOccurrences:[],role:'htvet',guidance:true,links:{}}),
    [KEYS.tas]:json({schemaVersion:2,records:{'task::2026':{status:'in-progress',steps:{0:false},exceptionReason:'Working note'}},weekly:{},eventOccurrences:{},scheduleOverrides:{},mode:'guided',links:{}}),
    [KEYS.review]:json({version:1,records:{}}),
    [KEYS.inbox]:json({version:2,items:[teamCard(),personalCard()],briefing:'Private briefing',workboardImports:['vet:task::2026'],forecastContexts:{}})
  };
}
function harness({teamState=metadata(),journal=null,areas={}}={}){
  const values=new Map(Object.entries(stores())),events=[],writes=[];
  if(teamState!==null)values.set(KEYS.metadata,typeof teamState==='string'?teamState:json(teamState));
  if(journal!==null)values.set(KEYS.journal,journal);
  for(const [scope,state] of Object.entries(areas))values.set(KEYS[`${scope}Metadata`],typeof state==='string'?state:json(state));
  const storage={getItem:key=>values.get(key)??null,setItem(key,value){values.set(key,String(value));writes.push({key,value:String(value)});},removeItem(key){values.delete(key);writes.push({key,value:null});}};
  const window={dispatchEvent(event){events.push(event);return true;}};
  class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
  vm.runInNewContext(script,{window,localStorage:storage,CustomEvent},{filename:'team-session.js'});
  const guard=window.WWHS_TEAM_SESSION;
  return {guard,values,events,writes,storage,
    attempt(key,next){const raw=typeof next==='string'?next:json(next);if(!guard.allowWrite(key,raw))return false;storage.setItem(key,raw);return true;},
    value:key=>JSON.parse(storage.getItem(key))};
}
function denied(h,key,next,pattern){
  const before=new Map(h.values),count=h.writes.length,eventCount=h.events.length;
  assert.equal(h.attempt(key,next),false);
  assert.deepEqual(h.values,before,'A blocked attempt must preserve every stored value');
  assert.equal(h.writes.length,count,'A blocked attempt must not invoke storage writes');
  assert.equal(h.events.length,eventCount+1);
  assert.equal(h.events.at(-1).type,'wwhs:team-write-blocked');
  assert.equal(typeof h.events.at(-1).detail.message,'string');
  if(pattern)assert.match(h.events.at(-1).detail.message,pattern);
}

test('individual mode permits normal native and inbox writes without creating team metadata',()=>{
  const h=harness({teamState:null});assert.equal(h.guard.read().managed,false);assert.equal(h.guard.isEditing(),true);assert.equal(h.writes.length,0);
  const vet=h.value(KEYS.vet);vet.records.task.stepChecks[0]=true;assert.equal(h.attempt(KEYS.vet,vet),true);
  const inbox=h.value(KEYS.inbox);inbox.items[0].noteText='New working note';assert.equal(h.attempt(KEYS.inbox,inbox),true);
  assert.equal(h.values.has(KEYS.metadata),false);assert.equal(h.events.length,0);
});
test('view-only mode blocks VET, TAS and overall review progress without changing saved state',()=>{
  const h=harness();assert.equal(h.guard.isEditing(),false);
  const vet=h.value(KEYS.vet);vet.records.task.stepChecks[0]=true;denied(h,KEYS.vet,vet,/view-only/i);
  const tas=h.value(KEYS.tas);tas.weekly['2026-09-14']={0:true};denied(h,KEYS.tas,tas,/view-only/i);
  const review=h.value(KEYS.review);review.records['vet:2026:task']={completed:true,reviewedOn:'2026-09-19'};denied(h,KEYS.review,review,/view-only/i);
});
test('view-only preferences and device links can change without altering shared progress',()=>{
  const h=harness();
  const vet=h.value(KEYS.vet);vet.role='coordinator';vet.guidance=false;vet.links.staff='https://private.example/vet';assert.equal(h.attempt(KEYS.vet,vet),true);
  const tas=h.value(KEYS.tas);tas.mode='fast';tas.links.staff='https://private.example/tas';assert.equal(h.attempt(KEYS.tas,tas),true);
  assert.equal(h.events.length,0);assert.equal(h.value(KEYS.vet).records.task.stepChecks[0],false);
});
test('view-only personal email editing, creation and deletion remain available',()=>{
  const h=harness(),inbox=h.value(KEYS.inbox);inbox.items[1].action='Reply tomorrow';inbox.items[1].noteText='Private note';inbox.briefing='Updated private briefing';
  inbox.items.push(enrich({id:'second-personal',title:'Personal reminder',action:'Phone home',personal:true}));assert.equal(h.attempt(KEYS.inbox,inbox),true);
  inbox.items=inbox.items.filter(item=>item.id!=='personal-card');assert.equal(h.attempt(KEYS.inbox,inbox),true);
  assert.equal(h.events.length,0);assert.equal(h.value(KEYS.inbox).items[0].noteText,'Shared working note');
});
test('view-only shared note, status, date and task-help changes are blocked',()=>{
  for(const change of [item=>item.noteText='Updated team note',item=>item.status='done',item=>item.dueDate='2026-10-01',item=>item.taskHelp.nextStep='New source action',item=>item.reason='New shared reason',item=>item.score=70]){
    const h=harness(),inbox=h.value(KEYS.inbox);change(inbox.items[0]);denied(h,KEYS.inbox,inbox,/view-only/i);
  }
});
test('forecast completion is shared progress even when the explicit card status is unchanged',()=>{
  const h=harness(),inbox=h.value(KEYS.inbox);assert.equal(inbox.items[0].status,'review');
  inbox.items[0].forecast.sourceStatus='completed';denied(h,KEYS.inbox,inbox,/view-only/i);
  assert.equal(h.value(KEYS.inbox).items[0].forecast.sourceStatus,'in-progress');
});
test('workboard import suppression markers cannot change in a view-only snapshot',()=>{
  for(const nextHistory of [[],['vet:task::2026','tas:new-occurrence']]){
    const h=harness(),inbox=h.value(KEYS.inbox);inbox.workboardImports=nextHistory;denied(h,KEYS.inbox,inbox,/view-only/i);
  }
});
test('device-private fields on a shared card do not require a shared editing session',()=>{
  const h=harness(),inbox=h.value(KEYS.inbox),item=inbox.items[0];
  item.source='Updated private source';item.sourceSummary='Private mail summary';item.url='https://private.example/new';item.links=['https://private.example/local'];
  item.noteHtml='<p>Local formatting</p>';item.pinnedDate='2026-09-19';item.relatedTitles=['Private title'];item.help='Private preparation guidance';item.planAliases=[{id:'private-plan',title:'Private plan title'}];
  item.taskHelp.links=[{label:'Private source replacement',url:'https://private.example/replacement'}];
  item.dependsOn=['workboard:tas:other','email:changed-private-dependency'];item.dirty=['noteText','source','url','pinnedDate'];
  assert.equal(h.attempt(KEYS.inbox,inbox),true);assert.equal(h.events.length,0);
  assert.equal(h.value(KEYS.inbox).items[0].noteText,'Shared working note');
});
test('shared dependency and shared dirty markers remain protected',()=>{
  const h=harness(),inbox=h.value(KEYS.inbox);inbox.items[0].dependsOn=['workboard:tas:new-shared-dependency','email:private'];denied(h,KEYS.inbox,inbox,/view-only/i);
  const dirty=h.value(KEYS.inbox);dirty.items[0].dirty=['noteText','action','source'];denied(h,KEYS.inbox,dirty,/view-only/i);
});
test('the tab that opened the active editing session can save shared progress',()=>{
  const h=harness({teamState:metadata(editing())});assert.equal(h.guard.isEditing(),true);
  const vet=h.value(KEYS.vet);vet.records.task.exceptionSummary='Progress from this session';assert.equal(h.attempt(KEYS.vet,vet),true);
  const inbox=h.value(KEYS.inbox);inbox.items[0].noteText='Progress from this session';assert.equal(h.attempt(KEYS.inbox,inbox),true);assert.equal(h.events.length,0);
});
test('a prepared export blocks further operational changes until the handover is resolved',()=>{
  const state=metadata({...editing(),phase:'exporting'});state.pendingExport={exportId:'pending-file'};
  const h=harness({teamState:state});assert.equal(h.guard.isEditing(),false);
  const vet=h.value(KEYS.vet);vet.records.task.exceptionSummary='Too late for this export';denied(h,KEYS.vet,vet,/handover file is being saved/i);
  const inbox=h.value(KEYS.inbox);inbox.items[0].noteText='Too late for this export';denied(h,KEYS.inbox,inbox,/handover file is being saved/i);
});
test('an already-open editor loses write access immediately when exporting begins',()=>{
  const h=harness({teamState:metadata(editing())});assert.equal(h.guard.isEditing(),true);
  const next=metadata({...editing(),phase:'exporting'});next.pendingExport={exportId:'next-file'};h.values.set(KEYS.metadata,json(next));
  assert.equal(h.guard.isEditing(),false);const inbox=h.value(KEYS.inbox);inbox.items[0].status='done';denied(h,KEYS.inbox,inbox,/being saved/i);
});
test('an old tab cannot save into a replacement session even when that session is editing',()=>{
  const h=harness({teamState:metadata(editing('old-session'))});assert.equal(h.guard.isEditing(),true);
  h.values.set(KEYS.metadata,json(metadata(editing('new-session'))));assert.equal(h.guard.isEditing(),false);
  const tas=h.value(KEYS.tas);tas.records['task::2026'].exceptionReason='Stale tab change';denied(h,KEYS.tas,tas,/changed in another tab/i);
});
test('a tab opened in view-only mode cannot inherit an editing session started elsewhere',()=>{
  const h=harness();h.values.set(KEYS.metadata,json(metadata(editing('other-tab'))));assert.equal(h.guard.isEditing(),false);
  const inbox=h.value(KEYS.inbox);inbox.items[0].status='done';denied(h,KEYS.inbox,inbox,/changed in another tab/i);
});
test('an unfinished recovery journal blocks even preferences, personal mail and unchanged writes',()=>{
  for(const teamState of [metadata(editing()),null]){
    const h=harness({teamState,journal:'{"version":1,"phase":"prepared"}'});assert.equal(h.guard.isEditing(),false);
    const vet=h.value(KEYS.vet);vet.role='coordinator';denied(h,KEYS.vet,vet,/recover/i);
    const inbox=h.value(KEYS.inbox);inbox.items[1].noteText='Private edit during recovery';denied(h,KEYS.inbox,inbox,/recover/i);
    denied(h,KEYS.review,h.storage.getItem(KEYS.review),/recover/i);
  }
});
test('malformed session metadata fails closed without changing browser data',()=>{
  const h=harness({teamState:'{broken'});assert.equal(h.guard.read().blocked,true);assert.equal(h.guard.isEditing(),false);
  const vet=h.value(KEYS.vet);vet.records.task.stepChecks[0]=true;denied(h,KEYS.vet,vet,/could not be read/i);
  const inbox=h.value(KEYS.inbox);inbox.items[1].noteText='Private edit';denied(h,KEYS.inbox,inbox,/could not be read/i);
});
test('reordering saved records and card display order is operationally unchanged',()=>{
  const h=harness(),inbox=h.value(KEYS.inbox);inbox.items.reverse();assert.equal(h.attempt(KEYS.inbox,inbox),true);
  const vet=h.value(KEYS.vet);vet.records={task:{exceptionSummary:'Working note',stepChecks:{0:false},status:'in-progress'}};assert.equal(h.attempt(KEYS.vet,vet),true);
  assert.equal(h.events.length,0);
});


test('area sessions permit TAS work while VET is view only and keep legacy history unchanged',()=>{
  const h=harness({areas:{vet:metadata(),tas:metadata(editing('tas-session'))}}),legacy=h.values.get(KEYS.metadata);
  assert.equal(h.guard.isEditing('vet'),false);assert.equal(h.guard.isEditing('tas'),true);
  const vet=h.value(KEYS.vet);vet.records.task.status='completed';denied(h,KEYS.vet,vet);
  const tas=h.value(KEYS.tas);tas.records['task::2026'].status='completed';assert.equal(h.attempt(KEYS.tas,tas),true);
  const reviews=h.value(KEYS.review);reviews.records['tas:2026:task']={completed:true,reviewedOn:'2026-09-20'};assert.equal(h.attempt(KEYS.review,reviews),true);
  reviews.records['vet:2026:task']={completed:true,reviewedOn:'2026-09-20'};denied(h,KEYS.review,reviews);
  assert.equal(h.values.get(KEYS.metadata),legacy);
});
test('area session changes in another tab do not revoke the other area',()=>{
  const h=harness({areas:{vet:metadata(editing('vet-session')),tas:metadata(editing('tas-session'))}});
  h.values.set(KEYS.vetMetadata,json(metadata(editing('new-vet-session'))));
  assert.equal(h.guard.isEditing('vet'),false);assert.equal(h.guard.isEditing('tas'),true);
  const tas=h.value(KEYS.tas);tas.records['task::2026'].exceptionReason='Later note';assert.equal(h.attempt(KEYS.tas,tas),true);
});
test('damaged area metadata does not block unrelated native work',()=>{
  const h=harness({teamState:null,areas:{vet:'broken',tas:metadata(editing('tas-session'))}});
  const tas=h.value(KEYS.tas);tas.records['task::2026'].exceptionReason='Later note';assert.equal(h.attempt(KEYS.tas,tas),true);
});
