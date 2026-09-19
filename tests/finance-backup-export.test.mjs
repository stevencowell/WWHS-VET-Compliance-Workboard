import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createLocalVault} from '../finance/security/local-vault.mjs';

function database(){
  let record=null,previous=null,hold=null,fail=false;
  return {read:async()=>{if(hold)await hold;return structuredClone(record);},readPrevious:async()=>structuredClone(previous),compareAndSwap:async(expected,next,options={})=>{
    const matches=expected===null?record===null:Object.hasOwn(expected,'record')?JSON.stringify(record)===JSON.stringify(expected.record):record?.vaultId===expected.vaultId&&record.revision===expected.revision;
    if(!matches)throw Object.assign(new Error('Another tab changed the vault'),{code:'conflict'});
    if(fail)throw Object.assign(new Error('Storage failed'),{code:'storage'});
    if(options.preservePrevious&&record!==null)previous=structuredClone(record);
    record=structuredClone(next);
  },replace:value=>{record=structuredClone(value);},hold:value=>{hold=value;},fail:value=>{fail=value;},close(){}};
}
async function fixture(password='synthetic finance password'){
  const db=database(),vault=await createLocalVault({}, {database:db,crypto:webcrypto});await vault.setup(password);return{db,vault,password};
}

test('export refuses a replaced vault with the same numeric revision but different identity',async()=>{
  const a=await fixture('synthetic first password'),b=await fixture('synthetic other password');
  const original=await a.vault.loadState(),foreign=JSON.parse(await b.vault.exportBackup());assert.equal(foreign.revision,original.revision);
  a.db.replace(foreign);
  await assert.rejects(a.vault.exportBackup({expectedRevision:original.revision}),error=>error.code==='conflict');
  // The current tab can still encrypt its own recoverable state with its original password.
  const recovery=await a.vault.exportRecovery({finance_studio_planning_inputs_v1:'{"fortnightIncome":"42.50"}'});
  const restored=await fixture();await restored.vault.restoreBackup(recovery,a.password,{replaceExisting:true});assert.equal((await restored.vault.loadState()).values.finance_studio_planning_inputs_v1,'{"fortnightIncome":"42.50"}');
});

test('encrypted export and restore retain every saved finance key and value',async()=>{
  const a=await fixture();
  const values={finance_studio_dataset_snapshot_v3:'{"transactions":[{"marker":"SYNTHETIC"}]}',finance_studio_budget_items_v3:'[{"category":"Housing","annual_budget":100}]',finance_studio_budget_meta_v1:'{"version":"synthetic"}',finance_studio_budget_plan_v1:'{"syntheticPlan":"Keep schedule values"}',finance_studio_planning_inputs_v1:'{"fortnightIncome":"123.45","savingsGoal":"678"}',finance_studio_tax_settings_v1:'{"syntheticTax":"Keep settings"}',finance_studio_custom_future_v1:'{"unicode":"café 🐟","line":"first\\nsecond"}'};
  const saved=await a.vault.saveState(0,values);const text=await a.vault.exportBackup({expectedRevision:saved.revision});assert.ok(!text.includes('SYNTHETIC'));assert.ok(!text.includes('123.45'));
  const b=await fixture();await b.vault.restoreBackup(text,a.password,{replaceExisting:true});assert.deepEqual({...((await b.vault.loadState()).values)},values);
});

test('revision mismatch cannot be presented as the current tab backup',async()=>{
  const a=await fixture();await a.vault.saveState(0,{finance_studio_test_v1:'{"newer":true}'});
  await assert.rejects(a.vault.exportBackup({expectedRevision:0}),error=>error.code==='conflict');
  assert.equal(JSON.parse(await a.vault.exportBackup({expectedRevision:1})).revision,1);
});

test('locking while export reads prevents a stale operation from completing',async()=>{
  const a=await fixture();let release;const hold=new Promise(resolve=>{release=resolve;});a.db.hold(hold);
  const pending=a.vault.exportBackup({expectedRevision:0});a.vault.lock();release();
  await assert.rejects(pending,error=>error.code==='locked');
});

