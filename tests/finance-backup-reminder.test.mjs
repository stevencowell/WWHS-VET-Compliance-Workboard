import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinanceBackupReminder,FINANCE_BACKUP_REMINDER_KEY as KEY} from '../finance/backup-reminder.mjs';
import {createPrivateStorage} from '../finance/security/private-storage.mjs';
import {createLocalVault} from '../finance/security/local-vault.mjs';
import {webcrypto} from 'node:crypto';

const DATA='finance_studio_budget_items_v3';
async function fixture() {
  let values={},revision=0,fail=false,hold=null,counter=0;
  const session={loadState:async()=>({values,revision}),saveState:async(expected,next)=>{
    if(hold)await hold;
    if(fail)throw Object.assign(new Error('Synthetic disk error'),{code:'storage'});
    assert.equal(expected,revision);values=structuredClone(next);return {revision:++revision};
  }};
  const raw=await createPrivateStorage(session,{autoFlushMs:null});
  const reminder=createFinanceBackupReminder(raw,{makeToken:()=>`change_${++counter}`,now:()=> '2026-09-19T01:02:03.000Z'});
  return {raw,reminder,storage:reminder.storage,session,values:()=>values,setFail:v=>fail=v,hold:v=>hold=v};
}
function start(f) { f.reminder.activate();f.storage.setItem(DATA,'[{"item":"Synthetic"}]'); }
function offer(f) { assert.equal(f.reminder.offerConfirmation(f.reminder.captureBackup()),true); }

test('startup writes establish no backup claim; later changes persist a tiny encrypted-value marker',async()=>{
  const f=await fixture();f.storage.setItem(DATA,'[]');await f.storage.flush();
  assert.equal(f.reminder.status().needsBackup,false);assert.equal(f.reminder.status().confirmedAt,null);
  f.reminder.activate();f.storage.setItem(DATA,'[{"item":"Synthetic"}]');await f.storage.flush();
  assert.equal(f.reminder.status().shouldWarn,true);
  assert.ok(f.values()[KEY].length<300);assert.ok(!f.values()[KEY].includes('Synthetic'));
  const reopened=createFinanceBackupReminder(await createPrivateStorage(f.session,{autoFlushMs:null}));
  reopened.activate();assert.equal(reopened.status().needsBackup,true);
});

test('download initiation does not clear; explicit confirmation persists and is not a new edit',async()=>{
  const f=await fixture();start(f);offer(f);
  assert.equal(f.reminder.status().needsBackup,true);
  assert.equal(await f.reminder.confirmBackup(),true);
  assert.equal(f.reminder.status().needsBackup,false);assert.equal(f.storage.status().dirty,false);
  const reopened=createFinanceBackupReminder(await createPrivateStorage(f.session,{autoFlushMs:null}));
  reopened.activate();assert.equal(reopened.status().needsBackup,false);assert.equal(reopened.status().confirmedAt,'2026-09-19T01:02:03.000Z');
});

test('every later edit invalidates a pending download token, including edit-and-revert',async()=>{
  const f=await fixture();start(f);const capture=f.reminder.captureBackup();offer(f);
  const old=f.storage.getItem(DATA);f.storage.setItem(DATA,'[]');f.storage.setItem(DATA,old);
  assert.equal(f.reminder.status().canConfirm,false);assert.equal(f.reminder.offerConfirmation(capture),false);
  assert.equal(await f.reminder.confirmBackup(),false);assert.equal(f.reminder.status().needsBackup,true);
});

test('identical writes do not invalidate a downloaded backup',async()=>{
  const f=await fixture();start(f);offer(f);f.storage.setItem(DATA,f.storage.getItem(DATA));
  assert.equal(f.reminder.status().canConfirm,true);
});

test('failed and nested atomic imports preserve prior reminder and pending confirmation',async()=>{
  const f=await fixture();start(f);await f.storage.flush();offer(f);
  const previous=f.storage.getItem(DATA),marker=f.storage.getItem(KEY);
  assert.throws(()=>f.storage.atomic(()=>{f.storage.setItem(DATA,'[]');f.storage.atomic(()=>f.storage.setItem('finance_studio_test_v1','{}'));throw new Error('Rejected import');}),/Rejected import/);
  assert.equal(f.storage.getItem(DATA),previous);assert.equal(f.storage.getItem(KEY),marker);
  assert.equal(f.storage.getItem('finance_studio_test_v1'),null);assert.equal(f.reminder.status().canConfirm,true);
  f.storage.atomic(()=>{f.storage.setItem(DATA,'[]');f.storage.atomic(()=>f.storage.setItem('finance_studio_test_v1','{}'));});
  assert.equal(f.reminder.status().canConfirm,false);
});

