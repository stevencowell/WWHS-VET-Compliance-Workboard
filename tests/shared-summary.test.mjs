import test from 'node:test';
import assert from 'node:assert/strict';
import {INBOX_KEY,enrich,validateInbox,mergeInbox,workboardTaskKey,createTrackedWork,taskSection,mergeWorkboardImports,clearEmailImports,reconcileForecast} from '../morning-launchpad/assets/summary-core.mjs';

const descriptor=(changes={})=>({wing:'vet',taskId:'annual-review',recordKey:'annual-review::2026',title:'Review delivery',action:'Check the delivery plan',notes:'Keep the existing evidence reference.',dueDate:'2026-09-30',waitingOn:'',status:'review',cycle:'2026',route:'#task/annual-review',...changes});
const forecastContext=(changes={})=>({wing:'vet',date:'2026-09-17',year:2026,sourceYear:2026,role:'htvet',roleLabel:'Head Teacher VET',sourceAsAt:'2026-09-01',horizonDays:21,mode:'current',title:'Current scheduled work',note:'From the recorded schedule',...changes});
const scheduled=(changes={},forecast={})=>descriptor({...changes,forecast:{section:'ready',kind:'term-window',reason:'Scheduled in this term',scheduledDate:'2026-09-17',windowStart:'2026-09-01',windowEnd:'2026-09-30',period:'Term 3',sourceStatus:'not-started',blocked:false,blockerReason:'',...forecast}});

test('legacy backups gain personal classification without changing their content or keys',()=>{
  const saved={version:1,items:[{id:'old',title:'My old task',action:'Check it',status:'done',source:'Original source',score:2,group:'ready',links:[],url:''}]};
  const result=validateInbox(JSON.stringify(saved));
  assert.equal(INBOX_KEY,'morning-launchpad-summary:v1');
  assert.equal(result.items[0].workstream,'personal');assert.equal(result.items[0].origin,null);
  assert.equal(result.items[0].status,'done');assert.equal(result.items[0].source,'Original source');
  assert.deepEqual(result.workboardImports,[]);
});

test('linked work has an exact source identity, conservative dates and the existing queue states',async()=>{
  const item=await createTrackedWork(descriptor());
  assert.equal(item.taskKey,'workboard:vet:annual-review::2026');assert.equal(item.workstream,'vet');
  assert.deepEqual(item.origin,{wing:'vet',taskId:'annual-review',recordKey:'annual-review::2026',route:'#task/annual-review',cycle:'2026'});
  assert.equal(item.noteText,'Keep the existing evidence reference.');
  assert.equal(taskSection(item,'2026-09-17'),'upcoming');
  for(const status of ['done','completed','verified'])assert.equal((await createTrackedWork(descriptor({status}))).status,'done');
  for(const status of ['waiting','blocked'])assert.equal(taskSection(await createTrackedWork(descriptor({status,dueDate:null})),'2026-09-17'),'waiting');
  assert.equal((await createTrackedWork(descriptor({dueDate:'tomorrow'}))).dueDate,null);
  assert.equal((await createTrackedWork(descriptor({dueDate:'2026-02-30'}))).dueDate,null);
});

test('long workboard identities are deterministic, bounded and separated across wings and cycles',async()=>{
  const long='task:'.repeat(100);
  const key=await workboardTaskKey('vet',long);
  assert.ok(key.length<=150);assert.equal(key,await workboardTaskKey('vet',long));
  assert.notEqual(key,await workboardTaskKey('tas',long));assert.notEqual(key,await workboardTaskKey('vet',long+'2027'));
  assert.notEqual(key,await workboardTaskKey('vet',key.slice('workboard:vet:'.length)));
});

test('invalid imported workstream or origin metadata is rejected before saving',async()=>{
  const item=await createTrackedWork(descriptor());
  for(const change of [{workstream:'admin'},{origin:{...item.origin,wing:'evil'}},{origin:{...item.origin,route:'https://example.org/'}},{origin:{...item.origin,route:'#task/one\nscript'}},{origin:{...item.origin,recordKey:''}}]){
    assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...item,...change}]})),/Check the details for this task/);
  }
  await assert.rejects(()=>createTrackedWork(descriptor({route:'javascript:alert(1)'})),/link to the original workboard task could not be read/);
});

