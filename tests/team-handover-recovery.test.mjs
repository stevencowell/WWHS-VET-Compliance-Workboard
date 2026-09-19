import test from 'node:test';
import assert from 'node:assert/strict';
import {KEYS,readRaw,snapshot,createBackup,parseBackup} from '../assets/js/team-handover-core.mjs';
import {inspectTeamMetadata,hydrateTeamMetadata,prepareTeamMetadata,archiveTeamState,readTeamArchive} from '../assets/js/team-handover-payloads.mjs';
import {SAFETY_KIND,createSafetyBackup,parseTeamFile,buildReconnectPlan,prepareReconnectPlan} from '../assets/js/team-handover-recovery.mjs';
import {applyTeamTransaction} from '../assets/js/team-handover-transaction.mjs';
import {enrich} from '../morning-launchpad/assets/summary-core.mjs';

const json=JSON.stringify,copy=value=>structuredClone(value),when='2026-09-19T07:00:00.000Z';
const info=({kind,schemaVersion,data,...value})=>value;
class Storage{
  constructor(entries={}){this.values=new Map(Object.entries(entries));this.writes=[];this.fail=null;}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){if(this.fail?.(key,value))throw new DOMException('Storage full','QuotaExceededError');this.values.set(key,value);this.writes.push(key);}
  removeItem(key){this.values.delete(key);this.writes.push(key);}
}
function backend(){
  const bodies=new Map(),calls=[];let next=0;
  const api={async put(body){const id=body.id||body.transactionId;calls.push(['put',id]);if(bodies.has(id))throw Error('Immutable ID exists');bodies.set(id,copy(body));},
    async get(id){calls.push(['get',id]);return copy(bodies.get(id));},async delete(id){calls.push(['delete',id]);bodies.delete(id);}};
  return {bodies,calls,api,options:{backend:api,createId:()=>`private-copy-${++next}`}};
}
function fixture(){
  const storage=new Storage();
  const privateCard=enrich({id:'private-one',taskKey:'private-one',title:'PRIVATE family appointment',action:'Make the appointment',noteText:'PRIVATE note',workstream:'personal'});
  const teamCard=enrich({id:'shared-one',taskKey:'workboard:vet:task-one',title:'Shared task',action:'Check the task',noteText:'Saved team note — 🛠️',workstream:'vet',
    origin:{wing:'vet',taskId:'task-one',recordKey:'task-one',route:'#task/task-one',cycle:'2026'}});
  storage.values.set(KEYS.inbox,json({version:2,items:[privateCard,teamCard],briefing:'PRIVATE mail briefing'}));
  storage.values.set(KEYS.vet,json({schemaVersion:3,records:{'task-one':{status:'in-progress',exceptionSummary:'Exact saved note — 澳洲 🛠️'}},privateLinks:{source:'PRIVATE URL'}}));
  storage.values.set('finance-sentinel','PRIVATE Finance data');
  const data=snapshot(storage),file=createBackup({snapshot:data,editor:'Steve',workspaceId:'original-team',exportId:'file-one',savedAt:when});
  const meta={version:1,lastFile:info(file),active:{id:'session-one',editor:'Steve',phase:'editing',startedAt:when,baselineData:data},
    pendingExport:null,recovery:{capturedAt:when,lastFile:null,data,raw:{[KEYS.inbox]:'PRIVATE old inbox'}}};
  storage.values.set(KEYS.metadata,json(meta));
  return {storage,data,file,meta};
}
const reconnectOptions={editor:'Steve',sessionId:'new-session',startedAt:when,workspaceId:'new-safety-team',exportId:'new-safety-root',createId:()=> 'new-team-card'};
const locks={async request(_name,_options,callback){return callback({});}};
const all=storage=>Object.fromEntries(storage.values);