test('replacement preserves authentic previous ciphertext under the original password, including while locked',async()=>{
  const old=await fixture('synthetic original password'),incoming=await fixture('synthetic imported password');
  assert.equal(await old.vault.getPreviousBackupInfo(),null);
  await old.vault.saveState(0,{finance_studio_test_v1:'{"marker":"ORIGINAL_PRIVATE"}'});
  const before=JSON.parse(await old.vault.exportBackup()),text=await incoming.vault.exportBackup();
  await old.vault.restoreBackup(text,incoming.password,{replaceExisting:true});
  assert.deepEqual(JSON.parse(await old.vault.exportPreviousBackup()),before);
  old.vault.lock();const previous=await old.vault.exportPreviousBackup();assert.ok(!previous.includes('ORIGINAL_PRIVATE'));
  const recovered=await fixture();await recovered.vault.restoreBackup(previous,old.password,{replaceExisting:true});
  assert.equal((await recovered.vault.loadState()).values.finance_studio_test_v1,'{"marker":"ORIGINAL_PRIVATE"}');
  await assert.rejects(recovered.vault.restoreBackup(previous,incoming.password,{replaceExisting:true}),error=>error.code==='unlock-failed');
});

test('normal saves preserve the previous copy; the next successful replacement keeps the immediately prior primary',async()=>{
  const a=await fixture(),b=await fixture();await a.vault.restoreBackup(await b.vault.exportBackup(),b.password,{replaceExisting:true});
  const firstPrevious=await a.vault.exportPreviousBackup(),loaded=await a.vault.loadState();
  await a.vault.saveState(loaded.revision,{finance_studio_test_v1:'{"newer":true}'});
  assert.equal(await a.vault.exportPreviousBackup(),firstPrevious);
  const current=JSON.parse(await a.vault.exportBackup());await a.vault.restoreBackup(await b.vault.exportBackup(),b.password,{replaceExisting:true});
  assert.deepEqual(JSON.parse(await a.vault.exportPreviousBackup()),current);
});

test('unconfirmed, wrong-password, invalid and failed replacements preserve both encrypted records',async()=>{
  const a=await fixture(),b=await fixture();const text=await b.vault.exportBackup();await a.vault.restoreBackup(text,b.password,{replaceExisting:true});
  const primary=await a.vault.exportBackup(),previous=await a.vault.exportPreviousBackup();
  for(const operation of [()=>a.vault.restoreBackup(text,b.password),()=>a.vault.restoreBackup(text,'wrong',{replaceExisting:true}),()=>a.vault.restoreBackup('{}',b.password,{replaceExisting:true})])await assert.rejects(operation());
  a.db.fail(true);await assert.rejects(a.vault.restoreBackup(text,b.password,{replaceExisting:true}),error=>error.code==='storage');
  assert.equal(await a.vault.exportBackup(),primary);assert.equal(await a.vault.exportPreviousBackup(),previous);
});

test('exact restore CAS rejects a same-identity and same-revision replacement during password verification',async()=>{
  const a=await fixture(),b=await fixture(),text=await b.vault.exportBackup();await a.vault.restoreBackup(text,b.password,{replaceExisting:true});
  const previous=await a.vault.exportPreviousBackup(),replacement=JSON.parse(await a.vault.exportBackup());replacement.updatedAt='2026-01-02T00:00:00.000Z';
  let intercepted=false;
  const cryptoProxy={getRandomValues:value=>webcrypto.getRandomValues(value),randomUUID:()=>webcrypto.randomUUID(),subtle:new Proxy(webcrypto.subtle,{get(target,name){if(name==='deriveKey')return async(...args)=>{if(!intercepted){intercepted=true;a.db.replace(replacement);}return target.deriveKey(...args);};const value=target[name];return typeof value==='function'?value.bind(target):value;}})};
  const stale=await createLocalVault({}, {database:a.db,crypto:cryptoProxy});
  await assert.rejects(stale.restoreBackup(text,b.password,{replaceExisting:true}),error=>error.code==='conflict');
  assert.deepEqual(await a.db.read(),replacement);assert.equal(await stale.exportPreviousBackup(),previous);
});