test('same-titled tasks from different workboards and cycles cannot merge accidentally',async()=>{
  const vet=await createTrackedWork(descriptor());
  const tas=await createTrackedWork(descriptor({wing:'tas'}));
  const nextYear=await createTrackedWork(descriptor({recordKey:'annual-review::2027',cycle:'2027'}));
  const result=mergeInbox([vet],[tas,nextYear]);
  assert.equal(result.items.length,3);assert.equal(result.added,2);
  const mail=enrich({id:'mail',taskKey:'mail-source',title:vet.title,action:vet.action});
  assert.equal(mergeInbox(result.items,[mail]).items.length,4);
});

test('reimports retain saved classification, source identity, notes, pins and completion',async()=>{
  const item=await createTrackedWork(descriptor());
  Object.assign(item,{workstream:'tas',noteText:'My edited draft',pinnedDate:'2026-09-17',status:'done',dirty:['workstream','noteText']});
  const older={...item,title:'Refreshed title',noteText:'Older draft'};delete older.workstream;delete older.origin;
  const imported=validateInbox(JSON.stringify({version:2,items:[older]}));
  const merged=mergeInbox([item],imported.items).items[0];
  assert.equal(merged.workstream,'tas');assert.deepEqual(merged.origin,item.origin);assert.equal(merged.noteText,'My edited draft');
  assert.equal(merged.status,'done');assert.equal(merged.pinnedDate,'2026-09-17');assert.equal(merged.id,item.id);
  assert.deepEqual(validateInbox(JSON.stringify({version:2,items:[merged]})).items[0],JSON.parse(JSON.stringify(merged)));
});

// Exercise the actual public component API and compare-before-write storage
// contract without mounting a browser or accessing any real saved work.
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

test('trackWork is idempotent and never overwrites existing reviewed work or native records',async()=>{
  const {list,stored}=component();stored.set('wwhs-vet-compliance-workboard:v3','untouched native records');
  let events=0;const saved=()=>events++;window.addEventListener('wwhs:work-saved',saved);
  try{
    const first=await list.trackWork(descriptor(),{silent:true});
    assert.deepEqual(JSON.parse(stored.get(INBOX_KEY)).workboardImports,['vet:annual-review::2026']);
    Object.assign(first,{noteText:'Reviewed note',status:'done',pinnedDate:'2026-09-17',workstream:'tas'});
    assert.equal(list.persist(list.inbox),true);const raw=stored.get(INBOX_KEY);const count=events;
    const again=await list.trackWork(descriptor({notes:'Stale source note',status:'review'}),{silent:true});
    assert.equal(again.id,first.id);assert.equal(again.noteText,'Reviewed note');assert.equal(again.status,'done');assert.equal(again.workstream,'tas');
    assert.equal(stored.get(INBOX_KEY),raw);assert.equal(events,count);assert.equal(list.inbox.items.length,1);
    assert.equal(stored.get('wwhs-vet-compliance-workboard:v3'),'untouched native records');
  }finally{window.removeEventListener('wwhs:work-saved',saved);}
});

test('trackWork fails safely for changed-tab state, invalid notes and full lists',async()=>{
  const {list,stored}=component();
  const other=JSON.stringify({version:2,items:[],briefing:'Saved in another tab'});stored.set(INBOX_KEY,other);
  await assert.rejects(()=>list.trackWork(descriptor(),{silent:true}),/could not be saved/);
  assert.equal(stored.get(INBOX_KEY),other);assert.equal(list.blocked,true);assert.equal(list.reloadButton.hidden,false);
  const fresh=component();
  await assert.rejects(()=>fresh.list.trackWork(descriptor({notes:'x'.repeat(200001)}),{silent:true}),/Check the details for this task/);
  assert.equal(fresh.stored.get(INBOX_KEY),undefined);
  fresh.list.inbox.items=Array.from({length:300},(_,i)=>enrich({id:String(i),title:'Existing '+i,action:'Keep this work'}));
  assert.equal(fresh.list.persist(fresh.list.inbox),true);const full=fresh.stored.get(INBOX_KEY);
  await assert.rejects(()=>fresh.list.trackWork(descriptor(),{silent:true}),/300 items.*Save a backup/);
  assert.equal(fresh.stored.get(INBOX_KEY),full);assert.equal(fresh.list.inbox.items.length,300);
});

