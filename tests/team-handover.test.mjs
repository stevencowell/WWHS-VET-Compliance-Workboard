import test from 'node:test';
import assert from 'node:assert/strict';
import {enrich,validateInbox} from '../morning-launchpad/assets/summary-core.mjs';
import {KEYS,DATA_KEYS,readRaw,snapshot,createBackup,parseBackup,checkRevision,buildImportPlan,atomicApply,recoverTransaction,isTeamItem} from '../assets/js/team-handover-core.mjs';

class Storage {
  constructor(entries={}){this.values=new Map(Object.entries(entries));this.writes=0;this.failAt=0;this.failPersistent=false;}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){this.writes++;if(this.writes===this.failAt||this.failPersistent)throw new Error('Quota exceeded');this.values.set(key,String(value));}
  removeItem(key){this.writes++;if(this.writes===this.failAt||this.failPersistent)throw new Error('Quota exceeded');this.values.delete(key);}
}
const json=JSON.stringify,copy=value=>JSON.parse(json(value)),own=(value,key)=>Object.hasOwn(value,key);
function card(id='vet-local',wing='vet',extra={}){
  return enrich({id,taskKey:`workboard:${wing}:task::2026`,title:`${wing.toUpperCase()} task`,action:'Confirm the next action',
    workstream:wing,origin:{wing,taskId:'task',recordKey:'task::2026',route:'#task/task',cycle:'2026'},createdOn:'2026-09-18',...extra});
}
function help(wing='vet'){
  return {version:1,wing,taskId:'task',canonicalTaskId:'task',title:'Source task',recordKey:'task::2026',cycle:'2026',asOf:'2026-09-18',sourceAsAt:'Source checked 2026',
    sourceStatus:'in-progress',objective:'Prepare the team task',nextStep:'Review the source',steps:['Read the source'],roles:['Head Teacher'],sources:['Official handbook'],links:[{label:'Device link',url:'https://private.example/help'}]};
}
function fixture(){
  return new Storage({
    [KEYS.vet]:json({schemaVersion:3,role:'htvet',guidance:true,links:{staff:'https://private.example/vet'},records:{task:{status:'in-progress',stepChecks:{0:true,1:false},exceptionSummary:'Working note',sourceChecked:false,reviewDate:'2026-09-22'}},assignments:{task:'Head Teacher VET'},gaps:{gap:{status:'in-progress',reference:'Reference 14',sourceChecked:false}},eventOccurrences:[]}),
    [KEYS.tas]:json({schemaVersion:2,mode:'guided',links:{staff:'https://private.example/tas'},records:{'task::2026':{status:'in-progress',steps:{0:true},milestones:{0:false},exceptionReason:'Waiting for reply',sourceChecked:false,doneConfirmed:false}},weekly:{'2026-09-14':{0:true,1:false}},eventOccurrences:{event:'event-one'},scheduleOverrides:{planning:{dueDate:'2027-03-01',milestones:['2027-03-01','2027-03-03'],confirmed:false,sourceNote:'Planning draft',updatedAt:'2026-09-18T01:00:00.000Z'}}}),
    [KEYS.review]:json({version:1,records:{'vet:2026:task':{completed:true,reviewedOn:'2026-09-18'}}}),
    [KEYS.inbox]:json({version:2,briefing:'PRIVATE MAIL BRIEFING',items:[
      card('vet-local','vet',{source:'PRIVATE MAIL SOURCE',sourceSummary:'PRIVATE MAIL SUMMARY',url:'https://private.example/card',links:['https://private.example/link'],help:'PRIVATE HELP',relatedTitles:['PRIVATE TITLE'],pinnedDate:'2026-09-18',planAliases:[{id:'private-plan',title:'PRIVATE PLAN'}],noteHtml:'<p>Old note</p>',noteText:'Old note',taskHelp:help(),dirty:['source','noteText','url','pinnedDate'],dependsOn:['email:private-key','workboard:tas:other']}),
      card('tas-local','tas'),enrich({id:'email-1',title:'Private email',action:'Reply privately',taskKey:'email:private',source:'PERSONAL SECRET',workstream:'personal'}),
      card('private-linked','vet',{taskKey:'workboard:vet:private-card',origin:{wing:'vet',taskId:'private-card',recordKey:'private-card',route:'#task/private-card',cycle:'2026'},personal:true})
    ],workboardImports:['vet:task::2026','tas:task::2026','vet:previously-deleted']})
  });
}
function backup(storage=fixture(),extra={}){
  return createBackup({snapshot:snapshot(storage),editor:'Steve',workspaceId:'test-team',exportId:'export-one',savedAt:'2026-09-18T01:00:00.000Z',note:'Next person: check the reply.',changes:['VET task progress: 1 changed record'],...extra});
}

