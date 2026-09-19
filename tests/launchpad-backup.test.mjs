import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {enrich,validateInbox} from '../morning-launchpad/assets/summary-core.mjs';
import {normalEvent} from '../morning-launchpad/assets/calendar-core.mjs';
import {BACKUP_KEYS as K,RESTORE_KEY,MAX_BACKUP_BYTES,createLaunchpadBackup,parseLaunchpadBackup,planLaunchpadRestore,launchpadContent,snapshotLaunchpad} from '../morning-launchpad/assets/launchpad-backup.mjs';
import {applyLaunchpadRestore,recoverLaunchpadRestore,readLaunchpadRecovery,readPreviousLaunchpadBackup} from '../morning-launchpad/assets/launchpad-backup-transaction.mjs';
import {createNotesBackupTracker} from '../morning-launchpad/assets/backup-reminder.mjs';
import {snapshot as teamSnapshot} from '../assets/js/team-handover-core.mjs';
const json=JSON.stringify,clone=structuredClone;
const note=(id,extra={})=>enrich({id,taskKey:`personal:${id}`,title:`Synthetic ${id}`,action:'A useful next step',personal:true,status:'done',noteText:'café 日本語 🐟',noteHtml:'<p><b>Rich note 🐟</b></p>',...extra});
const tasks=items=>({version:2,items,briefing:'Synthetic briefing',pinWorkflowVersion:1,workboardImports:[],forecastContexts:{}});
const event=(id,extra={})=>normalEvent({id,uid:`calendar:${id}`,title:`Event ${id}`,startDate:'2026-09-21',endDate:'2026-09-21',...extra});
const plans=()=>({version:1,days:{'2026-09-19':{commitment:'Keep it calm',capacity:'small',closed:false,tasks:[{id:'old-task',title:'One old task',state:'done'}]}}});
function storage(entries={}){const values=new Map(Object.entries(entries));return {values,attempts:[],fail:null,getItem:key=>values.get(key)??null,setItem(key,value){this.attempts.push(key);this.fail?.(key,value);values.set(key,value);},removeItem:key=>values.delete(key)};}
function fixture(){return storage({[K.inbox]:json(tasks([note('one')])),[K.calendar]:json({version:1,events:[event('one')]}),[K.plans]:json(plans()),[K.links]:json([{id:'course',name:'Course',url:'https://example.test/course'}]),[K.theme]:'dark','unrelated-private':'Must stay private and untouched'});}
function options(){return {locks:{request:async(name,opts,fn)=>fn({name})},createId:()=> 'synthetic-restore',backend:{records:new Map(),async put(body){this.records.set(body.transactionId,clone(body));},async savePrevious(body){this.records.set('previous-launchpad-copy',clone({...body,transactionId:'previous-launchpad-copy'}));},async get(id){return clone(this.records.get(id));},async delete(id){this.records.delete(id);}}};}
test('one private file preserves every Launchpad record and excludes unrelated/Finance/native team records',()=>{
  const source=fixture(),backup=createLaunchpadBackup(source),opened=parseLaunchpadBackup(json(backup));
  assert.deepEqual(opened.records,snapshotLaunchpad(source));assert.equal(opened.legacy,false);
  assert.doesNotMatch(json(backup),/unrelated-private|Must stay private/);
  const empty=storage(),plan=planLaunchpadRestore(empty,opened);
  assert.deepEqual(plan.after,opened.records);assert.equal(plan.counts.added,5);
});
test('a near-limit Unicode inbox produces a valid reopenable file even when UTF-8 exceeds the old byte limit',()=>{
  const html='<p>'+'語'.repeat(995000)+'</p>',s=storage({[K.inbox]:json(tasks(Array.from({length:7},(_,i)=>note(`large-${i}`,{noteHtml:html}))))});
  const raw=json(createLaunchpadBackup(s));assert.ok(Buffer.byteLength(raw)>20000000);assert.ok(Buffer.byteLength(raw)<=MAX_BACKUP_BYTES);
  const opened=parseLaunchpadBackup(raw);assert.equal(opened.records[K.inbox],s.getItem(K.inbox));
});
test('opening the app on a fresh device does not add empty-device metadata to a restored backup',()=>{
  const backup=parseLaunchpadBackup(json(createLaunchpadBackup(fixture()))),fresh=storage({[K.inbox]:json({...validateInbox(null),pinWorkflowVersion:1})});
  assert.deepEqual(planLaunchpadRestore(fresh,backup).after,backup.records);
});
test('legacy routine text and saved links are preserved without imposing new per-field truncation limits',()=>{
  const s=fixture(),old=plans();old.days['2026-09-19'].commitment='Legacy text '.repeat(2500);old.days['2026-09-19'].tasks[0].title='Saved work '.repeat(2500);s.setItem(K.plans,json(old));
  s.setItem(K.links,json(Array.from({length:55},(_,i)=>({id:`saved-${i}`,name:'Long saved name '.repeat(150),url:'https://example.test/'+ 'a'.repeat(2500)}))));
  const parsed=parseLaunchpadBackup(json(createLaunchpadBackup(s)));assert.equal(parsed.records[K.plans],s.getItem(K.plans));assert.equal(parsed.records[K.links],s.getItem(K.links));
});
test('default restore preserves matching edits/done/rich HTML and every browser-only task/date/day/link',()=>{
  const current=fixture(),other=fixture();
  other.setItem(K.inbox,json(tasks([note('one',{status:'review',noteText:'Changed on another device',noteHtml:'<p>New HTML</p>'}),note('two')])));
  other.setItem(K.calendar,json({version:1,events:[event('one',{description:'Changed event'}),event('two')]}));
  current.setItem(K.inbox,json(tasks([note('one'),note('browser-only')])));
  const plan=planLaunchpadRestore(current,parseLaunchpadBackup(json(createLaunchpadBackup(other))));
  const saved=JSON.parse(plan.after[K.inbox]);assert.deepEqual(saved.items[0],note('one'));assert.equal(saved.items.length,3);
  assert.equal(JSON.parse(plan.after[K.calendar]).events[0].description,'');assert.equal(plan.counts.different,2);assert.equal(plan.counts.kept,2);
  assert.equal(current.getItem('unrelated-private'),'Must stay private and untouched');assert.deepEqual(current.attempts,[K.inbox]);
});
test('explicit backup preference restores differing versions but retains browser-only records and old-day tasks',()=>{
  const current=fixture(),other=fixture();current.setItem(K.inbox,json(tasks([note('one'),note('browser-only')])));
  other.setItem(K.inbox,json(tasks([note('one',{status:'review',noteText:'Chosen newer copy'})])));
  const nextPlans=plans();nextPlans.days['2026-09-19'].tasks=[{id:'new-task',title:'Another device task',state:'todo'}];nextPlans.days['2026-09-19'].commitment='New commitment';other.setItem(K.plans,json(nextPlans));
  const plan=planLaunchpadRestore(current,parseLaunchpadBackup(json(createLaunchpadBackup(other))),{preferBackup:true});
  assert.equal(JSON.parse(plan.after[K.inbox]).items[0].noteText,'Chosen newer copy');assert.equal(JSON.parse(plan.after[K.inbox]).items[0].status,'review');assert.equal(JSON.parse(plan.after[K.inbox]).items.length,2);
  assert.deepEqual(JSON.parse(plan.after[K.plans]).days['2026-09-19'].tasks.map(x=>x.id),['old-task','new-task']);
});
test('older task/calendar backups restore only their own records and never erase existing calendar or settings',()=>{
  const current=fixture();
  for(const raw of [json(tasks([note('two')])),json({version:1,events:[event('two')]})]){
    const backup=parseLaunchpadBackup(raw),plan=planLaunchpadRestore(current,backup);
    assert.ok(backup.legacy);for(const key of [K.plans,K.links,K.theme])assert.equal(plan.after[key],current.getItem(key));
    assert.equal(JSON.parse(plan.after[K.inbox]).items.length,backup.legacy==='tasks'?2:1);
    assert.equal(JSON.parse(plan.after[K.calendar]).events.length,backup.legacy==='calendar'?2:1);
  }
});
test('invalid or unrelated backups are rejected before any write',()=>{
  const source=fixture(),backup=createLaunchpadBackup(source);backup.records['finance_studio_dataset_v3']='{}';
  for(const raw of [json(backup),'{}','{"version":2,"items":',json({format:'wwhs-team-handover',version:1,data:{}})])assert.throws(()=>parseLaunchpadBackup(raw));
  assert.equal(source.attempts.length,0);
});
test('calendar, plans, links and appearance each change the complete backup signature',()=>{
  for(const [key,raw]of [[K.calendar,json({version:1,events:[event('new')]})],[K.plans,json({version:1,days:{}})],[K.links,'[]'],[K.theme,'light']]){
    const s=fixture(),before=launchpadContent(snapshotLaunchpad(s));s.setItem(key,raw);assert.notEqual(launchpadContent(snapshotLaunchpad(s)),before,key);
  }
});