test('current shared safety snapshot needs no metadata or private copies and round-trips exact notes',()=>{
  const f=fixture();f.storage.values.set(KEYS.metadata,'BROKEN PRIVATE metadata');
  const before=all(f.storage),file=createSafetyBackup({snapshot:snapshot(f.storage),editor:'Steve',savedAt:when,snapshotId:'safety-one'});
  assert.equal(file.kind,SAFETY_KIND);assert.deepEqual(parseTeamFile(json(file)),{type:'safety',file,data:file.data});
  assert.deepEqual(file.data,f.data);assert.equal(json(file).includes('PRIVATE'),false);
  for(const field of ['workspaceId','revision','parentExportId','metadataRaw','archiveRef'])assert.equal(Object.hasOwn(file,field),false);
  assert.throws(()=>parseBackup(file));assert.deepEqual(all(f.storage),before);assert.equal(f.storage.writes.length,0);
});

test('normal and safety parsing rejects private or unsupported fields, incomplete data and invalid identity',()=>{
  const f=fixture(),file=createSafetyBackup({snapshot:f.data,editor:'Steve',savedAt:when,snapshotId:'safety-one'});
  assert.deepEqual(parseTeamFile(f.file).file,f.file);assert.equal(parseTeamFile(f.file).type,'handover');
  for(const malformed of [{...file,metadataRaw:'PRIVATE'},{...file,revision:1},{...file,snapshotId:''},{...file,schemaVersion:2},
    {...file,data:{...file.data,extra:'private'}},{...file,data:{...file.data,vet:{...file.data.vet,privateLinks:{}}}},
    {...file,data:{...file.data,inbox:{version:2,items:[enrich({id:'private',title:'PRIVATE',taskKey:'private'})]}}}])assert.throws(()=>parseTeamFile(malformed));
  const missing=copy(file);delete missing.note;assert.throws(()=>parseTeamFile(missing));
  assert.throws(()=>parseTeamFile('{'));assert.throws(()=>createSafetyBackup({snapshot:{...f.data,review:null},editor:'Steve'}));
});

test('inspection reports missing copies independently without replacing original metadata or healthy history',async()=>{
  const f=fixture(),db=backend();f.meta.pendingExport=createBackup({snapshot:f.data,previous:f.file,editor:'Steve',exportId:'pending-two',savedAt:when});
  const compact=await prepareTeamMetadata(f.meta,db.options),raw=`  ${json(compact)}  `,before=json(compact);
  db.bodies.delete(compact.active.baselineRef.id);
  const inspected=await inspectTeamMetadata(raw,db.options);
  assert.equal(inspected.raw,raw);assert.deepEqual(inspected.stored,compact);assert.equal(json(compact),before);
  assert.equal(inspected.complete,false);assert.deepEqual(inspected.issues.map(item=>item.section),['baseline']);
  assert.equal(Object.hasOwn(inspected.hydrated.active,'baselineData'),false);
  assert.deepEqual(inspected.hydrated.recovery.data,f.data);assert.deepEqual(inspected.hydrated.pendingExport,f.meta.pendingExport);
  await assert.rejects(hydrateTeamMetadata(compact,db.options),/copy is missing/);
  db.bodies.delete(compact.pendingExport.payloadRef.id);db.bodies.delete(compact.recovery.dataRef.id);
  const missing=await inspectTeamMetadata(raw,db.options);assert.deepEqual(missing.issues.map(item=>item.section),['baseline','recovery','pending']);
  assert.deepEqual(missing.stored,compact);assert.equal(missing.hydrated.pendingExport,null);
});

test('inspection preserves malformed raw metadata and reads healthy recovery despite damaged active section',async()=>{
  const f=fixture(),db=backend(),compact=await prepareTeamMetadata(f.meta,db.options);
  compact.active.phase='invalid';const result=await inspectTeamMetadata(compact,db.options);
  assert.deepEqual(result.issues.map(item=>item.section),['baseline']);assert.deepEqual(result.hydrated.recovery.data,f.data);
  const raw='{PRIVATE damaged metadata',bad=await inspectTeamMetadata(raw,db.options);
  assert.equal(bad.raw,raw);assert.equal(bad.complete,false);assert.equal(bad.hydrated,null);assert.equal(bad.issues[0].section,'metadata');
  assert.deepEqual(await inspectTeamMetadata(null,{backend:null}),{raw:null,stored:null,hydrated:null,complete:true,issues:[]});
});