test('export preserves progress and excludes personal cards, email content, private links and pins',()=>{
  const file=backup(),text=json(file);
  for(const forbidden of ['PRIVATE MAIL','private.example','PERSONAL SECRET','PRIVATE TITLE','PRIVATE PLAN','PRIVATE HELP','email:private-key','private-linked'])assert.equal(text.includes(forbidden),false,forbidden);
  assert.equal(file.data.inbox.items.length,2);const item=file.data.inbox.items[0];
  assert.equal(own(item,'id'),false);assert.equal(own(item,'noteHtml'),false);assert.deepEqual(item.dirty,['noteText']);
  assert.deepEqual(item.dependsOn,['workboard:tas:other']);assert.deepEqual(item.taskHelp.links,[]);
  assert.equal(file.data.vet.records.task.stepChecks[0],true);assert.equal(file.data.vet.records.task.sourceChecked,false);
  assert.equal(file.data.tas.weekly['2026-09-14'][1],false);assert.equal(file.data.review.records['vet:2026:task'].completed,true);
  assert.deepEqual(parseBackup(text),file);
});
test('only correctly classified origin-linked native cards qualify',()=>{
  assert.equal(isTeamItem(card()),true);
  for(const change of [{origin:null},{workstream:'tas'},{personal:true},{taskKey:'email:123'},{origin:{wing:'vet'}}])assert.equal(isTeamItem(card('id','vet',change)),false);
  const local=fixture(),inbox=JSON.parse(local.getItem(KEYS.inbox));inbox.items.push(card('unlinked','vet',{origin:null,taskKey:'manual:123'}));
  local.setItem(KEYS.inbox,json(inbox));assert.equal(snapshot(local).inbox.items.length,2);
});
test('roundtrip takes incoming ticks, notes and dates while preserving local IDs and private state',()=>{
  const incoming=backup(),local=fixture(),beforeInbox=JSON.parse(local.getItem(KEYS.inbox)),incomingItem=incoming.data.inbox.items[0];
  incomingItem.status='done';incomingItem.noteText='The new shared working note';incomingItem.dueDate='2026-10-01';incomingItem.followUpDate=null;incomingItem.lastActionOn='2026-09-18';
  incoming.data.vet.records.task.stepChecks={0:false};incoming.data.review.records={};incoming.data.tas.weekly={};
  const plan=buildImportPlan(local,incoming,{firstConnection:true});assert.deepEqual(plan.beforeSnapshot,snapshot(local));assert.equal(plan.counts.updated,1);
  atomicApply(local,plan.before,plan.after);
  const actual=JSON.parse(local.getItem(KEYS.inbox)),item=actual.items.find(item=>item.id==='vet-local');
  assert.equal(item.status,'done');assert.equal(item.noteText,incomingItem.noteText);assert.equal(item.noteHtml,'');assert.equal(item.dueDate,'2026-10-01');
  assert.equal(item.source,'PRIVATE MAIL SOURCE');assert.equal(item.pinnedDate,'2026-09-18');assert.deepEqual(item.planAliases,beforeInbox.items[0].planAliases);
  assert.deepEqual(actual.items.filter(item=>['email-1','private-linked'].includes(item.id)),beforeInbox.items.filter(item=>['email-1','private-linked'].includes(item.id)));
  assert.equal(actual.briefing,'PRIVATE MAIL BRIEFING');assert.equal(JSON.parse(local.getItem(KEYS.vet)).role,'htvet');assert.equal(JSON.parse(local.getItem(KEYS.vet)).links.staff,'https://private.example/vet');
  assert.deepEqual(JSON.parse(local.getItem(KEYS.vet)).records.task.stepChecks,{0:false});assert.deepEqual(JSON.parse(local.getItem(KEYS.review)).records,{});assert.deepEqual(JSON.parse(local.getItem(KEYS.tas)).weekly,{});
  assert.deepEqual(snapshot(local),incoming.data);
});
test('repeated imports keep IDs and stable origin identities without duplicates',()=>{
  const file=backup(),local=new Storage();let next=0;
  let plan=buildImportPlan(local,file,{firstConnection:true,createId:()=>`new-${++next}`});atomicApply(local,plan.before,plan.after);
  const ids=JSON.parse(local.getItem(KEYS.inbox)).items.map(item=>item.id);
  plan=buildImportPlan(local,file,{lastFile:file,createId:()=>{throw new Error('Unexpected duplicate');}});
  assert.equal(plan.same,true);atomicApply(local,plan.before,plan.after);assert.deepEqual(JSON.parse(local.getItem(KEYS.inbox)).items.map(item=>item.id),ids);
});
test('authoritative deletion removes team cards and retains suppression history',()=>{
  const local=fixture(),file=backup(local);file.data.inbox.items=[];
  const plan=buildImportPlan(local,file,{firstConnection:true});assert.equal(plan.counts.removed,2);atomicApply(local,plan.before,plan.after);
  const actual=JSON.parse(local.getItem(KEYS.inbox));assert.equal(actual.items.length,2);assert.deepEqual(actual.workboardImports,['vet:task::2026','tas:task::2026','vet:previously-deleted']);
});
test('private cards colliding with incoming identities block import without writes',()=>{
  for(const change of [{personal:true},{workstream:'personal'}]){
    const local=fixture(),file=backup(local),value=JSON.parse(local.getItem(KEYS.inbox));value.items[0]={...value.items[0],...change};local.values.set(KEYS.inbox,json(value));
    const before=readRaw(local);assert.throws(()=>buildImportPlan(local,file,{firstConnection:true}),/private task/);assert.deepEqual(readRaw(local),before);assert.equal(local.writes,0);
  }
});
test('duplicate origin records with different task keys fail closed',()=>{
  const file=backup();file.data.inbox.items.push({...copy(file.data.inbox.items[0]),taskKey:'workboard:vet:second-key'});assert.throws(()=>parseBackup(file),/Duplicate team task/);
  const local=fixture(),inbox=JSON.parse(local.getItem(KEYS.inbox));inbox.items.push({...copy(inbox.items[0]),id:'second-id',taskKey:'workboard:vet:second-key'});local.values.set(KEYS.inbox,json(inbox));assert.throws(()=>snapshot(local),/Duplicate team task/);
});
test('malformed fields, unknown schemas and incomplete containers do not become blank imports',()=>{
  const valid=backup();
  for(const mutate of [file=>file.schemaVersion=99,file=>file.data.vet.schemaVersion=2,file=>delete file.data.vet.records,file=>file.data.vet.records.task.stepChecks[0]='true',
    file=>file.data.tas.weekly['2026-02-30']={},file=>file.data.review.records['vet:2026:task'].completed='true',file=>file.data.inbox.items[0].source='SECRET',
    file=>file.data.inbox.items[0].personal=true,file=>file.data.inbox.items[0].dueDate='2026-02-30',file=>file.savedAt='yesterday',file=>file.data.tas.scheduleOverrides.planning.milestones=['2027-03-05','2027-03-01']]){
    const malformed=copy(valid);mutate(malformed);assert.throws(()=>parseBackup(malformed));
  }
  for(const raw of ['{broken','null','[]',json({schemaVersion:99,records:{}})]){
    const local=fixture();local.values.set(KEYS.vet,raw);const before=readRaw(local);
    assert.throws(()=>snapshot(local));assert.throws(()=>buildImportPlan(local,valid,{firstConnection:true}));assert.deepEqual(readRaw(local),before);
  }
  const local=fixture();local.values.set(KEYS.inbox,'{"version":999,"items":[]}');assert.throws(()=>snapshot(local),/Invalid review list/);
  local.values.set(KEYS.inbox,json({version:2,items:[{id:'broken',title:'Broken'}]}));assert.throws(()=>snapshot(local),/Invalid task fields/);
});
test('revision gates reject old files, same-number forks, wrong parents and other workspaces',()=>{
  const first=backup(),second=backup(fixture(),{previous:first,exportId:'export-two'}),third=backup(fixture(),{previous:second,exportId:'export-three'});
  assert.deepEqual(checkRevision(first,null,{firstConnection:true}),{same:false,firstConnection:true});assert.throws(()=>checkRevision(first,null),/first team connection/);
  assert.equal(checkRevision(first,first).same,true);assert.equal(checkRevision(second,first).same,false);assert.equal(checkRevision(third,first).same,false);
  assert.throws(()=>checkRevision(first,second),/older/);assert.throws(()=>checkRevision({...first,exportId:'other-export'},first),/same revision/);
  assert.throws(()=>checkRevision({...second,parentExportId:'other-parent'},first),/different parent/);assert.throws(()=>checkRevision({...first,workspaceId:'another-team'},first,{firstConnection:true}),/different team workspace/);
  assert.throws(()=>parseBackup({...first,parentRevision:0}),/first team file/);
});
test('unexpected nested forecast fields cannot leak private data',()=>{
  const local=fixture(),value=JSON.parse(local.getItem(KEYS.inbox));
  value.items[0].forecast={version:1,managed:true,active:true,section:'ready',kind:'scheduled',reason:'Scheduled task',scheduledDate:'2026-09-21',windowStart:null,windowEnd:null,period:'Term 3',sourceStatus:'in-progress',blocked:false,blockerReason:'',asOf:'2026-09-18',role:'htvet',roleLabel:'Head Teacher VET',year:'2026',sourceYear:'2026',horizonDays:21,privateSource:'SECRET FORECAST'};
  local.values.set(KEYS.inbox,json(value));const file=backup(local);assert.equal(json(file).includes('SECRET FORECAST'),false);
  file.data.inbox.items[0].forecast.privateSource='SECRET FORECAST';assert.throws(()=>parseBackup(file),/forecast fields/);
});
test('compare-before-write includes all data stores and metadata',()=>{
  const local=fixture(),plan=buildImportPlan(local,backup(),{firstConnection:true});plan.before[KEYS.metadata]=null;plan.after[KEYS.metadata]=json({version:1,lastFile:{revision:1}});
  local.values.set(KEYS.vet,'changed-in-another-tab');const before=new Map(local.values);
  assert.throws(()=>atomicApply(local,plan.before,plan.after),/changed in another tab/);assert.deepEqual(local.values,before);assert.equal(local.writes,0);
});
test('quota failures at each transaction stage restore every prior value',()=>{
  for(let failAt=1;failAt<=7;failAt++){
    const local=fixture(),file=backup();file.data.vet.records={};file.data.tas.records={};file.data.review.records={};file.data.inbox.items=[];
    const plan=buildImportPlan(local,file,{firstConnection:true});plan.before[KEYS.metadata]=null;plan.after[KEYS.metadata]=json({version:1,lastFile:{revision:1}});
    const before=new Map(local.values);local.failAt=failAt;assert.throws(()=>atomicApply(local,plan.before,plan.after,{transactionId:`quota-${failAt}`}));
    assert.deepEqual(local.values,before,`write ${failAt}`);assert.equal(local.getItem(KEYS.journal),null);
  }
});
test('interrupted multi-key import restores its before snapshot from the saved journal',()=>{
  const local=fixture(),file=backup();file.data.vet.records={};file.data.tas.records={};const plan=buildImportPlan(local,file,{firstConnection:true});
  local.values.set(KEYS.journal,json({version:1,transactionId:'interrupted',phase:'prepared',before:plan.before,after:plan.after}));
  local.values.set(KEYS.vet,plan.after[KEYS.vet]);local.values.set(KEYS.tas,plan.after[KEYS.tas]);
  assert.throws(()=>atomicApply(local,plan.before,plan.after),/needs recovery/);assert.deepEqual(recoverTransaction(local),{status:'rolled-back'});assert.deepEqual(readRaw(local),plan.before);
});
test('failed rollback retains a recovery journal rather than claiming success',()=>{
  const local=fixture(),file=backup();file.data.vet.records={};file.data.tas.records={};const plan=buildImportPlan(local,file,{firstConnection:true});
  let calls=0;const set=local.setItem.bind(local);local.setItem=(key,value)=>{calls++;if(calls>=3){local.failPersistent=true;throw new Error('Storage blocked');}set(key,value);};
  assert.throws(()=>atomicApply(local,plan.before,plan.after),error=>error.recoveryRequired===true);assert.ok(local.getItem(KEYS.journal));
  local.setItem=set;local.failPersistent=false;assert.equal(recoverTransaction(local).status,'rolled-back');assert.deepEqual(readRaw(local),plan.before);
});
test('completed journal keeps committed values, while recovery preserves conflicting new work',()=>{
  const local=fixture(),plan=buildImportPlan(local,backup(),{firstConnection:true});for(const [key,value] of Object.entries(plan.after))local.values.set(key,value);
  const journal={version:1,transactionId:'committed',phase:'committed',before:plan.before,after:plan.after};local.values.set(KEYS.journal,json(journal));
  assert.equal(recoverTransaction(local).status,'committed');assert.deepEqual(readRaw(local),plan.after);
  local.values.set(KEYS.journal,json({...journal,phase:'prepared'}));local.values.set(KEYS.vet,'different-new-local-work');
  const before=new Map(local.values);assert.throws(()=>recoverTransaction(local),/changed during recovery/);assert.deepEqual(local.values,before);
});
test('import result remains valid for the current inbox schema',()=>{
  const local=fixture(),plan=buildImportPlan(local,backup(),{firstConnection:true});atomicApply(local,plan.before,plan.after);
  assert.equal(validateInbox(local.getItem(KEYS.inbox)).items.length,4);assert.equal(DATA_KEYS.length,4);assert.equal(recoverTransaction(local).status,'none');
});
test('explicit null containers are malformed, never treated as empty progress',()=>{
  for(const part of ['vet','tas','review']){
    const file=backup();file.data[part].records=null;assert.throws(()=>parseBackup(file));
    const local=fixture(),value=JSON.parse(local.getItem(KEYS[part]));value.records=null;local.values.set(KEYS[part],json(value));assert.throws(()=>snapshot(local));
  }
});
test('long existing working notes are preserved without truncation',()=>{
  const local=fixture(),value=JSON.parse(local.getItem(KEYS.tas)),note='Long existing working note. '.repeat(100);
  value.records['task::2026'].exceptionReason=note;local.values.set(KEYS.tas,json(value));
  const file=backup(local);assert.equal(file.data.tas.records['task::2026'].exceptionReason,note);
  const destination=new Storage(),plan=buildImportPlan(destination,file,{firstConnection:true});atomicApply(destination,plan.before,plan.after);
  assert.equal(JSON.parse(destination.getItem(KEYS.tas)).records['task::2026'].exceptionReason,note);
});
test('long gap references and verifier labels survive the same team roundtrip',()=>{
  const local=fixture(),value=JSON.parse(local.getItem(KEYS.vet)),reference='Existing gap reference. '.repeat(100),verifier='Authorised verifier '.repeat(20);
  value.gaps.gap.reference=reference;value.gaps.gap.verifier=verifier;local.values.set(KEYS.vet,json(value));
  const file=backup(local),destination=new Storage(),plan=buildImportPlan(destination,file,{firstConnection:true});atomicApply(destination,plan.before,plan.after);
  const gap=JSON.parse(destination.getItem(KEYS.vet)).gaps.gap;assert.equal(gap.reference,reference);assert.equal(gap.verifier,verifier);
});
test('matching local private dependency links and task-help links survive incoming progress',()=>{
  const local=fixture(),file=backup(local),plan=buildImportPlan(local,file,{firstConnection:true});atomicApply(local,plan.before,plan.after);
  const actual=JSON.parse(local.getItem(KEYS.inbox)).items[0];
  assert.ok(actual.dependsOn.includes('email:private-key'));assert.equal(actual.taskHelp.links[0].url,'https://private.example/help');
});
test('competing import journal is never removed or overwritten during failure recovery',()=>{
  const local=fixture(),plan=buildImportPlan(local,backup(),{firstConnection:true});const set=local.setItem.bind(local);
  local.setItem=(key,value)=>{set(key,value);if(key===KEYS.journal){const competing=JSON.parse(value);competing.transactionId='other-tab';local.values.set(key,json(competing));}};
  const before=readRaw(local);assert.throws(()=>atomicApply(local,plan.before,plan.after),error=>error.recoveryRequired===true);
  assert.deepEqual(readRaw(local),before);assert.equal(JSON.parse(local.getItem(KEYS.journal)).transactionId,'other-tab');
});
test('a committed import with cleanup failure stays committed and can clean up safely',()=>{
  const local=fixture(),file=backup();file.data.vet.records={};file.data.tas.records={};file.data.review.records={};file.data.inbox.items=[];
  const plan=buildImportPlan(local,file,{firstConnection:true});plan.before[KEYS.metadata]=null;plan.after[KEYS.metadata]=json({version:1,lastFile:{revision:1}});
  local.failAt=8;assert.deepEqual(atomicApply(local,plan.before,plan.after),{committed:true,cleanupPending:true});
  for(const [key,value] of Object.entries(plan.after))assert.equal(local.getItem(key),value);
  assert.equal(JSON.parse(local.getItem(KEYS.journal)).phase,'committed');assert.equal(recoverTransaction(local).status,'committed');
});
test('origin reconciliation keeps local task keys and repairs incoming dependency aliases',()=>{
  const local=fixture(),file=backup(local),vet=file.data.inbox.items[0],tas=file.data.inbox.items[1];
  vet.taskKey='workboard:vet:other-valid-key';vet.noteText='Incoming content';tas.dependsOn=[vet.taskKey];
  const plan=buildImportPlan(local,file,{firstConnection:true});atomicApply(local,plan.before,plan.after);
  const actual=validateInbox(local.getItem(KEYS.inbox));
  assert.equal(actual.items.filter(item=>item.origin?.recordKey==='task::2026'&&item.workstream==='vet').length,1);
  assert.equal(actual.items.find(item=>item.id==='vet-local').taskKey,'workboard:vet:task::2026');
  assert.deepEqual(actual.items.find(item=>item.id==='tas-local').dependsOn,['workboard:vet:task::2026']);
});
test('event occurrences, checklist history and planning dates transfer without manufacturing verification',()=>{
  const local=fixture(),value=JSON.parse(local.getItem(KEYS.vet));
  value.eventOccurrences=[{id:'2027-event-source-check-one',templateId:'source-check',workflowId:'team-review',createdAt:'2027-03-01T01:00:00.000Z',term:1}];
  value.records['2027-event-source-check-one']={status:'in-progress',stepChecks:{0:true},history:[{when:'2027-03-01T01:01:00.000Z',action:'First step checked'}]};
  local.values.set(KEYS.vet,json(value));const file=backup(local),destination=new Storage(),plan=buildImportPlan(destination,file,{firstConnection:true});atomicApply(destination,plan.before,plan.after);
  const actual=JSON.parse(destination.getItem(KEYS.vet));assert.deepEqual(actual.eventOccurrences,value.eventOccurrences);assert.deepEqual(actual.records['2027-event-source-check-one'],value.records['2027-event-source-check-one']);
  assert.equal(own(actual.records['2027-event-source-check-one'],'sourceChecked'),false);assert.equal(own(actual.records['2027-event-source-check-one'],'doneWhenConfirmed'),false);
  assert.deepEqual(JSON.parse(destination.getItem(KEYS.tas)).scheduleOverrides,JSON.parse(local.getItem(KEYS.tas)).scheduleOverrides);
});