test('workboard import markers validate, union on restore and survive deliberate clear',async()=>{
  const markers=['vet:annual-review::2026','tas:staff-review::2026'];
  const inbox=validateInbox(JSON.stringify({version:2,items:[await createTrackedWork(descriptor()),enrich({id:'email',title:'Fw: Email',action:'Reply'})],workboardImports:markers}));
  const cleared=clearEmailImports(inbox);
  assert.equal(cleared.items.length,1);assert.deepEqual(cleared.items[0],inbox.items[0]);assert.deepEqual(cleared.workboardImports,markers);assert.equal(cleared.pinWorkflowVersion,1);
  assert.deepEqual(validateInbox(JSON.stringify(cleared)).workboardImports,markers);
  assert.deepEqual(mergeWorkboardImports(markers,['tas:staff-review::2026','vet:other::2027']),[...markers,'vet:other::2027']);
  for(const workboardImports of [null,'vet:task',['other:task'],['vet:'],[123],Array.from({length:2001},(_,i)=>`vet:${i}`)])assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[],workboardImports})),/history of imported workboard tasks/);
});

test('marking an existing linked item is atomic and leaves its reviewed fields unchanged',async()=>{
  const {list,stored}=component();const item=await createTrackedWork(descriptor());
  Object.assign(item,{noteText:'Preserve my draft',status:'done'});list.inbox.items=[item];assert.equal(list.persist(list.inbox),true);
  let writes=0;const originalSet=localStorage.setItem;localStorage.setItem=(key,value)=>{writes++;originalSet(key,value);};
  const saved=await list.trackWork(descriptor(),{silent:true});
  assert.equal(writes,1);assert.equal(saved.noteText,'Preserve my draft');assert.equal(saved.status,'done');assert.equal(saved.id,item.id);
  assert.deepEqual(JSON.parse(stored.get(INBOX_KEY)).workboardImports,['vet:annual-review::2026']);
  const raw=stored.get(INBOX_KEY);localStorage.setItem=()=>{throw new Error('Quota exceeded');};
  await assert.rejects(()=>list.trackWork(descriptor({recordKey:'another::2026'}),{silent:true}),/could not be saved/);
  assert.equal(stored.get(INBOX_KEY),raw);assert.deepEqual(list.inbox.workboardImports,['vet:annual-review::2026']);assert.equal(list.inbox.items.length,1);
});

test('restoring a task backup unions migration history without erasing current deletion markers',()=>{
  const {list,stored}=component();list.inbox.workboardImports=['vet:kept-deleted::2026'];
  Object.assign(list,{paste:{value:''},inputDetails:{open:true},syncPlans(){},nav:{scrollIntoView(){}}});
  list.importData({items:[],workboardImports:['tas:restored::2026']});
  assert.deepEqual(JSON.parse(stored.get(INBOX_KEY)).workboardImports,['vet:kept-deleted::2026','tas:restored::2026']);
  list.importData({items:[]});
  assert.deepEqual(JSON.parse(stored.get(INBOX_KEY)).workboardImports,['vet:kept-deleted::2026','tas:restored::2026']);
});

test('forecast creates current source work automatically and repeated snapshots are true no-ops',async()=>{
  const snapshot={entries:[scheduled()],context:forecastContext()};
  const first=await reconcileForecast(validateInbox(null),snapshot);
  assert.equal(first.added,1);assert.equal(first.changed,true);
  const item=first.inbox.items[0];assert.equal(item.forecast.managed,true);assert.equal(item.forecast.active,true);
  assert.equal(taskSection(item,'2026-09-17'),'ready');assert.equal(item.origin.recordKey,'annual-review::2026');
  assert.deepEqual(first.inbox.workboardImports,['vet:annual-review::2026']);
  const repeated=await reconcileForecast(first.inbox,snapshot);assert.equal(repeated.changed,false);assert.equal(repeated.updated,0);
  assert.equal(repeated.inbox.items[0].id,item.id);
});