test('inspection isolates unreadable database failures and inconsistent inline/ref history',async()=>{
  const f=fixture(),db=backend(),compact=await prepareTeamMetadata(f.meta,db.options);
  compact.active.baselineData=copy(f.data);compact.active.baselineData.vet.records['task-one'].status='completed';
  const before=json(compact),result=await inspectTeamMetadata(compact,db.options);
  assert.deepEqual(result.issues.map(item=>item.section),['baseline']);assert.equal(json(compact),before);assert.deepEqual(result.hydrated.recovery.data,f.data);
  const unavailable=await inspectTeamMetadata(compact,{backend:{put:async()=>{},get:async()=>{throw Error('unavailable');}}});
  assert.deepEqual(unavailable.issues.map(item=>item.section),['baseline','recovery']);assert.deepEqual(unavailable.stored,compact);
});

test('malformed header/editor and an exporting session without its file report damaged history while keeping healthy recovery',async()=>{
  const f=fixture(),db=backend(),compact=await prepareTeamMetadata(f.meta,db.options);
  compact.lastFile.changes={invalid:true};compact.active.editor={invalid:true};
  let result=await inspectTeamMetadata(compact,db.options);
  assert.equal(result.complete,false);assert.deepEqual(result.issues.map(issue=>issue.section),['metadata','baseline']);assert.deepEqual(result.hydrated.recovery.data,f.data);
  const exporting=copy(f.meta);exporting.active.phase='exporting';exporting.pendingExport=null;
  result=await inspectTeamMetadata(exporting,db.options);assert.equal(result.complete,false);assert.deepEqual(result.issues.map(issue=>issue.section),['pending']);assert.deepEqual(result.hydrated.recovery.data,f.data);
});

test('preview and cancellation make no writes even when the old private baseline has gone',async()=>{
  const f=fixture(),db=backend(),compact=await prepareTeamMetadata(f.meta,db.options);db.bodies.delete(compact.active.baselineRef.id);
  f.storage.values.set(KEYS.metadata,json(compact));const before=all(f.storage),calls=db.calls.length;
  const next=createBackup({snapshot:f.data,previous:f.file,editor:'Steve',exportId:'file-two',savedAt:when});
  const plan=buildReconnectPlan(f.storage,next,reconnectOptions);
  assert.equal(plan.lineage,'existing-team');assert.equal(plan.before[KEYS.metadata],json(compact));
  assert.deepEqual(all(f.storage),before);assert.equal(f.storage.writes.length,0);assert.equal(db.calls.length,calls);
  assert.equal(Object.hasOwn(plan.after,KEYS.metadata),false);assert.deepEqual(plan.nextMetadata.active.baselineData,next.data);
});

test('reconnect retains known revision conflicts while old refs are missing',()=>{
  const f=fixture();f.meta.active={phase:'editing',baselineRef:{version:1,id:'missing',kind:'snapshot'}};
  const second=createBackup({snapshot:f.data,previous:f.file,editor:'Steve',exportId:'file-two',savedAt:when});
  f.meta.lastFile=info(second);f.storage.values.set(KEYS.metadata,json(f.meta));
  const sameRevision=createBackup({snapshot:f.data,previous:f.file,editor:'Steve',exportId:'different-two',savedAt:when});
  const wrongParent=createBackup({snapshot:f.data,previous:sameRevision,editor:'Steve',exportId:'wrong-three',savedAt:when});
  const other=createBackup({snapshot:f.data,editor:'Steve',workspaceId:'another-team',exportId:'another-one',savedAt:when});
  for(const [file,pattern] of [[f.file,/older/],[sameRevision,/same revision/],[wrongParent,/different parent/],[other,/different team/]]){
    assert.throws(()=>buildReconnectPlan(f.storage,file,{...reconnectOptions,allowUnverifiedLineage:true}),pattern);
  }
  assert.equal(f.storage.writes.length,0);
});

