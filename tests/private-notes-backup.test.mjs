import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {INBOX_KEY,enrich} from '../morning-launchpad/assets/summary-core.mjs';
import {NOTES_BACKUP_KEY,privateNotesContent,createNotesBackupTracker} from '../morning-launchpad/assets/backup-reminder.mjs';

const hash=async text=>createHash('sha256').update(text).digest('hex');
const serialise=(items,extra={})=>JSON.stringify({version:2,items,briefing:'',...extra});
const personal=(extra={})=>enrich({id:'private-1',title:'Personal note',action:'Make a call',personal:true,taskKey:'personal:one',noteText:'Call tomorrow.',...extra});
const shared=(extra={})=>enrich({id:'shared-1',title:'VET task',action:'Check school profile',taskKey:'workboard:vet:profile',workstream:'vet',origin:{wing:'vet',taskId:'profile',recordKey:'profile',route:'#task/profile',cycle:'2026'},...extra});
function storageWith(raw){
  const data=new Map(raw===null?[]:[[INBOX_KEY,raw]]);let failMarker=false;
  return {data,getItem:key=>data.get(key)??null,setItem(key,value){if(failMarker&&key===NOTES_BACKUP_KEY)throw Error('Storage full');data.set(key,String(value));},failMarker(){failMarker=true;}};
}
async function setup(items=[personal()],options={}){
  const storage=storageWith(serialise(items)),tracker=createNotesBackupTracker(storage,{hash,...options});
  await tracker.refresh();return {storage,tracker};
}
function hashGate(){
  let next=null;
  return {hash:async text=>{const held=next;next=null;if(held){held.started();await held.promise;}return hash(text);},pause(){
    let release,started;const promise=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{started=resolve;});next={promise,started};return {entered,release};
  }};
}

test('personal content, progress, date and deletion changes need a fresh private backup',async()=>{
  for(const change of [{noteText:'New private text'},{status:'done'},{dueDate:'2026-10-01'},{pinnedDate:'2026-09-19'},{source:'Full email thread'}]){
    const {storage,tracker}=await setup();assert.equal(tracker.state().needsBackup,true,'existing notes need their first confirmed backup');
    await tracker.downloaded(storage.getItem(INBOX_KEY));await tracker.confirm();assert.equal(tracker.state().needsBackup,false);
    storage.setItem(INBOX_KEY,serialise([personal(change)]));await tracker.refresh();assert.equal(tracker.state().needsBackup,true,JSON.stringify(change));
  }
  const {storage,tracker}=await setup();storage.setItem(INBOX_KEY,serialise([]));await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
});

test('the complete Launchpad copy tracks shared-card changes while the old private-only signature stays compatible',async()=>{
  const original=serialise([personal(),shared()]);
  const changed=serialise([shared({status:'done',noteText:'Shared progress',lastActionOn:'2026-09-19'}),personal({selected:true,id:'new-local-id',dirty:['noteText'],planAliases:[{id:'old',title:'Old'}]})]);
  assert.equal(privateNotesContent(original),privateNotesContent(changed));
  const {storage,tracker}=await setup([personal(),shared()]);
  await tracker.downloaded(storage.getItem(INBOX_KEY));await tracker.confirm();
  storage.setItem(INBOX_KEY,changed);await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
  const forecast={version:1,managed:true,active:true,section:'ready',kind:'scheduled',reason:'Due this week',scheduledDate:'2026-09-20',windowStart:null,windowEnd:null,period:'Term 3',sourceStatus:'review',blocked:false,blockerReason:'',asOf:'2026-09-19',role:'coordinator',roleLabel:'VET Coordinator',year:'2026',sourceYear:'2026',horizonDays:21};
  storage.setItem(INBOX_KEY,serialise([personal(),shared({forecast})]));await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
});

test('personal pins on shared cards are tracked while shared task fields stay separate',async()=>{
  const {storage,tracker}=await setup([personal(),shared()]);
  storage.setItem(INBOX_KEY,serialise([personal(),shared({pinnedDate:'2026-09-19'})]));await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
  const content=JSON.parse(privateNotesContent(storage.getItem(INBOX_KEY)));
  assert.deepEqual(content.pins,[{taskKey:'workboard:vet:profile',pinnedDate:'2026-09-19'}]);
  assert.equal(content.items.some(item=>item.includes('VET task')),false);
});

test('the reminder stores a small digest, never another copy of private notes',async()=>{
  const text='Private content '.repeat(10000),{storage,tracker}=await setup([personal({noteText:text})]);
  const raw=storage.getItem(NOTES_BACKUP_KEY),record=JSON.parse(raw);
  assert.ok(raw.length<250);assert.match(record.baseline,/^[0-9a-f]{64}$/);assert.equal(raw.includes('Private content'),false);
  assert.equal(record.confirmedAt,null);assert.equal(tracker.state().confirmedAt,null);
});