test('same-title simultaneous calendar events round-trip separately by ID, including reversed order and missing or shared UIDs',()=>{
  for(const uids of [['source-a','source-b'],['',''],['series','series']])for(const preferBackup of [false,true]){
    const events=uids.map((uid,i)=>event(`slot-${i}`,{uid,title:'Same meeting',startTime:'09:00',endTime:'10:00',description:`Separate record ${i}`}));
    const current=storage({[K.calendar]:json({version:1,events})});
    const incoming=storage({[K.calendar]:json({version:1,events:[...events].reverse()})});
    const plan=planLaunchpadRestore(current,parseLaunchpadBackup(json(createLaunchpadBackup(incoming))),{preferBackup});
    assert.equal(plan.after[K.calendar],current.getItem(K.calendar));
    assert.deepEqual(plan.counts,{added:0,different:0,updated:0,kept:0});assert.equal(current.attempts.length,0);
  }
});

test('a uniquely identified source event can move across devices without matching another event in its new slot',()=>{
  const existing=event('local-id',{uid:'shared-source',description:'Current note'}),neighbour=event('neighbour',{uid:'other-source',title:'Changed title',startTime:'10:00',endTime:'11:00'});
  const imported={...existing,id:'another-device-id',title:neighbour.title,startTime:neighbour.startTime,endTime:neighbour.endTime,description:'Backup note'};
  const current=storage({[K.calendar]:json({version:1,events:[neighbour,existing]})});
  const incoming=storage({[K.calendar]:json({version:1,events:[imported,neighbour]})}),backup=parseLaunchpadBackup(json(createLaunchpadBackup(incoming)));
  for(const preferBackup of [false,true]){
    const plan=planLaunchpadRestore(current,backup,{preferBackup}),events=JSON.parse(plan.after[K.calendar]).events;
    assert.equal(events.length,2);assert.deepEqual(events[0],neighbour);
    assert.deepEqual(events[1],preferBackup?{...imported,id:existing.id}:existing);
    assert.equal(plan.counts.added,0);assert.equal(plan.counts.different,1);
  }
});

