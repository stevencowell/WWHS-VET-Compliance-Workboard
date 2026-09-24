import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {enrich} from '../morning-launchpad/assets/summary-core.mjs';
import {createLocalVault} from '../finance/security/local-vault.mjs';
import {KEYS,createBackup,snapshot} from '../assets/js/team-handover-core.mjs';
import {BACKUP_KEYS,createLaunchpadBackup} from '../morning-launchpad/assets/launchpad-backup.mjs';
import {RECORD_KEYS,RESTORE_KEY,EPOCH_KEY,captureWorkspace,createWorkspaceBackup,parseWorkspaceBackup,planOlderBackup} from '../assets/js/workspace-backup.mjs';
import {applyWorkspaceRestore,recoverWorkspace} from '../assets/js/workspace-backup-transaction.mjs';
const {createStorage}=createRequire(import.meta.url)('../assets/js/workboard-storage.js');
const locks={request:async(name,fn)=>fn()};
const json=JSON.stringify;
function native(entries={}){const values=new Map(Object.entries(entries));return {getItem:k=>values.get(k)??null,setItem(k,v){this.fail?.(k,v);values.set(k,String(v));},removeItem:k=>values.delete(k),values};}
function database(){let value=null;return {read:async()=>structuredClone(value),compareAndSwap:async(expected,next)=>{if(json(expected?.record??null)!==json(value))throw Error('Finance changed');value=structuredClone(next);},close(){}};}
function backend(){const copies=new Map();return {get:async k=>structuredClone(copies.get(k)??null),put:async(k,v)=>copies.set(k,structuredClone(v)),delete:async k=>copies.delete(k)};}
export async function fixture(){
  const note=enrich({id:'synthetic-note',taskKey:'personal:synthetic',title:'SYNTHETIC: complete backup test',action:'Keep every area together',personal:true,status:'done',noteText:'Links, images and café 🐟',noteHtml:'<p><b>Research note</b> <a href="https://example.test/document">Document</a></p><img src="data:image/png;base64,iVBORw0KGgo=">'});
  const n=native({
    [BACKUP_KEYS.inbox]:json({version:2,items:[note],workboardImports:[],forecastContexts:{},briefing:'Synthetic',pinWorkflowVersion:1}),
    [BACKUP_KEYS.calendar]:json({version:1,events:[]}),
    [BACKUP_KEYS.plans]:json({version:1,days:{}}),
    [BACKUP_KEYS.links]:json([{id:'resource',name:'Test resource',url:'https://example.test/resource'}]),
    [BACKUP_KEYS.theme]:'light',
    [KEYS.vet]:json({schemaVersion:3,records:{synthetic:{status:'in-progress'}},assignments:{},gaps:{},eventOccurrences:[],settings:{keep:'VET preference'}}),
    [KEYS.tas]:json({schemaVersion:2,records:{synthetic:{status:'not-started'}},weekly:{},eventOccurrences:{},scheduleOverrides:{},settings:{keep:'TAS preference'}}),
    [KEYS.review]:json({version:1,records:{'vet:2026:synthetic':{completed:true,reviewedOn:'2026-09-24'}}}),
    'unrelated-site-secret':'Must never enter the file',
  });
  const finance=database(),vault=await createLocalVault({}, {database:finance});await vault.setup('synthetic test password');
  await vault.saveState(0,{finance_studio_test_v1:json('SYNTHETIC_PRIVATE_FINANCE'),finance_studio_planning_inputs_v1:'{"income":"123.45"}'});
  const storage=createStorage(n),data=await captureWorkspace(storage,finance);
  return {storage,n,finance,vault,data};
}
test('one file round-trips every current record verbatim, retaining rich notes and encryption',async()=>{
  const f=await fixture(),file=await createWorkspaceBackup(f.data),text=json(file),opened=await parseWorkspaceBackup(text);
  assert.deepEqual(opened.data,f.data);assert.equal(Object.keys(opened.data.records).length,8);
  assert.ok(text.includes('data:image/png'));assert.ok(text.includes('TAS preference'));
  assert.ok(!text.includes('SYNTHETIC_PRIVATE_FINANCE'));assert.ok(!text.includes('unrelated-site-secret'));assert.ok(!text.includes('Must never enter'));
});