test('forecast updates pristine next steps but preserves user fields, all note text and manual progress',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:forecastContext()});
  const old=first.inbox.items[0];old.noteText='A draft I must keep';old.noteHtml='<p>A draft I must keep</p>';
  const next=await reconcileForecast(first.inbox,{entries:[scheduled({action:'Check the next unchecked step',title:'Updated official task',dueDate:'2026-09-29',notes:'Replacement source notes'})],context:forecastContext()});
  assert.equal(next.inbox.items[0].action,'Check the next unchecked step');assert.equal(next.inbox.items[0].title,'Updated official task');
  assert.equal(next.inbox.items[0].noteText,old.noteText);assert.equal(next.inbox.items[0].noteHtml,old.noteHtml);
  const edited=next.inbox.items[0];Object.assign(edited,{action:'My own next step',dueDate:'2026-10-20',dirty:['action','dueDate'],status:'done',pinnedDate:'2026-09-17',progressOverride:true});
  const result=await reconcileForecast(next.inbox,{entries:[scheduled({action:'Later source step',dueDate:'2026-09-28'})],context:forecastContext()});
  assert.equal(result.inbox.items[0].action,'My own next step');assert.equal(result.inbox.items[0].dueDate,'2026-10-20');
  assert.equal(result.inbox.items[0].pinnedDate,'2026-09-17');assert.equal(taskSection(result.inbox.items[0],'2026-09-17'),'done');
});

test('off-horizon auto cards become history, while edited and manually tracked work remains usable',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:forecastContext()});
  const retired=await reconcileForecast(first.inbox,{entries:[],context:forecastContext()});
  assert.equal(retired.retired,1);assert.equal(retired.inbox.items.length,1);assert.equal(taskSection(retired.inbox.items[0],'2026-09-17'),'notes');
  assert.match(retired.inbox.items[0].forecast.reason,/history/);assert.equal(retired.inbox.items[0].noteText,first.inbox.items[0].noteText);
  const edited=structuredClone(first.inbox);edited.items[0].dirty=['noteText'];edited.items[0].noteText='My own work';
  const kept=await reconcileForecast(edited,{entries:[],context:forecastContext()});assert.equal(taskSection(kept.inbox.items[0],'2026-09-17'),'upcoming');
  const manual=await createTrackedWork(descriptor());
  const adopted=await reconcileForecast({...validateInbox(null),items:[manual]},{entries:[scheduled({action:'Source replacement'})],context:forecastContext()});
  assert.equal(adopted.inbox.items[0].forecast.managed,false);assert.equal(adopted.inbox.items[0].action,manual.action);
  const absent=await reconcileForecast(adopted.inbox,{entries:[],context:forecastContext()});assert.equal(taskSection(absent.inbox.items[0],'2026-09-17'),'upcoming');
});

test('current blocked work remains Waiting despite a saved pin or old ready selection',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled({}, {section:'waiting',sourceStatus:'blocked',blocked:true,blockerReason:'Evidence check is still open'})],context:forecastContext()});
  const item=first.inbox.items[0];item.pinnedDate='2026-09-17';item.sectionOverride='ready';
  assert.equal(taskSection(item,'2026-09-17'),'waiting');item.sectionOverride='notes';assert.equal(taskSection(item,'2026-09-17'),'notes');item.status='done';assert.equal(taskSection(item,'2026-09-17'),'done');
});

