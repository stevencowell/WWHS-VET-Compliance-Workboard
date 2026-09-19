// Private, browser-local recovery. Portable handover files never contain this data.
import {KEYS, DATA_KEYS, recoverTransaction as recoverLegacyTransaction} from './team-handover-core.mjs?v=team-handover-1';

const LOCK_NAME='wwhs-team-handover-transaction:v2';
const DB_NAME='wwhs-team-handover-recovery', STORE_NAME='transactions';
const ALLOWED_KEYS=[...DATA_KEYS,KEYS.metadata], MAX_VALUE=12000000;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fail=message=>{throw new Error(message);};
function transactionId(value){
  if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,149}$/.test(value))fail('The team recovery reference is invalid.');
  return value;
}
function validateMaps(before,after){
  const validValue=value=>value===null||typeof value==='string'&&value.length<=MAX_VALUE;
  if(!object(before)||!object(after)||!Object.keys(after).length||Object.keys(before).length!==Object.keys(after).length||
    Object.keys(after).some(key=>!ALLOWED_KEYS.includes(key)||!Object.hasOwn(before,key)||!validValue(before[key])||!validValue(after[key])))fail('The team storage change is invalid. Nothing has been saved.');
}
function assertCurrent(storage,expected){
  for(const [key,value] of Object.entries(expected))if(storage.getItem(key)!==value)fail('Saved progress changed in another tab. Reload and reopen the latest team file before continuing.');
}
function assertNoJournal(storage){if(storage.getItem(KEYS.journal)!==null)fail('An unfinished team handover needs recovery before another change.');}
function assertMarker(storage,raw){if(storage.getItem(KEYS.journal)!==raw)fail('Another tab changed the team recovery marker. Its work has been protected.');}
function writeValue(storage,key,value){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}
const changedKeys=(before,after)=>Object.keys(after).filter(key=>before[key]!==after[key]);
const valueSize=(key,value)=>value===null?0:key.length+value.length;
function writeOrder(storage,from,to){
  // A longer JSON value can occupy less space once compressed. Measure the
  // current physical value (including legacy plain JSON), not its decoded size.
  const delta=key=>{
    const before=typeof storage.storedSize==='function'?storage.storedSize(key):valueSize(key,from[key]);
    const after=typeof storage.encodedSize==='function'?storage.encodedSize(key,to[key]):valueSize(key,to[key]);
    return after-before;
  };
  return changedKeys(from,to).map(key=>({key,delta:delta(key)})).sort((a,b)=>a.delta-b.delta).map(item=>item.key);
}
function markerText(id,phase){
  // Reserve the committed phase's extra character before changing any user data.
  return JSON.stringify({version:2,transactionId:id,phase})+(phase==='prepared'?' ':'');
}
function parseMarker(raw){
  let value;try{value=JSON.parse(raw);}catch{fail('The team recovery marker could not be read. Keep this browser data intact for recovery.');}
  if(!object(value))fail('The team recovery marker is invalid. Keep this browser data intact for recovery.');
  if(value.version===1)return value;
  if(value.version!==2||Object.keys(value).some(key=>!['version','transactionId','phase'].includes(key))||!['prepared','committed'].includes(value.phase))fail('This team recovery marker is not supported. Keep this browser data intact for recovery.');
  transactionId(value.transactionId);return value;
}
function validateBody(value,id){
  if(!object(value)||value.version!==2||value.transactionId!==id||Object.keys(value).some(key=>!['version','transactionId','before','after'].includes(key)))fail('The saved team recovery copy is invalid. No conflicting progress has been replaced.');
  transactionId(value.transactionId);validateMaps(value.before,value.after);return value;
}
function quota(error){return error?.name==='QuotaExceededError'||/quota|storage.+full/i.test(error?.message||'');}
function failure(message,cause,{recoveryRequired=false,cleanupPending=false}={}){
  const error=new Error(message);error.cause=cause;error.recoveryRequired=recoveryRequired;error.cleanupPending=cleanupPending;return error;
}