test('unreadable prior connection needs explicit reconnect acknowledgement; first connection does not',()=>{
  const f=fixture();f.storage.values.set(KEYS.metadata,'PRIVATE broken metadata');
  assert.throws(()=>buildReconnectPlan(f.storage,f.file,reconnectOptions),/Review and confirm/);
  const plan=buildReconnectPlan(f.storage,f.file,{...reconnectOptions,allowUnverifiedLineage:true});
  assert.equal(plan.lineage,'unverified-reconnect');assert.equal(plan.before[KEYS.metadata],'PRIVATE broken metadata');
  f.storage.values.delete(KEYS.metadata);assert.equal(buildReconnectPlan(f.storage,f.file,reconnectOptions).lineage,'first-connection');
});

test('safety restore explicitly starts fresh local lineage and preserves private native/inbox data',()=>{
  const f=fixture(),data=copy(f.data);data.vet.records['task-one'].exceptionSummary='Incoming safety note';
  const safety=createSafetyBackup({snapshot:data,editor:'Colleague',savedAt:when,snapshotId:'safety-one'});
  const plan=buildReconnectPlan(f.storage,safety,reconnectOptions);
  assert.equal(plan.sourceType,'safety');assert.equal(plan.lineage,'fresh-safety');assert.equal(plan.payload.revision,1);
  assert.equal(plan.payload.workspaceId,'new-safety-team');assert.equal(plan.payload.parentExportId,null);
  assert.deepEqual(plan.nextMetadata.lineage,{type:'safety-restored',snapshotId:'safety-one',savedAt:when});
  assert.deepEqual(snapshot(plan.after),data);assert.deepEqual(plan.beforeSnapshot,f.data);
  assert.deepEqual(JSON.parse(plan.after[KEYS.vet]).privateLinks,{source:'PRIVATE URL'});
  const beforePrivate=JSON.parse(f.storage.getItem(KEYS.inbox)).items[0];
  assert.deepEqual(JSON.parse(plan.after[KEYS.inbox]).items[0],beforePrivate);
  assert.equal(JSON.parse(plan.after[KEYS.inbox]).briefing,'PRIVATE mail briefing');assert.equal(plan.counts.privateKept,1);
  assert.equal(f.storage.getItem('finance-sentinel'),'PRIVATE Finance data');
});

test('durable preparation archives exact old raw metadata and history without leaking it into portable files',async()=>{
  const f=fixture(),db=backend(),raw=`\n${json(f.meta)}  `;f.storage.values.set(KEYS.metadata,raw);
  const plan=buildReconnectPlan(f.storage,f.file,reconnectOptions),before=all(f.storage),prepared=await prepareReconnectPlan(plan,db.options);
  const archive=await readTeamArchive(prepared.archiveRef,db.options);
  assert.equal(archive.metadataRaw,raw);assert.deepEqual(archive.data,f.data);assert.equal(archive.capturedAt,when);
  assert.equal(prepared.nextMetadata.archiveRef.kind,'archive');assert.equal(db.bodies.size,3);
  assert.equal(json(prepared.nextMetadata).includes('PRIVATE'),false);assert.deepEqual(all(f.storage),before);
  assert.deepEqual((await hydrateTeamMetadata(prepared.nextMetadata,db.options)).active.baselineData,f.data);
  const portable=createSafetyBackup({snapshot:archive.data,editor:'Steve',savedAt:when,snapshotId:'archive-safety'});
  assert.equal(json(portable).includes('PRIVATE'),false);assert.throws(()=>parseTeamFile(archive));
});

