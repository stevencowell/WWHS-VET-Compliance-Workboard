import {RESTORE_KEY,EPOCH_KEY,RECORD_KEYS,captureWorkspace,same,validateSnapshot} from './workspace-backup.mjs?v=vet-admin-audit-20260924';
const LOCK='wwhs-team-handover-transaction:v2';
export async function openWorkspaceRecovery(indexedDB=globalThis.indexedDB){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wwhs-workspace-recovery-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('copies');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const request=(mode,action)=>new Promise((resolve,reject)=>{const tx=db.transaction('copies',mode);const r=action(tx.objectStore('copies'));tx.oncomplete=()=>resolve(r.result??null);tx.onerror=tx.onabort=()=>reject(tx.error||Error('The recovery copy could not be saved.'));});
  return {get:key=>request('readonly',s=>s.get(key)),put:(key,value)=>request('readwrite',s=>s.put(value,key)),delete:key=>request('readwrite',s=>s.delete(key)),close:()=>db.close()};
}
export async function withBackupLock(operation,locks=globalThis.navigator?.locks){
  if(!locks?.request)throw Error('Open this page in a current Chrome, Edge or Safari browser to use the complete backup.');
  return locks.request(LOCK,operation);
}
function assertIdle(storage){
  for(const key of [RESTORE_KEY,'wwhs-team-handover-journal:v1','morning-launchpad-restore:v1'])if(storage.getItem(key)!==null)throw Error('An earlier backup operation needs recovery before continuing.');
}
const put=(storage,key,value,id)=>value===null?storage.removeItem(key,{restoreId:id}):storage.setItem(key,value,{restoreId:id});
async function restoreBefore(storage,finance,backend,transaction){
  const {id,before,after,epoch}=transaction,now=await captureWorkspace(storage,finance);
  // Never roll back over a third-party change.
  for(const key of RECORD_KEYS)if(now.records[key]!==before.records[key]&&now.records[key]!==after.records[key])throw Error('Another tab changed saved work during recovery. Keep this page open and both backup files.');
  if(!same(now.finance,before.finance)&&!same(now.finance,after.finance))throw Error('Finance changed during recovery. Keep both copies for review.');
  if(!same(now.finance,before.finance))await finance.compareAndSwap(now.finance?{record:now.finance}:null,before.finance,{restoreId:id});
  const ordered=[...RECORD_KEYS].sort((a,b)=>((before.records[a]?.length||0)-(now.records[a]?.length||0))-((before.records[b]?.length||0)-(now.records[b]?.length||0)));
  for(const key of ordered)if(now.records[key]!==before.records[key])put(storage,key,before.records[key],id);
  // Keep the new generation even on rollback: old tabs must reload their state.
  storage.setItem(EPOCH_KEY,epoch,{restoreId:id});
  storage.removeItem(RESTORE_KEY,{restoreId:id});
  await backend.delete(id);
}
export async function recoverWorkspace(storage,finance,backend,{locks}={}){
  return withBackupLock(async()=>{
    const raw=storage.getItem(RESTORE_KEY);if(!raw)return false;
    const marker=JSON.parse(raw),transaction=await backend.get(marker.id);
    if(!transaction||transaction.id!==marker.id)throw Error('The interrupted restore needs its recovery copy. Keep your backup file and do not clear browser data.');
    if(marker.phase==='committed'){
      await backend.put('previous',transaction.before);
      storage.removeItem(RESTORE_KEY,{restoreId:marker.id});await backend.delete(marker.id);
    }else await restoreBefore(storage,finance,backend,transaction);
    return true;
  },locks);
}
export async function applyWorkspaceRestore(storage,finance,backend,before,after,{locks,id=crypto.randomUUID()}={}){
  validateSnapshot(before);validateSnapshot(after);
  return withBackupLock(async()=>{
    assertIdle(storage);
    if(!same(await captureWorkspace(storage,finance),before))throw Error('Saved work changed after the preview opened. Choose the backup again to see a fresh preview.');
    const transaction={id,before,after,epoch:crypto.randomUUID()};
    await backend.put(id,transaction); // Must succeed before any current record changes.
    if(!same(await captureWorkspace(storage,finance),before)){await backend.delete(id);throw Error('Saved work changed during preparation. Choose the backup again.');}
    storage.setItem(RESTORE_KEY,JSON.stringify({id,phase:'prepared'}));
    try{
      // Release space first; the full originals are durable in IndexedDB.
      const ordered=[...RECORD_KEYS].sort((a,b)=>((after.records[a]?.length||0)-(before.records[a]?.length||0))-((after.records[b]?.length||0)-(before.records[b]?.length||0)));
      for(const key of ordered){if(storage.getItem(key)!==before.records[key])throw Error('Another tab changed saved work.');if(before.records[key]!==after.records[key])put(storage,key,after.records[key],id);}
      if(!same(before.finance,after.finance))await finance.compareAndSwap(before.finance?{record:before.finance}:null,after.finance,{preservePrevious:true,restoreId:id});
      if(!same(await captureWorkspace(storage,finance),after))throw Error('The restored copy could not be verified.');
      storage.setItem(EPOCH_KEY,transaction.epoch,{restoreId:id});
      storage.setItem(RESTORE_KEY,JSON.stringify({id,phase:'committed'}),{restoreId:id});
    }catch(error){
      try{await restoreBefore(storage,finance,backend,transaction);}catch(recovery){throw Error(`${error.message} Recovery is required: ${recovery.message}`);}
      throw Error(`${error.message} The previous saved copy has been restored.`);
    }
    // A failure here leaves a committed marker; recovery only finishes cleanup.
    await backend.put('previous',before);
    storage.removeItem(RESTORE_KEY,{restoreId:id});await backend.delete(id);
    return true;
  },locks);
}