function indexedDBBackend(){
  let connection;
  function open(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      const factory=globalThis.indexedDB;
      if(!factory){reject(new Error('IndexedDB is unavailable'));return;}
      let request,settled=false;
      const rejectOnce=error=>{if(!settled){settled=true;reject(error);}};
      try{request=factory.open(DB_NAME,1);}catch(error){rejectOnce(error);return;}
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME,{keyPath:'transactionId'});};
      request.onerror=()=>rejectOnce(request.error||new Error('The recovery database could not be opened'));
      request.onblocked=()=>rejectOnce(new Error('Another page is blocking the recovery database'));
      request.onsuccess=()=>{
        const db=request.result;
        if(settled){db.close();return;}
        settled=true;db.onversionchange=()=>{db.close();connection=null;};resolve(db);
      };
    }).catch(error=>{connection=null;throw error;});
    return connection;
  }
  async function perform(mode,operation){
    const db=await open();
    return new Promise((resolve,reject)=>{
      let transaction,result,request;
      try{
        try{transaction=mode==='readwrite'?db.transaction(STORE_NAME,mode,{durability:'strict'}):db.transaction(STORE_NAME,mode);}
        catch(error){if(error?.name!=='TypeError'&&error?.name!=='NotSupportedError')throw error;transaction=db.transaction(STORE_NAME,mode);}
        transaction.oncomplete=()=>resolve(result);
        transaction.onabort=()=>reject(transaction.error||request?.error||new Error('The recovery database change was cancelled'));
        transaction.onerror=()=>reject(transaction.error||request?.error||new Error('The recovery database change failed'));
        request=operation(transaction.objectStore(STORE_NAME));
        request.onsuccess=()=>{result=request.result;};
      }catch(error){try{transaction?.abort();}catch{}reject(error);}
    });
  }
  return {
    // add(), rather than put(), never overwrites a previous transaction's copy.
    put:body=>perform('readwrite',store=>store.add(body)),
    get:id=>perform('readonly',store=>store.get(id)),
    delete:id=>perform('readwrite',store=>store.delete(id))
  };
}
let defaultBackend;
function backendFor(options){
  const backend=options.backend===undefined?(defaultBackend??=indexedDBBackend()):options.backend;
  if(!backend||['put','get','delete'].some(method=>typeof backend[method]!=='function'))fail('This browser cannot keep the recovery copy needed for a team import. Your progress is unchanged.');
  return backend;
}
async function withLock(options,action){
  const locks=options.locks===undefined?globalThis.navigator?.locks:options.locks;
  if(typeof locks?.request!=='function')fail('This browser cannot protect a team handover across tabs. Use an up-to-date browser with this page opened securely. Your progress is unchanged.');
  let entered=false;
  try{
    return await locks.request(LOCK_NAME,{mode:'exclusive',ifAvailable:true},lock=>{
      entered=true;if(!lock)fail('Another tab is handling a team handover. Wait for it to finish, then try again.');return action();
    });
  }catch(error){
    if(entered)throw error;
    throw failure('This browser could not protect the team handover across tabs. Your progress is unchanged.',error);
  }
}
async function deleteOwned(backend,id){try{await backend.delete(id);return false;}catch{return true;}}

function rollbackValues(storage,body,rawMarker){
  assertMarker(storage,rawMarker);
  const expected={};
  for(const key of Object.keys(body.before)){
    const current=storage.getItem(key);
    if(current!==body.before[key]&&current!==body.after[key])fail('Progress changed while the handover was interrupted. No conflicting values were replaced; the recovery copy has been kept.');
    expected[key]=current;
  }
  // Return space released by growing keys before restoring keys that had shrunk.
  for(const key of writeOrder(storage,expected,body.before)){
    assertMarker(storage,rawMarker);assertCurrent(storage,expected);
    writeValue(storage,key,body.before[key]);expected[key]=body.before[key];
  }
  assertCurrent(storage,body.before);assertMarker(storage,rawMarker);storage.removeItem(KEYS.journal);
}
async function clearCommitted(storage,body,rawMarker,backend){
  try{assertMarker(storage,rawMarker);assertCurrent(storage,body.after);storage.removeItem(KEYS.journal);}
  catch{return {committed:true,cleanupPending:true};}
  // The marker must disappear first: a crash may leave an unused private copy,
  // but must never leave a recovery marker pointing to a deleted copy.
  return {committed:true,cleanupPending:await deleteOwned(backend,body.transactionId)};
}