test('repeated reconnects retain original archived history through immutable references',async()=>{
  const f=fixture(),db=backend(),first=await prepareReconnectPlan(buildReconnectPlan(f.storage,f.file,reconnectOptions),db.options);
  f.storage.values.set(KEYS.metadata,first.after[KEYS.metadata]);
  const second=await prepareReconnectPlan(buildReconnectPlan(f.storage,f.file,reconnectOptions),db.options);
  assert.notDeepEqual(first.archiveRef,second.archiveRef);
  const secondArchive=await readTeamArchive(second.archiveRef,db.options),older=JSON.parse(secondArchive.metadataRaw).archiveRef;
  assert.deepEqual(older,first.archiveRef);assert.equal((await readTeamArchive(older,db.options)).metadataRaw,json(f.meta));
  assert.equal(db.calls.some(([action])=>action==='delete'),false);
});

test('archive quota failure or later preparation failure never changes any live data',async()=>{
  for(const failingWrite of [1,2,3]){
    const f=fixture(),db=backend(),before=all(f.storage),plan=buildReconnectPlan(f.storage,f.file,reconnectOptions);let writes=0;
    const put=db.api.put;db.api.put=async body=>{if(++writes===failingWrite)throw new DOMException('Full','QuotaExceededError');await put(body);};
    await assert.rejects(prepareReconnectPlan(plan,db.options),/no saved progress was changed/);
    assert.deepEqual(all(f.storage),before);assert.equal(f.storage.writes.length,0);
    if(failingWrite>1)assert.equal((await readTeamArchive({version:1,id:'private-copy-1',kind:'archive'},db.options)).metadataRaw,json(f.meta));
  }
});

test('plan mutation during asynchronous archive writes cannot alter the reviewed snapshot or CAS before map',async()=>{
  const f=fixture(),db=backend(),plan=buildReconnectPlan(f.storage,f.file,reconnectOptions),expected=copy(plan),put=db.api.put;
  db.api.put=async body=>{plan.before[KEYS.metadata]='changed by caller';plan.nextMetadata.active.editor='Changed';plan.beforeSnapshot.vet.records={};await put(body);};
  const prepared=await prepareReconnectPlan(plan,db.options);
  assert.deepEqual(prepared.before,expected.before);assert.equal(prepared.nextMetadata.active.editor,'Steve');
  assert.deepEqual((await readTeamArchive(prepared.archiveRef,db.options)).data,expected.beforeSnapshot);
});

test('guarded apply rejects either data or metadata changed after preview and retains private archive',async()=>{
  for(const changedKey of [KEYS.vet,KEYS.inbox,KEYS.metadata]){
    const f=fixture(),db=backend(),tx=backend(),prepared=await prepareReconnectPlan(buildReconnectPlan(f.storage,f.file,reconnectOptions),db.options);
    f.storage.values.set(changedKey,'NEW work from another tab');const before=all(f.storage);
    await assert.rejects(applyTeamTransaction(f.storage,prepared.before,prepared.after,{backend:tx.api,locks,createId:()=> 'tx'}),/changed in another tab/);
    assert.deepEqual(all(f.storage),before);assert.equal(f.storage.writes.length,0);
    assert.equal((await readTeamArchive(prepared.archiveRef,db.options)).metadataRaw,json(f.meta));
  }
});

