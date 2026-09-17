import test from 'node:test';
import assert from 'node:assert/strict';
import {INBOX_KEY,createTrackedWork,validateInbox,mergeInbox,reconcileForecast} from '../morning-launchpad/assets/summary-core.mjs';

const helpContext=(change={})=>({version:1,wing:'vet',taskId:'authority-check-t3',canonicalTaskId:'a-01-confirm-authority-set',title:'Check the controlling sources for Term 3',recordKey:'authority-check-t3::2026',cycle:'2026',asOf:'2026-09-17',sourceAsAt:'2026-08-26',sourceStatus:'in-progress',objective:'Record source versions and any evidence gaps.',nextStep:'Open the current timetable.',steps:['Open the current timetable.','Compare it with the recorded dates.'],roles:['VET Coordinator'],sources:['NESA Timetable of Actions'],links:[{label:'NESA',url:'https://www.nsw.gov.au/education-and-training/nesa/key-dates/timetable-of-actions'}],...change});
const descriptor=(change={},helpChange={})=>{
  const result={wing:'vet',taskId:'authority-check-t3',recordKey:'authority-check-t3::2026',title:'Check the controlling sources for Term 3',action:'Open the current timetable.',notes:'Keep my evidence reference.',dueDate:'2026-09-30',waitingOn:'',status:'review',sourceStatus:'in-progress',cycle:'2026',route:'#task/authority-check-t3',...change};
  result.taskHelp=helpContext({wing:result.wing,taskId:result.taskId,recordKey:result.recordKey,cycle:result.cycle,title:result.title,sourceStatus:result.sourceStatus,...helpChange});
  return result;
};
const context=(change={})=>({wing:'vet',date:'2026-09-17',year:2026,sourceYear:2026,role:'htvet',roleLabel:'Head Teacher VET',sourceAsAt:'2026-08-26',horizonDays:21,mode:'current',title:'Current scheduled work',note:'From the recorded schedule',...change});
const scheduled=(change={},helpChange={})=>({...descriptor(change,helpChange),forecast:{section:'ready',kind:'term-window',reason:'Scheduled in Term 3',scheduledDate:'2026-09-17',windowStart:'2026-09-01',windowEnd:'2026-09-30',period:'Term 3',sourceStatus:change.sourceStatus??'in-progress',blocked:false,blockerReason:''}});
const inboxFor=items=>validateInbox(JSON.stringify({version:2,items}));

test('tracked help is tied to the exact source occurrence while retaining its canonical profile identity',async()=>{
  const first=await createTrackedWork(descriptor());
  assert.deepEqual(first.taskHelp,helpContext());
  assert.equal(first.taskHelp.canonicalTaskId,'a-01-confirm-authority-set');
  assert.notEqual(first.taskHelp.taskId,first.taskHelp.canonicalTaskId);
  for(const [field,value] of Object.entries({wing:'tas',taskId:'different-task',recordKey:'authority-check-t3::2027',cycle:'2027'})){
    await assert.rejects(()=>createTrackedWork(descriptor({}, {[field]:value})),/does not match its source task/);
  }
  const tas=await createTrackedWork(descriptor({wing:'tas',taskId:'staff-check',recordKey:'staff-check::2026',route:'#task/staff-check'},{canonicalTaskId:'staff-check'}));
  assert.equal(tas.taskHelp.wing,'tas');assert.equal(tas.taskHelp.taskId,tas.origin.taskId);
  const legacy=descriptor();delete legacy.taskHelp;
  assert.equal((await createTrackedWork(legacy)).taskHelp,null);
});

test('task backup round-trips help, separate occurrences, custom guidance, notes and deletion history',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled(),scheduled({recordKey:'authority-check-t3::2027',cycle:'2027'})],context:context()});
  Object.assign(first.inbox.items[0],{help:'Prepare my comparison table exactly as requested.',noteText:'A personal draft',noteHtml:'<p>A personal draft</p>',action:'My reviewed next action',dirty:['action','noteText','noteHtml'],status:'done',pinnedDate:'2026-09-17'});
  first.inbox.workboardImports.push('tas:deliberately-deleted::2026');
  const exported=JSON.stringify(first.inbox,null,2);
  const restored=validateInbox(exported);
  assert.deepEqual(restored,first.inbox);
  assert.notEqual(restored.items[0].origin.recordKey,restored.items[1].origin.recordKey);
  assert.equal(restored.items[0].taskHelp.canonicalTaskId,restored.items[1].taskHelp.canonicalTaskId);
  restored.items[0].taskHelp.steps[0]='Changed in the restored copy';
  assert.equal(first.inbox.items[0].taskHelp.steps[0],'Open the current timetable.');
});

