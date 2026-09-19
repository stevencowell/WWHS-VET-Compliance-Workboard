import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS} from '../assets/js/team-handover-core.mjs';
import {applyTeamTransaction,recoverTeamTransaction} from '../assets/js/team-handover-transaction.mjs';

const copy=value=>structuredClone(value),json=JSON.stringify;
const ID='transaction-one';
const marker=(phase='prepared',id=ID)=>json({version:2,transactionId:id,phase})+(phase==='prepared'?' ':'');
const size=entries=>[...entries].reduce((total,[key,value])=>total+key.length+value.length,0);
class Storage{
  constructor(entries,log=[]){this.values=new Map(Object.entries(entries));this.log=log;this.capacity=Infinity;this.failSet=null;this.failRemove=null;this.attempts=[];}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){
    this.attempts.push({key,value});if(this.failSet?.(key,value))throw new DOMException('Storage quota exceeded','QuotaExceededError');
    const next=new Map(this.values);next.set(key,String(value));if(size(next)>this.capacity)throw new DOMException('Storage quota exceeded','QuotaExceededError');
    this.values=next;this.log.push(key===KEYS.journal?`marker:${JSON.parse(value).phase}`:`write:${key}`);
  }
  removeItem(key){this.attempts.push({key,value:null});if(this.failRemove?.(key))throw new Error('Storage removal blocked');this.values.delete(key);this.log.push(`remove:${key}`);}
}
function lockManager(){
  return {held:false,calls:[],async request(name,options,callback){
    this.calls.push({name,options});if(this.held)return callback(null);this.held=true;
    try{return await callback({name});}finally{this.held=false;}
  }};
}
function backend(log=[]){
  return {records:new Map(),failPut:false,failGet:false,failDelete:false,onPut:null,onGet:null,
    async put(body){log.push('put:start');if(this.failPut)throw new DOMException('IDB quota exceeded','QuotaExceededError');if(this.records.has(body.transactionId))throw new Error('Duplicate recovery ID');if(this.onPut)await this.onPut(body);this.records.set(body.transactionId,copy(body));log.push('put:complete');},
    async get(id){log.push('get');if(this.failGet)throw new Error('Database unavailable');if(this.onGet)await this.onGet(id);return copy(this.records.get(id));},
    async delete(id){log.push('delete');if(this.failDelete)throw new Error('Database cleanup unavailable');this.records.delete(id);}
  };
}
function fixture(){
  const before={[KEYS.vet]:'old-vet',[KEYS.tas]:'old-tas',[KEYS.inbox]:'private-inbox',[KEYS.metadata]:'old-metadata'};
  const after={...before,[KEYS.vet]:'new-vet',[KEYS.tas]:'new-tas'};
  const log=[],storage=new Storage(before,log),db=backend(log),locks=lockManager();
  return {before,after,log,storage,db,locks,options:{backend:db,locks,createId:()=>ID}};
}
function fullValues(storage,keys){return Object.fromEntries(Object.keys(keys).map(key=>[key,storage.getItem(key)]));}
function savedRecovery(f,phase='prepared',body={version:2,transactionId:ID,before:f.before,after:f.after}){
  f.storage.values.set(KEYS.journal,marker(phase));f.db.records.set(ID,copy(body));return body;
}
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('no-op and single-key metadata saves use a guarded atomic write without IDB or a journal',async()=>{
  const f=fixture(),badBackend={};
  assert.deepEqual(await applyTeamTransaction(f.storage,f.before,f.before,{locks:f.locks,backend:badBackend}),{committed:true,cleanupPending:false});
  assert.equal(f.storage.attempts.length,0);
  const after={...f.before,[KEYS.metadata]:'compact-new-metadata'};
  await applyTeamTransaction(f.storage,f.before,after,{locks:f.locks,backend:badBackend});
  assert.equal(f.storage.attempts.length,1);assert.equal(f.storage.attempts[0].key,KEYS.metadata);assert.equal(f.storage.getItem(KEYS.journal),null);
  assert.deepEqual(fullValues(f.storage,after),after);assert.equal(f.locks.calls.length,2);
});
test('single-key quota failure is plain, leaves all progress intact, and creates no journal',async()=>{
  const f=fixture();f.storage.capacity=size(f.storage.values);
  await assert.rejects(applyTeamTransaction(f.storage,f.before,{...f.before,[KEYS.metadata]:'x'.repeat(1000)},f.options),/saved progress is unchanged/);
  assert.deepEqual(fullValues(f.storage,f.before),f.before);assert.equal(f.storage.getItem(KEYS.journal),null);assert.equal(f.db.records.size,0);
});
test('single-key saves still compare unchanged inbox and native stores',async()=>{
  const f=fixture();f.storage.values.set(KEYS.inbox,'new private work in another tab');
  await assert.rejects(applyTeamTransaction(f.storage,f.before,{...f.before,[KEYS.metadata]:'next'},f.options),/changed in another tab/);
  assert.equal(f.storage.attempts.length,0);assert.equal(f.storage.getItem(KEYS.inbox),'new private work in another tab');
});
test('unsafe map keys, malformed values and unavailable Web Locks fail before writing',async()=>{
  const f=fixture();
  for(const [before,after] of [[{},{}],[{other:null},{other:'unsafe'}],[{[KEYS.vet]:undefined},{[KEYS.vet]:'next'}],[f.before,{[KEYS.vet]:'next'}]])await assert.rejects(applyTeamTransaction(f.storage,before,after,f.options),/invalid/);
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,{backend:f.db,locks:null}),/cannot protect/);
  await assert.rejects(recoverTeamTransaction(f.storage,{backend:f.db,locks:null}),/cannot protect/);
  assert.equal(f.storage.attempts.length,0);assert.equal(f.db.records.size,0);
});
test('the recovery copy finishes before a tiny marker or any data write; cleanup removes marker first',async()=>{
  const f=fixture();await applyTeamTransaction(f.storage,f.before,f.after,f.options);
  assert.ok(f.log.indexOf('put:complete')<f.log.indexOf('marker:prepared'));
  assert.ok(f.log.indexOf('marker:prepared')<f.log.findIndex(value=>value.startsWith('write:')));
  assert.ok(f.log.indexOf('marker:committed')<f.log.indexOf(`remove:${KEYS.journal}`));
  assert.ok(f.log.indexOf(`remove:${KEYS.journal}`)<f.log.indexOf('delete'));
  const markers=f.storage.attempts.filter(item=>item.key===KEYS.journal&&item.value!==null).map(item=>item.value);
  assert.equal(markers.length,2);assert.equal(markers[0].length,markers[1].length);assert.ok(markers.every(value=>value.length<200));
  assert.ok(markers.every(value=>!value.includes('private-inbox')));assert.deepEqual(fullValues(f.storage,f.after),f.after);assert.equal(f.db.records.size,0);
});
test('nothing is written while asynchronous recovery preparation is outstanding',async()=>{
  const f=fixture(),gate=deferred(),started=deferred();f.db.onPut=async()=>{started.resolve();await gate.promise;};
  const applying=applyTeamTransaction(f.storage,f.before,f.after,f.options);await started.promise;
  assert.equal(f.storage.attempts.length,0);assert.equal(f.storage.getItem(KEYS.journal),null);assert.equal(f.db.records.size,0);
  gate.resolve();await applying;assert.deepEqual(fullValues(f.storage,f.after),f.after);
});
test('IDB unavailability or quota stops before touching browser progress',async()=>{
  const f=fixture();f.db.failPut=true;
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),/import did not start.*unchanged/);
  assert.deepEqual(fullValues(f.storage,f.before),f.before);assert.equal(f.storage.attempts.length,0);assert.equal(f.storage.getItem(KEYS.journal),null);
});
test('a changed unchanged-store during async prepare is detected and its new work preserved',async()=>{
  const f=fixture();f.db.onPut=()=>{f.storage.values.set(KEYS.inbox,'new private work');};
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),/changed in another tab/);
  assert.equal(f.storage.getItem(KEYS.vet),f.before[KEYS.vet]);assert.equal(f.storage.getItem(KEYS.inbox),'new private work');assert.equal(f.storage.attempts.length,0);assert.equal(f.db.records.size,0);
});
test('caller mutation during async prepare cannot rewrite the captured plan',async()=>{
  const f=fixture(),expectedAfter=copy(f.after);f.db.onPut=()=>{f.after[KEYS.vet]='caller changed this';f.before[KEYS.inbox]='caller changed baseline';};
  await applyTeamTransaction(f.storage,f.before,f.after,f.options);assert.deepEqual(fullValues(f.storage,expectedAfter),expectedAfter);
});
test('a competing marker appearing during async prepare is never removed',async()=>{
  const f=fixture(),other=marker('prepared','another-transaction');f.db.onPut=()=>{f.storage.values.set(KEYS.journal,other);};
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),/needs recovery/);
  assert.equal(f.storage.getItem(KEYS.journal),other);assert.deepEqual(fullValues(f.storage,f.before),f.before);assert.equal(f.db.records.size,0);
});
test('Web Locks reject a second handover or recovery while preparation is in progress',async()=>{
  const f=fixture(),gate=deferred(),started=deferred();f.db.onPut=async()=>{started.resolve();await gate.promise;};
  const applying=applyTeamTransaction(f.storage,f.before,f.after,f.options);await started.promise;
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),/Another tab is handling/);
  await assert.rejects(recoverTeamTransaction(f.storage,f.options),/Another tab is handling/);
  gate.resolve();await applying;assert.equal(f.locks.held,false);
});
test('failure to reserve the local marker leaves all original data intact',async()=>{
  const f=fixture();f.storage.capacity=size(f.storage.values);
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),/small recovery marker.*unchanged/);
  assert.deepEqual(fullValues(f.storage,f.before),f.before);assert.equal(f.storage.getItem(KEYS.journal),null);assert.equal(f.db.records.size,0);
});
test('failure at either data write or the commit marker restores the exact original raw stores',async()=>{
  for(const stage of ['first','second','commit']){
    const f=fixture();let dataWrites=0,failed=false;
    f.storage.failSet=(key,value)=>{
      if(failed)return false;
      if(key!==KEYS.journal)dataWrites++;
      const shouldFail=stage==='commit'?key===KEYS.journal&&JSON.parse(value).phase==='committed':key!==KEYS.journal&&dataWrites===(stage==='first'?1:2);
      if(shouldFail)failed=true;return shouldFail;
    };
    await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),/previous progress has been restored/);
    assert.deepEqual(fullValues(f.storage,f.before),f.before);assert.equal(f.storage.getItem(KEYS.journal),null);assert.equal(f.db.records.size,0);
  }
});
test('real capacity quota restores shrinking keys before growing original keys',async()=>{
  const before={[KEYS.vet]:'a'.repeat(1000),[KEYS.tas]:'b'.repeat(10),[KEYS.review]:'c'.repeat(10)};
  const after={[KEYS.vet]:'a'.repeat(10),[KEYS.tas]:'b'.repeat(1000),[KEYS.review]:'c'.repeat(2010)};
  const storage=new Storage(before),db=backend(),locks=lockManager();storage.capacity=size(storage.values)+KEYS.journal.length+marker().length;
  await assert.rejects(applyTeamTransaction(storage,before,after,{backend:db,locks,createId:()=>ID}),/previous progress has been restored/);
  assert.deepEqual(fullValues(storage,before),before);assert.equal(storage.getItem(KEYS.journal),null);assert.equal(db.records.size,0);
  const writes=storage.attempts.filter(item=>item.key!==KEYS.journal);
  const restoredA=writes.findIndex(item=>item.key===KEYS.vet&&item.value===before[KEYS.vet]);
  const restoredB=writes.findIndex(item=>item.key===KEYS.tas&&item.value===before[KEYS.tas]);assert.ok(restoredB<restoredA);
});
test('a large existing inbox can be imported without duplicating it in localStorage',async()=>{
  const f=fixture(),large='private email content '.repeat(100000);f.before[KEYS.inbox]=large;f.after[KEYS.inbox]=large.slice(0,-1)+'X';
  f.storage=new Storage(f.before,f.log);f.storage.capacity=size(f.storage.values)+KEYS.journal.length+marker().length;
  await applyTeamTransaction(f.storage,f.before,f.after,f.options);
  assert.equal(f.storage.getItem(KEYS.inbox),f.after[KEYS.inbox]);assert.equal(f.storage.getItem(KEYS.journal),null);assert.equal(f.db.records.size,0);
});
test('failed rollback keeps the body and prepared marker for a later successful recovery',async()=>{
  const f=fixture();let afterVet=false;
  f.storage.failSet=(key,value)=>{if(key===KEYS.vet&&value===f.after[KEYS.vet]){afterVet=true;return false;}return afterVet&&key!==KEYS.journal;};
  await assert.rejects(applyTeamTransaction(f.storage,f.before,f.after,f.options),error=>error.recoveryRequired===true);
  assert.equal(JSON.parse(f.storage.getItem(KEYS.journal)).phase,'prepared');assert.ok(f.db.records.has(ID));
  f.storage.failSet=null;assert.deepEqual(await recoverTeamTransaction(f.storage,f.options),{status:'rolled-back',cleanupPending:false});assert.deepEqual(fullValues(f.storage,f.before),f.before);
});
test('prepared recovery restores partial writes; committed recovery retains the committed data',async()=>{
  const prepared=fixture();savedRecovery(prepared);prepared.storage.values.set(KEYS.vet,prepared.after[KEYS.vet]);
  assert.equal((await recoverTeamTransaction(prepared.storage,prepared.options)).status,'rolled-back');assert.deepEqual(fullValues(prepared.storage,prepared.before),prepared.before);
  const committed=fixture();savedRecovery(committed,'committed');for(const [key,value] of Object.entries(committed.after))committed.storage.values.set(key,value);
  assert.equal((await recoverTeamTransaction(committed.storage,committed.options)).status,'committed');assert.deepEqual(fullValues(committed.storage,committed.after),committed.after);
  assert.equal(prepared.db.records.size,0);assert.equal(committed.db.records.size,0);
});
test('missing, unreadable and invalid recovery bodies fail closed with their marker retained',async()=>{
  for(const kind of ['missing','unreadable','wrong-id','unknown-version','bad-value','unknown-key']){
    const f=fixture(),body=savedRecovery(f);f.storage.values.set(KEYS.vet,f.after[KEYS.vet]);
    if(kind==='missing')f.db.records.clear();if(kind==='unreadable')f.db.failGet=true;
    if(kind==='wrong-id')body.transactionId='wrong';if(kind==='unknown-version')body.version=99;
    if(kind==='bad-value')body.before[KEYS.vet]=42;if(kind==='unknown-key'){body.before.other=null;body.after.other='bad';}
    if(!['missing','unreadable'].includes(kind))f.db.records.set(ID,body);
    const before=new Map(f.storage.values);await assert.rejects(recoverTeamTransaction(f.storage,f.options));assert.deepEqual(f.storage.values,before,kind);assert.equal(f.storage.attempts.length,0);
  }
});
test('recovery never overwrites conflicting edits or a marker replaced during the database read',async()=>{
  const f=fixture();savedRecovery(f);f.storage.values.set(KEYS.inbox,'new private work');const before=new Map(f.storage.values);
  await assert.rejects(recoverTeamTransaction(f.storage,f.options),/conflicting values/);assert.deepEqual(f.storage.values,before);
  const other=fixture();savedRecovery(other);const competing=marker('prepared','competing');other.db.onGet=()=>other.storage.values.set(KEYS.journal,competing);
  await assert.rejects(recoverTeamTransaction(other.storage,other.options),/marker/);assert.equal(other.storage.getItem(KEYS.journal),competing);assert.equal(other.db.records.size,1);
});
test('marker cleanup failure keeps committed data and its recovery body',async()=>{
  const f=fixture();f.storage.failRemove=key=>key===KEYS.journal;
  assert.deepEqual(await applyTeamTransaction(f.storage,f.before,f.after,f.options),{committed:true,cleanupPending:true});
  assert.deepEqual(fullValues(f.storage,f.after),f.after);assert.equal(JSON.parse(f.storage.getItem(KEYS.journal)).phase,'committed');assert.ok(f.db.records.has(ID));
  f.storage.failRemove=null;assert.equal((await recoverTeamTransaction(f.storage,f.options)).status,'committed');assert.equal(f.db.records.size,0);
});
test('IDB cleanup failure occurs only after marker removal and cannot block saved progress',async()=>{
  const f=fixture();f.db.failDelete=true;
  assert.deepEqual(await applyTeamTransaction(f.storage,f.before,f.after,f.options),{committed:true,cleanupPending:true});
  assert.equal(f.storage.getItem(KEYS.journal),null);assert.ok(f.db.records.has(ID));assert.deepEqual(fullValues(f.storage,f.after),f.after);
  assert.deepEqual(await recoverTeamTransaction(f.storage,f.options),{status:'none'});
});
test('legacy v1 recovery still uses its original local copy under the Web Lock',async()=>{
  const f=fixture();f.storage.values.set(KEYS.journal,json({version:1,transactionId:ID,phase:'prepared',before:f.before,after:f.after}));f.storage.values.set(KEYS.vet,f.after[KEYS.vet]);
  const result=await recoverTeamTransaction(f.storage,{locks:f.locks,backend:{}});assert.deepEqual(result,{status:'rolled-back'});
  assert.deepEqual(fullValues(f.storage,f.before),f.before);assert.equal(f.storage.getItem(KEYS.journal),null);assert.equal(f.locks.calls.length,1);
});