test('invalid state rolls back both data and reminder metadata',async()=>{
  const f=await fixture();start(f);offer(f);const before=f.storage.getItem(KEY);
  assert.throws(()=>f.storage.atomic(()=>{f.storage.setItem(DATA,'[]');f.storage.setItem('not_a_finance_key','{}');}),/not in the expected Finance Studio format/);
  assert.equal(f.storage.getItem(KEY),before);assert.equal(f.reminder.status().canConfirm,true);
});

test('async import callbacks are rejected before invocation',async()=>{
  const f=await fixture();let called=false;
  assert.throws(()=>f.storage.atomic(async()=>{called=true;}),/cannot save all its changes together/);assert.equal(called,false);
});

test('turning optional warning off persists without clearing backup-needed state or dirty-save status',async()=>{
  const f=await fixture();start(f);f.reminder.setEnabled(false);
  assert.equal(f.reminder.status().shouldWarn,false);assert.equal(f.reminder.status().needsBackup,true);assert.equal(f.storage.status().dirty,true);
  await f.storage.flush();const reopened=createFinanceBackupReminder(await createPrivateStorage(f.session,{autoFlushMs:null}));reopened.activate();
  assert.equal(reopened.status().enabled,false);assert.equal(reopened.status().needsBackup,true);
  reopened.setEnabled(true);assert.equal(reopened.status().shouldWarn,true);
});

test('edits while confirmation awaits a save cannot become falsely backed up',async()=>{
  const f=await fixture();start(f);offer(f);let release;f.hold(new Promise(resolve=>release=resolve));
  const confirmation=f.reminder.confirmBackup();f.storage.setItem(DATA,'[{"item":"Later synthetic edit"}]');f.hold(null);release();
  assert.equal(await confirmation,false);assert.equal(f.reminder.status().needsBackup,true);assert.equal(f.reminder.status().canConfirm,false);
});

test('failed acknowledgement save restores unconfirmed metadata before retry',async()=>{
  const f=await fixture();start(f);await f.storage.flush();offer(f);f.setFail(true);
  await assert.rejects(f.reminder.confirmBackup(),/Synthetic disk error/);
  assert.equal(f.reminder.status().needsBackup,true);assert.equal(JSON.parse(f.storage.getItem(KEY)).confirmedAt,null);
  f.setFail(false);await f.storage.flush();const reopened=createFinanceBackupReminder(await createPrivateStorage(f.session,{autoFlushMs:null}));reopened.activate();
  assert.equal(reopened.status().needsBackup,true);
});

test('vault roundtrip keeps reminder and preference encrypted without plaintext browser storage',async()=>{
  let record=null;
  const database={read:async()=>record,compareAndSwap:async(expected,next)=>{if(expected)assert.deepEqual(record,expected.record);record=structuredClone(next);},close(){}};
  const vault=await createLocalVault({}, {database,crypto:webcrypto});await vault.setup('synthetic password only');
  const reminder=createFinanceBackupReminder(await createPrivateStorage(vault,{autoFlushMs:null}),{makeToken:()=> 'synthetic_token'});
  reminder.activate();reminder.storage.setItem(DATA,'[{"item":"Synthetic secret value"}]');await reminder.storage.flush();
  assert.ok(!JSON.stringify(record).includes(KEY));assert.ok(!JSON.stringify(record).includes('Synthetic secret value'));
  const downloaded=await vault.exportBackup();reminder.offerConfirmation(reminder.captureBackup());await reminder.confirmBackup();
  reminder.storage.close();vault.lock();await vault.unlock('synthetic password only');
  const reopened=createFinanceBackupReminder(await createPrivateStorage(vault,{autoFlushMs:null}));reopened.activate();
  assert.equal(reopened.status().needsBackup,false);assert.ok(JSON.parse(downloaded).ciphertext);
});