test('all-area backup restores instruction revisions and earlier completion without losing any area',async()=>{
  const f=await fixture(),review=globalThis.WWHS_TASK_REVIEW;
  const old={steps:['Original check'],finished:'Original result'},task={actionSteps:['Original check','Added check'],doneWhen:old.finished,legacyRequirements:old};
  const vet=JSON.parse(f.storage.getItem(KEYS.vet));
  vet.records.synthetic=review.migrateRequirements({status:'completed',stepChecks:{0:true},sourceChecked:true,doneWhenConfirmed:true,exceptionSummary:'Saved working notes'},task);
  f.storage.setItem(KEYS.vet,json(vet));
  const ticks=JSON.parse(f.storage.getItem(KEYS.review));ticks.records['vet:2026:synthetic']=review.nextReview(ticks.records['vet:2026:synthetic'],{completed:true,reviewedOn:'2026-09-24',requirementsKey:review.requirementsKey(task)});f.storage.setItem(KEYS.review,json(ticks));
  const data=await captureWorkspace(f.storage,f.finance),opened=await parseWorkspaceBackup(json(await createWorkspaceBackup(data)));
  assert.deepEqual(opened.data,data);
  const restored=JSON.parse(opened.data.records[KEYS.vet]);
  assert.equal(restored.records.synthetic.requirementsHistory[0].status,'completed');assert.equal(restored.records.synthetic.requirementsReview,true);assert.equal(restored.records.synthetic.exceptionSummary,'Saved working notes');
  const restoredTicks=JSON.parse(opened.data.records[KEYS.review]);assert.equal(restoredTicks.records['vet:2026:synthetic'].previousReviews[0].completed,true);
});
test('empty, damaged, incomplete and unknown-version files cannot be restored',async()=>{
  const f=await fixture(),file=await createWorkspaceBackup(f.data);
  await assert.rejects(parseWorkspaceBackup(''),/empty/);
  await assert.rejects(parseWorkspaceBackup('{bad'),/readable/);
  await assert.rejects(parseWorkspaceBackup(json({...file,version:2})),/version/);
  const tampered=structuredClone(file);tampered.data.records[BACKUP_KEYS.theme]='dark';
  await assert.rejects(parseWorkspaceBackup(json(tampered)),/changed/);
  delete tampered.data.records[KEYS.tas];await assert.rejects(createWorkspaceBackup(tampered.data),/incomplete/);
});
test('all-area restore saves the complete previous copy and rejects stale tabs',async()=>{
  const f=await fixture(),n=native({'unrelated':'keep'}),storage=createStorage(n),finance=database(),oldTab=createStorage(n),b=backend(),before=await captureWorkspace(storage,finance);
  await applyWorkspaceRestore(storage,finance,b,before,f.data,{locks});
  assert.deepEqual(await captureWorkspace(storage,finance),f.data);assert.deepEqual(await b.get('previous'),before);assert.equal(n.getItem('unrelated'),'keep');assert.equal(n.getItem(RESTORE_KEY),null);
  assert.throws(()=>oldTab.setItem(BACKUP_KEYS.theme,'dark'),/reload/);
  assert.doesNotThrow(()=>createStorage(n).setItem(BACKUP_KEYS.theme,'dark'));
});
test('quota failure rolls all written records back without touching unrelated data',async()=>{
  const f=await fixture(),n=native({[BACKUP_KEYS.theme]:'dark','unrelated':'keep'}),s=createStorage(n),db=database(),b=backend(),before=await captureWorkspace(s,db);
  let failed=false;n.fail=(key)=>{if(key===KEYS.tas&&!failed){failed=true;throw Error('Synthetic write failure');}};
  await assert.rejects(applyWorkspaceRestore(s,db,b,before,f.data,{locks}),/previous saved copy has been restored/);
  assert.deepEqual(await captureWorkspace(s,db),before);assert.equal(n.getItem(RESTORE_KEY),null);assert.equal(n.getItem('unrelated'),'keep');
});
test('a Finance write failure restores the Launchpad, VET and TAS records too',async()=>{
  const f=await fixture(),n=native(),s=createStorage(n),db=database(),b=backend(),before=await captureWorkspace(s,db);db.compareAndSwap=async()=>{throw Error('Synthetic encrypted store failure');};
  await assert.rejects(applyWorkspaceRestore(s,db,b,before,f.data,{locks}),/previous saved copy has been restored/);
  assert.deepEqual(await captureWorkspace(s,db),before);
});
test('a changed preview or failure to save recovery refuses the restore before writes',async()=>{
  const f=await fixture(),n=native(),s=createStorage(n),db=database(),b=backend(),before=await captureWorkspace(s,db);
  s.setItem(BACKUP_KEYS.theme,'dark');await assert.rejects(applyWorkspaceRestore(s,db,b,before,f.data,{locks}),/changed/);assert.equal(n.getItem(RESTORE_KEY),null);
  b.put=async()=>{throw Error('No space for recovery');};const fresh=await captureWorkspace(s,db);
  await assert.rejects(applyWorkspaceRestore(s,db,b,fresh,f.data,{locks}),/recovery/);assert.deepEqual(await captureWorkspace(s,db),fresh);
});
test('interrupted restores roll back and committed restores only finish cleanup',async()=>{
  const f=await fixture();
  for(const phase of ['prepared','committed']){
    const n=native(),s=createStorage(n),db=database(),b=backend(),before=await captureWorkspace(s,db),id='synthetic-recovery';
    await b.put(id,{id,before,after:f.data,epoch:'new-generation'});
    for(const key of RECORD_KEYS)if(f.data.records[key]!==null)n.setItem(key,f.data.records[key]);await db.compareAndSwap(null,f.data.finance);
    n.setItem(RESTORE_KEY,json({id,phase}));n.setItem(EPOCH_KEY,'new-generation');
    await recoverWorkspace(s,db,b,{locks});assert.deepEqual(await captureWorkspace(s,db),phase==='committed'?f.data:before);assert.equal(n.getItem(RESTORE_KEY),null);
  }
});
test('wrong Finance password has no storage effects; correct password prepares a fresh encrypted identity',async()=>{
  const f=await fixture(),before=await f.finance.read();
  await assert.rejects(f.vault.prepareRestoreBackup(f.data.finance,'incorrect password',before),/password is incorrect/);
  assert.deepEqual(await f.finance.read(),before);
  const prepared=await f.vault.prepareRestoreBackup(f.data.finance,'synthetic test password',before);
  assert.notEqual(prepared.vaultId,before.vaultId);assert.deepEqual(await f.finance.read(),before);
  const db=database();await db.compareAndSwap(null,prepared);const restored=await createLocalVault({}, {database:db});await restored.unlock('synthetic test password');assert.equal((await restored.loadState()).values.finance_studio_test_v1,json('SYNTHETIC_PRIVATE_FINANCE'));
});
test('older single-area files can be brought into the complete format without replacing other areas',async()=>{
  const f=await fixture(),current=structuredClone(f.data),empty=native(),old=await parseWorkspaceBackup(json(createLaunchpadBackup(empty)));
  assert.deepEqual(planOlderBackup(current,old).data,current);
  const oldTeam=createBackup({snapshot:snapshot(empty),editor:'Synthetic user',scope:'tas'}),plan=planOlderBackup(current,await parseWorkspaceBackup(json(oldTeam)));
  assert.equal(plan.area,'TAS');assert.equal(plan.data.records[KEYS.vet],current.records[KEYS.vet]);assert.deepEqual(plan.data.finance,current.finance);
});