test('resolved completion derives Done without rewriting personal status or creating off-horizon records',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:forecastContext()});
  const complete=await reconcileForecast(first.inbox,{entries:[],resolved:[descriptor({status:'completed'}),descriptor({recordKey:'unseen::2026',status:'verified'})],context:forecastContext()});
  assert.equal(complete.inbox.items.length,1);assert.equal(complete.inbox.items[0].status,'review');assert.equal(taskSection(complete.inbox.items[0],'2026-09-17'),'done');
  const missing=await reconcileForecast(complete.inbox,{entries:[],resolved:[],context:forecastContext()});assert.equal(taskSection(missing.inbox.items[0],'2026-09-17'),'done');
  const notApplicable=await reconcileForecast(first.inbox,{entries:[],resolved:[descriptor({status:'done',sourceStatus:'not-applicable'})],context:forecastContext()});
  assert.equal(taskSection(notApplicable.inbox.items[0],'2026-09-17'),'done');assert.equal(notApplicable.inbox.items[0].forecast.sourceStatus,'not-applicable');
  const reopened=await reconcileForecast(complete.inbox,{entries:[scheduled()],context:forecastContext()});assert.equal(taskSection(reopened.inbox.items[0],'2026-09-17'),'ready');
  const external=await reconcileForecast(first.inbox,{entries:[],resolved:[descriptor({status:'review',sourceStatus:'completed-externally'})],context:forecastContext()});
  assert.equal(external.inbox.items[0].status,'review','External completion never changes personal progress');
  assert.equal(taskSection(external.inbox.items[0],'2026-09-17'),'done');
  const unticked=await reconcileForecast(external.inbox,{entries:[scheduled()],context:forecastContext()});
  assert.equal(taskSection(unticked.inbox.items[0],'2026-09-17'),'ready','Unticking restores the original active task');
  complete.inbox.items[0].progressOverride=true;complete.inbox.items[0].sectionOverride='ready';assert.equal(taskSection(complete.inbox.items[0],'2026-09-17'),'ready');
});

test('forecast respects deletion markers, preserves other wings and never generates from an unavailable source',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:forecastContext()});
  const deleted={...first.inbox,items:[]};const suppressed=await reconcileForecast(deleted,{entries:[scheduled()],context:forecastContext()});
  assert.equal(suppressed.added,0);assert.equal(suppressed.suppressed,1);assert.equal(suppressed.inbox.items.length,0);
  for(const mode of ['reference-only','unavailable']){
    const result=await reconcileForecast(first.inbox,{entries:[scheduled()],context:forecastContext({mode})});
    assert.equal(result.skipped,true);assert.equal(result.changed,false);assert.strictEqual(result.inbox,first.inbox);
  }
  const tas=await createTrackedWork(descriptor({wing:'tas'}));const combined={...first.inbox,items:[...first.inbox.items,tas]};
  const result=await reconcileForecast(combined,{entries:[],context:forecastContext()});assert.deepEqual(result.inbox.items[1],tas);
  assert.equal(taskSection(first.inbox.items[0],'2026-09-18'),'notes');
});

test('forecast metadata is validated and survives task backups; unsafe batches never partially save',async()=>{
  const first=await reconcileForecast(validateInbox(null),{entries:[scheduled()],context:forecastContext()});
  assert.deepEqual(validateInbox(JSON.stringify(first.inbox)),first.inbox);
  for(const change of [{section:'made-up'},{scheduledDate:'2026-02-30'},{windowEnd:'2026-08-01'},{blocked:'yes'}]){
    await assert.rejects(()=>reconcileForecast(first.inbox,{entries:[scheduled({},change)],context:forecastContext()}),/saved task schedule could not be read/);
  }
  await assert.rejects(()=>reconcileForecast(first.inbox,{entries:[scheduled(),scheduled()],context:forecastContext()}),/same task appears twice/);
  const {list,stored}=component();assert.equal(list.persist(first.inbox),true);const raw=stored.get(INBOX_KEY);
  localStorage.setItem=()=>{throw new Error('Quota exceeded');};
  await assert.rejects(()=>list.syncForecast({entries:[scheduled({recordKey:'next::2026'})],context:forecastContext()}),/could not be saved/);
  assert.equal(stored.get(INBOX_KEY),raw);assert.equal(list.inbox.items.length,1);
});

test('forecast API defers focused drafts and concurrent local edits, and an unchanged snapshot makes no write',async()=>{
  const {list,stored}=component();list.contains=()=>true;
  const snapshot={entries:[scheduled()],context:forecastContext()};
  assert.equal((await list.syncForecast(snapshot)).deferred,true);assert.equal(stored.get(INBOX_KEY),undefined);
  list.contains=()=>false;
  const pending=list.syncForecast(snapshot);
  assert.equal(list.persist({...list.inbox,briefing:'Typed while forecast was preparing'}),true);
  assert.equal((await pending).deferred,true);assert.equal(list.inbox.briefing,'Typed while forecast was preparing');assert.equal(list.inbox.items.length,0);
  assert.equal((await list.syncForecast(snapshot)).added,1);let writes=0;const set=localStorage.setItem;localStorage.setItem=(key,value)=>{writes++;set(key,value);};
  assert.equal((await list.syncForecast(snapshot)).changed,false);assert.equal(writes,0);
});