test('requesting a download keeps reminder until explicit saved-file confirmation',async()=>{
  const {storage,tracker}=await setup();const raw=serialise([personal({noteText:'New text'})]);
  storage.setItem(INBOX_KEY,raw);await tracker.refresh();
  assert.equal(await tracker.downloaded(raw),true);assert.equal(tracker.state().needsBackup,true);assert.equal(tracker.state().canConfirm,true);
  assert.equal(await tracker.confirm(),true);assert.equal(tracker.state().needsBackup,false);assert.equal(tracker.state().canConfirm,false);assert.ok(tracker.state().confirmedAt);
  storage.setItem(INBOX_KEY,serialise([personal({noteText:'Another change'})]));await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
});

test('a stale downloaded file cannot be confirmed over more recent notes',async()=>{
  const {storage,tracker}=await setup();const raw=storage.getItem(INBOX_KEY);
  storage.setItem(INBOX_KEY,serialise([personal({noteText:'Latest version'})]));await tracker.refresh();
  assert.equal(await tracker.downloaded(raw),false);assert.equal(tracker.state().canConfirm,false);assert.equal(await tracker.confirm(),false);assert.equal(tracker.state().needsBackup,true);
});

test('a change while export hashing awaits invalidates the downloaded file',async()=>{
  const gate=hashGate(),{storage,tracker}=await setup(undefined,{hash:gate.hash});const raw=serialise([personal({noteText:'Download version'})]);
  storage.setItem(INBOX_KEY,raw);await tracker.refresh();const pause=gate.pause(),downloading=tracker.downloaded(raw);await pause.entered;
  storage.setItem(INBOX_KEY,serialise([personal({noteText:'Changed during download'})]));pause.release();
  assert.equal(await downloading,false);assert.equal(await tracker.confirm(),false);assert.equal(tracker.state().needsBackup,true);
});

test('a change while confirmation hashing awaits cannot silently confirm stale notes',async()=>{
  const gate=hashGate(),{storage,tracker}=await setup(undefined,{hash:gate.hash});const raw=serialise([personal({noteText:'Downloaded version'})]);
  storage.setItem(INBOX_KEY,raw);await tracker.refresh();await tracker.downloaded(raw);
  const previousMarker=storage.getItem(NOTES_BACKUP_KEY),pause=gate.pause(),confirming=tracker.confirm();await pause.entered;
  storage.setItem(INBOX_KEY,serialise([personal({noteText:'Edited during confirmation'})]));pause.release();
  assert.equal(await confirming,false);assert.equal(storage.getItem(NOTES_BACKUP_KEY),previousMarker);await tracker.refresh();assert.equal(tracker.state().needsBackup,true);
});

test('failed confirmation marker write preserves notes and the backup-needed state',async()=>{
  const {storage,tracker}=await setup();const raw=serialise([personal({noteText:'Needs saving'})]);
  storage.setItem(INBOX_KEY,raw);await tracker.refresh();await tracker.downloaded(raw);const marker=storage.getItem(NOTES_BACKUP_KEY);storage.failMarker();
  assert.equal(await tracker.confirm(),false);assert.equal(storage.getItem(INBOX_KEY),raw);assert.equal(storage.getItem(NOTES_BACKUP_KEY),marker);assert.equal(tracker.state().needsBackup,true);assert.match(tracker.state().error,/could not be saved/);
});

test('a failed initial marker write leaves notes intact and reports an unavailable reminder',async()=>{
  const raw=serialise([personal()]),storage=storageWith(raw);storage.failMarker();const tracker=createNotesBackupTracker(storage,{hash});await tracker.refresh();
  assert.equal(storage.getItem(INBOX_KEY),raw);assert.equal(storage.getItem(NOTES_BACKUP_KEY),null);assert.match(tracker.state().error,/Storage full/);assert.equal(await tracker.setEnabled(false),false);
});

test('switching reminders off survives reload without discarding the content baseline',async()=>{
  const {storage,tracker}=await setup();const baseline=JSON.parse(storage.getItem(NOTES_BACKUP_KEY)).baseline;
  assert.equal(await tracker.setEnabled(false),true);storage.setItem(INBOX_KEY,serialise([personal({noteText:'Changed while reminders off'})]));
  const reloaded=createNotesBackupTracker(storage,{hash});await reloaded.refresh();assert.equal(reloaded.state().enabled,false);assert.equal(reloaded.state().needsBackup,true);assert.equal(JSON.parse(storage.getItem(NOTES_BACKUP_KEY)).baseline,baseline);
});