test('malformed imported help and mismatched native identities are rejected as whole backups',async()=>{
  const item=await createTrackedWork(descriptor()),original=JSON.stringify(item);
  for(const taskHelp of [[],{},helpContext({version:2}),helpContext({asOf:'2026-02-30'}),helpContext({nextStep:12}),helpContext({links:[{label:'Credentials',url:'https://user:secret@example.org/'}]}),helpContext({hiddenNotes:'Do not store arbitrary private state'}),helpContext({recordKey:'another-occurrence::2026'})]){
    assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...item,taskHelp}]})),/task help|source task/i);
  }
  assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...item,origin:null}]})),/source task/i);
  assert.equal(JSON.stringify(item),original);
});

test('forecast refresh advances recorded source help without overwriting a dirty personal action or notes',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:context()});
  const item=first.inbox.items[0];
  Object.assign(item,{action:'My own next action',noteText:'My working draft',noteHtml:'<p>My working draft</p>',help:'Keep the saved custom request.',dirty:['action','noteText','noteHtml'],status:'done',progressOverride:true});
  const before=JSON.stringify(first.inbox);
  const snapshot={entries:[scheduled({action:'Compare the newly checked sources',sourceStatus:'completed'},{nextStep:'Record the source comparison.',sourceStatus:'completed'})],context:context()};
  const result=await reconcileForecast(first.inbox,snapshot),refreshed=result.inbox.items[0];
  assert.equal(result.updated,1);assert.equal(refreshed.taskHelp.nextStep,'Record the source comparison.');assert.equal(refreshed.taskHelp.sourceStatus,'completed');
  assert.equal(refreshed.action,'My own next action');assert.equal(refreshed.noteText,'My working draft');assert.equal(refreshed.noteHtml,'<p>My working draft</p>');assert.equal(refreshed.help,'Keep the saved custom request.');
  assert.equal(refreshed.status,'done');assert.equal(refreshed.progressOverride,true);assert.equal(JSON.stringify(first.inbox),before);
  assert.equal((await reconcileForecast(result.inbox,snapshot)).changed,false);
});

test('resolved manual work refreshes its help without acquiring a forecast or changing personal work',async()=>{
  const item=await createTrackedWork(descriptor());
  Object.assign(item,{action:'My manual plan',noteText:'My draft',dirty:['action','noteText'],pinnedDate:'2026-09-17'});
  const before=inboxFor([item]),snapshot={entries:[],resolved:[descriptor({action:'A source action I have not chosen'},{nextStep:'Review the next source requirement.',asOf:'2026-09-18'})],context:context({date:'2026-09-18'})};
  const result=await reconcileForecast(before,snapshot),refreshed=result.inbox.items[0];
  assert.equal(result.added,0);assert.equal(result.updated,1);assert.equal(refreshed.forecast,null);
  assert.equal(refreshed.action,'My manual plan');assert.equal(refreshed.noteText,'My draft');assert.equal(refreshed.pinnedDate,'2026-09-17');
  assert.equal(refreshed.taskHelp.nextStep,'Review the next source requirement.');assert.equal(refreshed.taskHelp.asOf,'2026-09-18');
  assert.equal((await reconcileForecast(result.inbox,snapshot)).changed,false);
  const missing=await reconcileForecast(result.inbox,{entries:[],resolved:[],context:context({date:'2026-09-18'})});
  assert.deepEqual(missing.inbox.items[0].taskHelp,refreshed.taskHelp);
});

test('a forecast with wrong help occurrence fails atomically and preserves the original task snapshot',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:context()}),before=JSON.stringify(first.inbox);
  await assert.rejects(()=>reconcileForecast(first.inbox,{entries:[scheduled({action:'First candidate would update'}),scheduled({recordKey:'new-occurrence::2026'},{recordKey:'wrong-occurrence::2026'})],context:context()}),/source task/);
  assert.equal(JSON.stringify(first.inbox),before);
});

test('legacy reimports preserve saved native help and origin without attaching another occurrence help',async()=>{
  const old=await createTrackedWork(descriptor());Object.assign(old,{action:'My edited action',dirty:['action'],status:'done',pinnedDate:'2026-09-17'});
  const legacy={...old,id:'incoming-copy',action:'Older suggested action'};delete legacy.taskHelp;delete legacy.origin;delete legacy.forecast;delete legacy.workstream;
  const incoming=validateInbox(JSON.stringify({version:1,items:[legacy]}));
  const merged=mergeInbox([old],incoming.items).items[0];
  assert.deepEqual(merged.taskHelp,old.taskHelp);assert.deepEqual(merged.origin,old.origin);assert.equal(merged.action,'My edited action');assert.equal(merged.status,'done');assert.equal(merged.pinnedDate,'2026-09-17');
  assert.deepEqual(inboxFor([merged]).items[0],JSON.parse(JSON.stringify(merged)));
  const oldWithoutHelp={...old,taskHelp:null},wrong=await createTrackedWork(descriptor({recordKey:'authority-check-t3::2027',cycle:'2027'}));
  wrong.taskKey=old.taskKey;
  const protectedItem=mergeInbox([oldWithoutHelp],[wrong]).items[0];
  assert.deepEqual(protectedItem.origin,old.origin);assert.equal(protectedItem.taskHelp,null);
  assert.doesNotThrow(()=>inboxFor([protectedItem]));
});