test('different identified events in the same slot are added, never merged by their title',()=>{
  const first=event('one',{title:'Same title'}),second=event('two',{title:first.title});
  const current=storage({[K.calendar]:json({version:1,events:[first]})}),incoming=storage({[K.calendar]:json({version:1,events:[first,second]})});
  for(const preferBackup of [false,true]){
    const plan=planLaunchpadRestore(current,parseLaunchpadBackup(json(createLaunchpadBackup(incoming))),{preferBackup});
    assert.deepEqual(JSON.parse(plan.after[K.calendar]).events,[first,second]);assert.equal(plan.counts.added,1);
  }
});
test('download is unconfirmed until explicit confirmation; later calendar changes invalidate it',async()=>{
  const s=fixture(),tracker=createNotesBackupTracker(s,{hash:async text=>createHash('sha256').update(text).digest('hex')});await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
  const raw=json(createLaunchpadBackup(s));assert.equal(await tracker.downloaded(raw),true);assert.equal(tracker.state().needsBackup,true);assert.equal(await tracker.confirm(),true);assert.equal(tracker.state().needsBackup,false);
  s.setItem(K.calendar,json({version:1,events:[event('new')]}));await tracker.refresh();assert.equal(tracker.state().needsBackup,true);assert.equal(await tracker.downloaded(raw),false);assert.equal(await tracker.confirm(),false);
});
test('all multi-key writes finish only after the durable recovery copy exists',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.theme]:'light',[K.links]:'[]'},o=options();
  s.fail=()=>{assert.equal(o.backend.records.size,1);};await applyLaunchpadRestore(s,before,after,o);
  assert.deepEqual(snapshotLaunchpad(s),after);assert.equal(s.getItem(RESTORE_KEY),null);assert.equal(o.backend.records.size,0);assert.equal(s.getItem('unrelated-private'),'Must stay private and untouched');
});
test('a native write failure rolls all records back without a second large localStorage copy',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.theme]:'light',[K.links]:'[]'},o=options();
  s.fail=(key,value)=>{if(key===K.theme&&value==='light')throw new DOMException('Full','QuotaExceededError');};
  await assert.rejects(applyLaunchpadRestore(s,before,after,o),/previous records.*restored/);
  assert.deepEqual(snapshotLaunchpad(s),before);assert.equal(s.getItem(RESTORE_KEY),null);assert.equal(o.backend.records.size,0);
});
test('successful replacement retains the previous complete private file, including for one changed key',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.inbox]:json(tasks([note('changed')]))},o=options();
  await applyLaunchpadRestore(s,before,after,{...o,preservePrevious:true});
  assert.deepEqual((await readPreviousLaunchpadBackup(o)).records,before);assert.deepEqual(snapshotLaunchpad(s),after);assert.equal(s.getItem(RESTORE_KEY),null);
  assert.equal(o.backend.records.size,1);assert.doesNotMatch(json(await readPreviousLaunchpadBackup(o)),/unrelated-private|Must stay private/);
});
test('failure to retain the previous copy leaves committed recovery available until a successful retry',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.theme]:'light'},o=options(),save=o.backend.savePrevious;
  o.backend.savePrevious=async()=>{throw Error('Unavailable');};
  await assert.rejects(applyLaunchpadRestore(s,before,after,{...o,preservePrevious:true}),/recovery must finish/);
  assert.equal(s.getItem(K.theme),'light');assert.ok(s.getItem(RESTORE_KEY));assert.deepEqual((await readLaunchpadRecovery(s,o)).recovery.before,before);
  o.backend.savePrevious=save;await recoverLaunchpadRestore(s,o);assert.equal(s.getItem(RESTORE_KEY),null);assert.deepEqual((await readPreviousLaunchpadBackup(o)).records,before);
});
test('failed recovery keeps a small marker and readable copy, then recovers when storage is available',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.theme]:'light',[K.links]:'[]'},o=options();
  const body={version:2,transactionId:'synthetic-restore',before,after};await o.backend.put(body);
  s.setItem(RESTORE_KEY,json({version:2,transactionId:body.transactionId,phase:'prepared'})+' ');s.setItem(K.links,'[]');s.fail=()=>{throw Error('Temporarily blocked');};
  await assert.rejects(recoverLaunchpadRestore(s,o),/Recovery could not finish/);assert.ok(s.getItem(RESTORE_KEY).length<200);
  const readable=await readLaunchpadRecovery(s,o);assert.deepEqual(readable.recovery.before,before);assert.equal(readable.current[K.links],'[]');
  s.fail=null;await recoverLaunchpadRestore(s,o);assert.deepEqual(snapshotLaunchpad(s),before);assert.equal(s.getItem(RESTORE_KEY),null);
});
test('missing database copy never clears records and still allows a readable current recovery export',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),o=options();s.setItem(RESTORE_KEY,json({version:2,transactionId:'missing-copy',phase:'prepared'}));
  await assert.rejects(recoverLaunchpadRestore(s,o),/missing/);const readable=await readLaunchpadRecovery(s,o);assert.deepEqual(readable.current,before);assert.match(readable.recoveryError,/missing/);assert.ok(s.getItem(RESTORE_KEY));
});
test('edits during asynchronous preparation prevent restore from touching any saved value',async()=>{
  const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.theme]:'light',[K.links]:'[]'},o=options();
  const put=o.backend.put.bind(o.backend);o.backend.put=async body=>{await put(body);s.setItem(K.inbox,json(tasks([note('newer')])));};
  await assert.rejects(applyLaunchpadRestore(s,before,after,o),/changed in another tab/);assert.equal(s.getItem(K.theme),'dark');assert.equal(s.getItem(K.links),before[K.links]);assert.equal(JSON.parse(s.getItem(K.inbox)).items[0].id,'newer');assert.equal(s.getItem(RESTORE_KEY),null);
});
test('team session changes during lock acquisition or recovery preparation prevent every Launchpad write',async()=>{
  for(const timing of ['lock','database']){
    const s=fixture(),before=snapshotLaunchpad(s),after={...before,[K.theme]:'light',[K.links]:'[]'},o=options(),key='wwhs-team-handover:v1';
    if(timing==='lock')o.locks.request=async(name,opts,fn)=>{s.setItem(key,'{"phase":"view-only"}');return fn({name});};
    else {const put=o.backend.put.bind(o.backend);o.backend.put=async body=>{await put(body);s.setItem(key,'{"phase":"view-only"}');};}
    await assert.rejects(applyLaunchpadRestore(s,before,after,o),/shared work session changed/);assert.deepEqual(snapshotLaunchpad(s),before);assert.equal(s.getItem(RESTORE_KEY),null);assert.equal(o.backend.records.size,0);
  }
});
test('native-origin matches retain local IDs and keys and remap incoming dependency aliases for team interoperability',()=>{
  const origin={wing:'vet',taskId:'task',recordKey:'task::2026',route:'#task/task',cycle:'2026'};
  const local=enrich({id:'local-id',taskKey:'workboard:vet:older-key',title:'Same native task',action:'Keep current action',origin,workstream:'vet',noteHtml:'<p>Current private rich note</p>'});
  const other={...local,id:'other-browser-id',taskKey:'workboard:vet:updated-key',action:'Chosen backup action',noteHtml:'<p>Other rich note</p>'};
  const dependent=enrich({id:'new-dependent',taskKey:'workboard:tas:dependent',title:'Follow-up',action:'Check progress',origin:{wing:'tas',taskId:'dependent',recordKey:'dependent::2026',route:'#task/dependent',cycle:'2026'},workstream:'tas',dependsOn:[other.taskKey]});
  for(const preferBackup of [false,true]){
    const s=storage({[K.inbox]:json(tasks([local]))}),backup=parseLaunchpadBackup(json(tasks([other,dependent]))),plan=planLaunchpadRestore(s,backup,{preferBackup}),items=JSON.parse(plan.after[K.inbox]).items;
    assert.equal(items.length,2);assert.equal(items[0].id,local.id);assert.equal(items[0].taskKey,local.taskKey);assert.equal(items[0].action,preferBackup?other.action:local.action);assert.equal(items[0].noteHtml,preferBackup?other.noteHtml:local.noteHtml);assert.deepEqual(items[1].dependsOn,[local.taskKey]);
    assert.equal(teamSnapshot({getItem:key=>plan.after[key]??null}).inbox.items.length,2);assert.equal(s.attempts.length,0);
  }
});
test('duplicate native occurrences or cross-origin key collisions are rejected during preview without writes',()=>{
  const origin={wing:'vet',taskId:'task',recordKey:'task::2026',route:'#task/task',cycle:'2026'},one=enrich({id:'one',taskKey:'workboard:vet:one',title:'One',action:'Check',origin,workstream:'vet'}),s=storage({[K.inbox]:json(tasks([one]))});
  const duplicate={...one,id:'duplicate',taskKey:'workboard:vet:duplicate'},collision={...one,id:'collision',origin:{...origin,taskId:'other',recordKey:'other::2026',route:'#task/other'}};
  assert.throws(()=>planLaunchpadRestore(s,parseLaunchpadBackup(json(tasks([one,duplicate])))),/Duplicate team task occurrences/);
  assert.throws(()=>planLaunchpadRestore(s,parseLaunchpadBackup(json(tasks([collision])))),/Duplicate task keys/);assert.equal(s.attempts.length,0);
});
test('distinct private notes retaining the same native origin keep their own identities and content',()=>{
  const origin={wing:'vet',taskId:'task',recordKey:'task::2026',route:'#task/task',cycle:'2026'};
  const first=note('private-one',{origin,workstream:'vet',noteText:'First private note'}),second=note('private-two',{origin,workstream:'vet',noteText:'Separate private note'});
  for(const preferBackup of [false,true]){
    const s=storage({[K.inbox]:json(tasks([first]))}),plan=planLaunchpadRestore(s,parseLaunchpadBackup(json(tasks([second]))),{preferBackup}),items=JSON.parse(plan.after[K.inbox]).items;
    assert.deepEqual(items,[first,second]);assert.equal(plan.counts.added,1);assert.equal(plan.counts.different,0);assert.equal(teamSnapshot({getItem:key=>plan.after[key]??null}).inbox.items.length,0);assert.equal(s.attempts.length,0);
  }
});