test('guarded reconnect succeeds with missing old refs and retains exact archive and private data',async()=>{
  const f=fixture(),db=backend(),tx=backend(),compact=await prepareTeamMetadata(f.meta,db.options);
  db.bodies.delete(compact.active.baselineRef.id);db.bodies.delete(compact.recovery.dataRef.id);f.storage.values.set(KEYS.metadata,json(compact));
  const incoming=copy(f.data);incoming.vet.records['task-one'].exceptionSummary='Recovered shared notes';
  const next=createBackup({snapshot:incoming,previous:f.file,editor:'Colleague',exportId:'file-two',savedAt:when});
  const plan=await prepareReconnectPlan(buildReconnectPlan(f.storage,next,reconnectOptions),db.options);
  await applyTeamTransaction(f.storage,plan.before,plan.after,{backend:tx.api,locks,createId:()=> 'tx'});
  assert.deepEqual(snapshot(f.storage),incoming);assert.equal(f.storage.getItem('finance-sentinel'),'PRIVATE Finance data');
  assert.equal(JSON.parse(f.storage.getItem(KEYS.inbox)).items[0].noteText,'PRIVATE note');
  assert.equal((await inspectTeamMetadata(f.storage.getItem(KEYS.metadata),db.options)).complete,true);
  const archive=await readTeamArchive(plan.archiveRef,db.options);assert.equal(archive.metadataRaw,json(compact));assert.deepEqual(archive.data,f.data);
});

test('real transaction failure rolls back every before value while retaining the immutable reconnect archive',async()=>{
  const f=fixture(),db=backend(),tx=backend(),incoming=copy(f.data);incoming.vet.records['task-one'].exceptionSummary='Next notes';
  const next=createBackup({snapshot:incoming,previous:f.file,editor:'Steve',exportId:'file-two',savedAt:when});
  const plan=await prepareReconnectPlan(buildReconnectPlan(f.storage,next,reconnectOptions),db.options),before=all(f.storage);let failed=false;
  f.storage.fail=(key,value)=>{if(!failed&&key===KEYS.metadata&&value===plan.after[KEYS.metadata]){failed=true;return true;}return false;};
  await assert.rejects(applyTeamTransaction(f.storage,plan.before,plan.after,{backend:tx.api,locks,createId:()=> 'tx'}),/previous progress has been restored/);
  assert.deepEqual(all(f.storage),before);assert.equal(f.storage.getItem(KEYS.journal),null);
  assert.equal((await readTeamArchive(plan.archiveRef,db.options)).metadataRaw,json(f.meta));
});

test('malformed current data refuses import or safety creation before any private copies are written',()=>{
  const f=fixture(),before=all(f.storage);f.storage.values.set(KEYS.vet,'{damaged');
  assert.throws(()=>buildReconnectPlan(f.storage,f.file,reconnectOptions));assert.throws(()=>createSafetyBackup({snapshot:snapshot(f.storage),editor:'Steve'}));
  assert.equal(f.storage.writes.length,0);assert.equal(f.storage.getItem(KEYS.metadata),before[KEYS.metadata]);
});

test('archive cannot overwrite an existing immutable body or be read as a portable payload',async()=>{
  const f=fixture(),db=backend(),value={metadataRaw:json(f.meta),data:f.data,capturedAt:when},options={backend:db.api,createId:()=> 'fixed'};
  const ref=await archiveTeamState(value,options),before=copy(db.bodies.get('fixed'));
  await assert.rejects(archiveTeamState({...value,metadataRaw:'different'},options),/no saved progress was changed/);
  assert.deepEqual(db.bodies.get('fixed'),before);assert.deepEqual(await readTeamArchive(ref,options),value);
  await assert.rejects(readTeamArchive({...ref,kind:'handover'},options),/reference is invalid/);
});