// Use the real component API with isolated in-memory storage. No DOM mounting,
// native records, browser profile or personal saved data is involved.
const elements=new Map();
globalThis.HTMLElement=class {};
globalThis.customElements={define(name,element){elements.set(name,element);}};
globalThis.document={activeElement:null};
globalThis.window=new EventTarget();
if(!globalThis.CustomEvent)globalThis.CustomEvent=class extends Event{constructor(name,options){super(name);this.detail=options.detail;}};
await import('../morning-launchpad/assets/summary-import.mjs');
const SummaryImport=elements.get('summary-import');
function component(){
  const stored=new Map();globalThis.localStorage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)};
  const list=new SummaryImport();Object.assign(list,{started:true,blocked:false,raw:null,inbox:validateInbox(null),reloadButton:{hidden:true},contains:()=>false,querySelectorAll:()=>[],renderItems(){},say(message){this.message=message;}});
  return {list,stored};
}

test('retracking an existing occurrence refreshes only its help in one write and then becomes a no-op',async()=>{
  const {list,stored}=component(),first=await list.trackWork(descriptor(),{silent:true});
  Object.assign(first,{action:'My own action',noteText:'My own draft',help:'Keep custom guidance.',dirty:['action','noteText'],status:'done',pinnedDate:'2026-09-17',workstream:'personal'});assert.equal(list.persist(list.inbox),true);
  const savedBefore=structuredClone(list.inbox.items[0]);let writes=0;const write=localStorage.setItem;localStorage.setItem=(key,value)=>{writes++;write(key,value);};
  const refreshedDescriptor=descriptor({action:'New source action',notes:'Do not replace the draft',status:'review'},{nextStep:'Check the new source step.',asOf:'2026-09-18'});
  const refreshed=await list.trackWork(refreshedDescriptor,{silent:true});
  assert.equal(writes,1);assert.equal(refreshed.taskHelp.nextStep,'Check the new source step.');assert.equal(refreshed.id,first.id);
  assert.deepEqual({...refreshed,taskHelp:null},{...savedBefore,taskHelp:null});assert.equal(list.inbox.items.length,1);
  assert.deepEqual(JSON.parse(stored.get(INBOX_KEY)).workboardImports,['vet:authority-check-t3::2026']);
  const raw=stored.get(INBOX_KEY);await list.trackWork(refreshedDescriptor,{silent:true});assert.equal(writes,1);assert.equal(stored.get(INBOX_KEY),raw);
});

test('failed help refresh leaves saved help and all personal work intact',async()=>{
  const {list,stored}=component();await list.trackWork(descriptor(),{silent:true});
  const raw=stored.get(INBOX_KEY),before=JSON.stringify(list.inbox);
  localStorage.setItem=()=>{throw new Error('Quota exceeded');};
  await assert.rejects(()=>list.trackWork(descriptor({}, {nextStep:'A newer source step'}),{silent:true}),/could not be saved/);
  assert.equal(stored.get(INBOX_KEY),raw);assert.equal(JSON.stringify(list.inbox),before);
  await assert.rejects(()=>list.trackWork(descriptor({}, {recordKey:'wrong::2026'}),{silent:true}),/source task/);
  assert.equal(stored.get(INBOX_KEY),raw);assert.equal(JSON.stringify(list.inbox),before);
});

test('help retracking respects newer local edits and refuses changed-tab storage',async()=>{
  const {list,stored}=component();await list.trackWork(descriptor(),{silent:true});
  const pending=list.trackWork(descriptor({}, {nextStep:'A newer source step'}),{silent:true});
  assert.equal(list.persist({...list.inbox,items:list.inbox.items.map(item=>({...item,action:'Edited while help was preparing',dirty:['action']}))}),true);
  const refreshed=await pending;assert.equal(refreshed.action,'Edited while help was preparing');assert.equal(refreshed.taskHelp.nextStep,'A newer source step');
  const originalHelp=structuredClone(refreshed.taskHelp),otherTab=JSON.stringify({...list.inbox,briefing:'Saved by the other tab'});stored.set(INBOX_KEY,otherTab);
  await assert.rejects(()=>list.trackWork(descriptor({}, {nextStep:'An even newer source step'}),{silent:true}),/could not be saved/);
  assert.equal(stored.get(INBOX_KEY),otherTab);assert.deepEqual(list.inbox.items[0].taskHelp,originalHelp);assert.equal(list.blocked,true);
});