test('unavailable source warnings update only static notices and preserve a focused draft and stored snapshot',async()=>{
  const {list,stored}=component();const snapshot={entries:[scheduled()],context:forecastContext()};await list.syncForecast(snapshot);
  const raw=stored.get(INBOX_KEY),saved=JSON.stringify(list.inbox),originalCreate=document.createElement,originalActive=document.activeElement;
  let notice,renders=0;const draft={value:'Keep this unsaved draft and caret'};
  document.createElement=tag=>({tag,children:[],dataset:{},textContent:'',setAttribute(name,value){if(name==='data-forecast-task')this.dataset.forecastTask=value;},append(...children){this.children.push(...children);},replaceWith(replacement){notice=replacement;}});
  const text=node=>[node.textContent,...node.children.map(text)].join(' ');
  try{
    notice=list.forecastNotice(list.inbox.items[0]);list.querySelectorAll=()=>[notice];list.renderItems=()=>renders++;
    document.activeElement=draft;list.contains=node=>node===draft;
    list.setForecastAvailability(forecastContext({mode:'unavailable',note:'The native records changed in another tab. Reload VET before refreshing.'}));
    assert.match(text(notice),/Saved schedule · could not update/);assert.match(text(notice),/native records changed/);
    assert.equal(renders,0);assert.strictEqual(document.activeElement,draft);assert.equal(draft.value,'Keep this unsaved draft and caret');
    assert.equal(stored.get(INBOX_KEY),raw);assert.equal(JSON.stringify(list.inbox),saved);
    list.setForecastAvailability(forecastContext());assert.match(text(notice),/could not update/);
    list.contains=()=>false;await list.syncForecast(snapshot);
    assert.doesNotMatch(text(notice),/could not update/);assert.equal(stored.get(INBOX_KEY),raw);assert.equal(renders,0);
  }finally{document.createElement=originalCreate;document.activeElement=originalActive;}
});

test('native source changes across reconciliation never commit a stale forecast or its import markers',async()=>{
  const {list,stored}=component();const key='wwhs-vet-compliance-workboard:v3';stored.set(key,'original native records');
  const snapshot={entries:[scheduled()],context:forecastContext(),sourceGuard:{key,raw:'original native records'}};
  const pending=list.syncForecast(snapshot);stored.set(key,'newer native records');
  const result=await pending;assert.equal(result.sourceChanged,true);assert.equal(result.deferred,true);assert.equal(result.changed,false);
  assert.equal(stored.get(INBOX_KEY),undefined);assert.equal(list.inbox.items.length,0);assert.deepEqual(list.inbox.workboardImports,[]);
  assert.equal((await list.syncForecast(snapshot)).sourceChanged,true);
  stored.set(key,'original native records');
  const reviewKey='wwhs-task-register-review:v1';
  const reviewSnapshot={...snapshot,sourceGuard:{...snapshot.sourceGuard,reviewRaw:null}};
  const pendingReview=list.syncForecast(reviewSnapshot);stored.set(reviewKey,'newer review ticks');
  assert.equal((await pendingReview).sourceChanged,true);assert.equal(stored.get(INBOX_KEY),undefined);
  const pendingUntick=list.syncForecast({...reviewSnapshot,sourceGuard:{...reviewSnapshot.sourceGuard,reviewRaw:'newer review ticks'}});stored.delete(reviewKey);
  assert.equal((await pendingUntick).sourceChanged,true);assert.equal(list.inbox.items.length,0);
  const read=localStorage.getItem;localStorage.getItem=target=>{if(target===key)throw new Error('Access unavailable');return read(target);};
  assert.equal((await list.syncForecast(snapshot)).sourceChanged,true);assert.equal(stored.get(INBOX_KEY),undefined);
});