test('area reconnect archives safely and changes only its own metadata lineage and data',async()=>{
  for(const scope of ['vet','tas']){
    const f=fixture(),other=scope==='vet'?'tas':'vet',metaKey=KEYS[`${scope}Metadata`],otherKey=KEYS[`${other}Metadata`],db=backend();
    f.storage.values.set(otherKey,json({unrelated:'The other area metadata stays byte-identical'}));
    const old=f.storage.getItem(KEYS.metadata),otherRaw=f.storage.getItem(otherKey),otherData=f.storage.getItem(KEYS[other]);
    const plan=buildReconnectPlan(f.storage,f.file,{...reconnectOptions,scope});
    assert.equal(plan.metadataKey,metaKey);assert.equal(plan.nextMetadata.lastFile.scope,scope);
    assert.deepEqual(plan.nextMetadata.active.baselineData[other],snapshot(new Storage())[other]);
    const prepared=await prepareReconnectPlan(plan,db.options);await applyTeamTransaction(f.storage,prepared.before,prepared.after,{backend:db.api,locks,createId:()=>`tx-${scope}`});
    assert.equal(f.storage.getItem(KEYS.metadata),old);assert.equal(f.storage.getItem(otherKey),otherRaw);assert.equal(f.storage.getItem(KEYS[other]),otherData);
    const restored=await hydrateTeamMetadata(JSON.parse(f.storage.getItem(metaKey)),db.options);assert.equal(restored.lastFile.scope,scope);
    const scoped=createBackup({snapshot:snapshot(f.storage),scope,previous:restored.lastFile,editor:'Steve',savedAt:when});
    assert.equal(scoped.revision,2);assert.equal(scoped.scope,scope);assert.equal(scoped.parentExportId,f.file.exportId);
  }
});
test('VET and TAS revision conflict checks remain independent',()=>{
  const f=fixture(),vet=createBackup({snapshot:f.data,scope:'vet',editor:'Steve',workspaceId:'vet-team',exportId:'vet-one',savedAt:when});
  f.storage.values.set(KEYS.vetMetadata,json({version:1,lastFile:info(vet),active:null,pendingExport:null}));
  f.storage.values.delete(KEYS.metadata);
  const tas=createBackup({snapshot:f.data,scope:'tas',editor:'Diane',workspaceId:'tas-team',exportId:'tas-one',savedAt:when});
  assert.equal(buildReconnectPlan(f.storage,tas,{...reconnectOptions,scope:'tas'}).lineage,'first-connection');
  assert.throws(()=>buildReconnectPlan(f.storage,vet,{...reconnectOptions,scope:'tas'}),/VET backup/);
  const fork={...vet,exportId:'other-vet-one'};assert.throws(()=>buildReconnectPlan(f.storage,fork,{...reconnectOptions,scope:'vet'}),/same revision/);
});
test('scoped safety backups roundtrip without including the other area',()=>{
  const f=fixture(),file=createSafetyBackup({snapshot:f.data,scope:'tas',editor:'Steve',savedAt:when,snapshotId:'tas-safety'});
  assert.equal(file.scope,'tas');assert.deepEqual(file.data.vet,snapshot(new Storage()).vet);
  assert.equal(parseTeamFile(json(file)).file.scope,'tas');
  assert.throws(()=>buildReconnectPlan(f.storage,file,{...reconnectOptions,scope:'vet'}),/TAS backup/);
});

test('first area migration preserves legacy revision checks and exact legacy CAS value',async()=>{
  const f=fixture(),next=createBackup({snapshot:f.data,previous:f.file,editor:'Steve',exportId:'legacy-two',savedAt:when});
  const oldMeta=json({...f.meta,lastFile:info(next)});f.storage.values.set(KEYS.metadata,oldMeta);
  assert.throws(()=>buildReconnectPlan(f.storage,f.file,{...reconnectOptions,scope:'vet'}),/older/);
  const plan=buildReconnectPlan(f.storage,next,{...reconnectOptions,scope:'vet'}),db=backend();
  assert.equal(plan.before[KEYS.metadata],oldMeta);assert.equal(plan.before[KEYS.vetMetadata],null);
  const prepared=await prepareReconnectPlan(plan,db.options);assert.equal(prepared.after[KEYS.metadata],oldMeta);
  assert.equal((await readTeamArchive(prepared.archiveRef,db.options)).metadataRaw,oldMeta);
  f.storage.values.set(KEYS.metadata,json({...f.meta,lastFile:info({...next,exportId:'competing'})}));
  await assert.rejects(applyTeamTransaction(f.storage,prepared.before,prepared.after,{backend:db.api,locks}),/changed/);
  assert.equal(f.storage.getItem(KEYS.vetMetadata),null);
});