export async function applyTeamTransaction(storage,beforeInput,afterInput,options={}){
  validateMaps(beforeInput,afterInput);
  // Callers cannot alter the plan while a Web Lock or database write is awaited.
  const before={...beforeInput},after={...afterInput};
  return withLock(options,async()=>{
    assertNoJournal(storage);assertCurrent(storage,before);
    const changed=changedKeys(before,after);
    if(changed.length<=1){
      if(changed.length){
        try{writeValue(storage,changed[0],after[changed[0]]);}
        catch(error){throw failure('This browser could not save the change. Your saved progress is unchanged.',error);}
      }
      return {committed:true,cleanupPending:false};
    }
    const backend=backendFor(options),id=transactionId((options.createId||(()=>globalThis.crypto.randomUUID()))());
    const body={version:2,transactionId:id,before,after};
    try{await backend.put(body);}
    catch(error){throw failure('The browser could not save the recovery copy, so the import did not start and your progress is unchanged.',error);}
    try{
      // Both native progress and another marker may have changed during IDB work.
      assertNoJournal(storage);assertCurrent(storage,before);
    }catch(error){await deleteOwned(backend,id);throw error;}
    const prepared=markerText(id,'prepared'),committed=markerText(id,'committed');
    try{storage.setItem(KEYS.journal,prepared);}
    catch(error){await deleteOwned(backend,id);throw failure('The browser could not reserve the small recovery marker. The import did not start and your progress is unchanged.',error);}
    try{
      assertMarker(storage,prepared);assertCurrent(storage,before);
      const expected={...before};
      for(const key of writeOrder(storage,before,after)){
        assertMarker(storage,prepared);assertCurrent(storage,expected);
        writeValue(storage,key,after[key]);expected[key]=after[key];
      }
      assertMarker(storage,prepared);assertCurrent(storage,after);
      storage.setItem(KEYS.journal,committed);
      assertMarker(storage,committed);
    }catch(error){
      try{rollbackValues(storage,body,prepared);}
      catch(recoveryError){throw failure('The import did not finish and recovery is required. Its private recovery copy has been kept.',recoveryError,{recoveryRequired:true});}
      const cleanupPending=await deleteOwned(backend,id);
      throw failure(quota(error)?'There was not enough browser storage to finish the import. Your previous progress has been restored.':'The import could not finish. Your previous progress has been restored.',error,{cleanupPending});
    }
    return clearCommitted(storage,body,committed,backend);
  });
}

export async function recoverTeamTransaction(storage,options={}){
  return withLock(options,async()=>{
    const raw=storage.getItem(KEYS.journal);if(raw===null)return {status:'none'};
    const marker=parseMarker(raw);
    // Existing v1 copies already contain their complete rollback data locally.
    if(marker.version===1)return recoverLegacyTransaction(storage);
    const backend=backendFor(options);let body;
    try{body=await backend.get(marker.transactionId);}
    catch(error){throw failure('The private recovery copy could not be opened. Saved progress and its recovery marker have been kept.',error,{recoveryRequired:true});}
    assertMarker(storage,raw);
    if(!body)throw failure('The private recovery copy is missing. Saved progress and its recovery marker have been kept; another import cannot start yet.',null,{recoveryRequired:true});
    validateBody(body,marker.transactionId);
    if(marker.phase==='committed'){
      // A later external edit is never overwritten to make an old commit match.
      assertCurrent(storage,body.after);
      const result=await clearCommitted(storage,body,raw,backend);
      return {status:'committed',cleanupPending:result.cleanupPending};
    }
    try{rollbackValues(storage,body,raw);}
    catch(error){throw failure('Recovery could not finish. Saved progress and the private recovery copy have been kept for another attempt. '+error.message,error,{recoveryRequired:true});}
    return {status:'rolled-back',cleanupPending:await deleteOwned(backend,marker.transactionId)};
  });
}
