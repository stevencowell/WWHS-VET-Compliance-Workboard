import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTeamMetadata,hydrateTeamMetadata} from '../assets/js/team-handover-payloads.mjs';
import {KEYS,snapshot,createBackup,parseBackup} from '../assets/js/team-handover-core.mjs';
import {enrich} from '../morning-launchpad/assets/summary-core.mjs';

const json=JSON.stringify,copy=value=>JSON.parse(json(value));
function fixture(){
  const data=snapshot({getItem:()=>null});
  data.vet.records.task={status:'in-progress',exceptionSummary:'Long native note '+ 'n'.repeat(100000)};
  const origin={wing:'vet',taskId:'task',recordKey:'task',route:'#task/task',cycle:'2026'};
  const card=enrich({id:'test',taskKey:'workboard:vet:task',title:'Shared task',action:'Check reply',origin,workstream:'vet',noteText:'Shared working note '+ 'x'.repeat(100000)});
  const raw={getItem:key=>key===KEYS.inbox?json({version:2,items:[card]}):null};
  data.inbox=snapshot(raw).inbox;
  const payload=createBackup({snapshot:data,editor:'Steve',workspaceId:'test-team',exportId:'export-one',savedAt:'2026-09-19T00:00:00.000Z',note:'Keep exact notes.'});
  const {data:ignored,...lastFile}=payload;
  return {version:1,lastFile,active:{id:'session-one',phase:'exporting',editor:'Steve',baselineData:data},pendingExport:payload,recovery:{capturedAt:'2026-09-19T00:00:00.000Z',data,raw:{[KEYS.inbox]:'PRIVATE OLD INBOX COPY'}}};
}
function setup(){
  const bodies=new Map(),calls=[];let next=0;
  const backend={
    async put(body){calls.push(['put',body.id]);if(bodies.has(body.id))throw Error('Duplicate immutable ID');bodies.set(body.id,copy(body));},
    async get(id){calls.push(['get',id]);return bodies.has(id)?copy(bodies.get(id)):undefined;}
  };
  return {bodies,calls,backend,options:{backend,createId:()=>`body-${++next}`}};
}

test('three large copies become small refs and hydrate losslessly without portable reference fields',async()=>{
  const context=setup(),original=fixture(),before=json(original);
  const compact=await prepareTeamMetadata(original,context.options);
  assert.equal(json(original),before);assert.equal(context.bodies.size,3);
  assert.ok(json(compact).length<2500);assert.ok(json(original).length>600000);
  assert.equal(Object.hasOwn(compact.active,'baselineData'),false);
  assert.equal(Object.hasOwn(compact.recovery,'data'),false);
  assert.equal(Object.hasOwn(compact.recovery,'raw'),false);
  assert.equal(Object.hasOwn(compact.pendingExport,'data'),false);
  assert.equal(json(compact).includes('Long native note'),false);
  const hydrated=await hydrateTeamMetadata(compact,context.options);
  assert.deepEqual(hydrated.active.baselineData,original.active.baselineData);
  assert.deepEqual(hydrated.recovery.data,original.recovery.data);
  assert.equal(json(hydrated.pendingExport),json(original.pendingExport));
  assert.deepEqual(parseBackup(json(hydrated.pendingExport)),original.pendingExport);
});

test('unchanged hydrated or compact metadata reuses immutable refs',async()=>{
  const context=setup(),compact=await prepareTeamMetadata(fixture(),context.options);
  assert.deepEqual(await prepareTeamMetadata(compact,context.options),compact);
  const hydrated=await hydrateTeamMetadata(compact,context.options);
  assert.deepEqual(await prepareTeamMetadata(hydrated,context.options),compact);
  assert.equal(context.calls.filter(call=>call[0]==='put').length,3);
});

test('legacy inline metadata reads without IndexedDB and migrates only when prepared',async()=>{
  const original=fixture(),before=json(original);
  const read=await hydrateTeamMetadata(original,{backend:null});
  assert.deepEqual(read,original);assert.equal(json(original),before);
  await assert.rejects(prepareTeamMetadata(original,{backend:null}),/no saved progress was changed/);
  assert.equal(json(original),before);
  const context=setup();assert.ok((await prepareTeamMetadata(original,context.options)).active.baselineRef);
});

test('empty individual and compact viewing metadata need no database',async()=>{
  assert.equal(await hydrateTeamMetadata(null,{backend:null}),null);
  assert.equal(await prepareTeamMetadata(null,{backend:null}),null);
  const view={version:1,lastFile:fixture().lastFile,active:null,pendingExport:null,recovery:null};
  assert.deepEqual(await prepareTeamMetadata(view,{backend:null}),view);
});

test('failed second body preparation never mutates metadata and keeps already durable copies',async()=>{
  const context=setup(),original=fixture(),before=json(original),put=context.backend.put;
  context.backend.put=async body=>{if(context.bodies.size===1)throw new DOMException('Storage full','QuotaExceededError');await put(body);};
  await assert.rejects(prepareTeamMetadata(original,context.options),/no saved progress was changed/);
  assert.equal(json(original),before);assert.equal(context.bodies.size,1);
  assert.deepEqual([...context.bodies.values()][0].value,original.active.baselineData);
});

test('prepare waits for backend durable completion before returning any refs',async()=>{
  const context=setup(),original=fixture();original.active=null;original.recovery=null;
  let release;const gate=new Promise(resolve=>release=resolve),put=context.backend.put;
  context.backend.put=async body=>{await gate;await put(body);};
  let settled=false;const pending=prepareTeamMetadata(original,context.options).then(value=>{settled=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.equal(context.bodies.size,0);
  release();const compact=await pending;assert.ok(compact.pendingExport.payloadRef);assert.equal(context.bodies.size,1);
});

test('caller mutations during async prepare do not change stored data',async()=>{
  const context=setup(),original=fixture(),wanted=copy(original);
  const pending=prepareTeamMetadata(original,context.options);
  original.pendingExport.data.vet.records.task.exceptionSummary='changed after starting';
  const restored=await hydrateTeamMetadata(await pending,context.options);
  assert.deepEqual(restored.pendingExport,wanted.pendingExport);
});

test('missing, unreadable and malformed body fail closed without changing compact metadata',async()=>{
  for(const fault of ['missing','unreadable','wrong-id','wrong-kind','wrong-version','extra-field','invalid-data']){
    const context=setup(),compact=await prepareTeamMetadata(fixture(),context.options),before=json(compact),id=compact.active.baselineRef.id;
    const body=context.bodies.get(id);
    if(fault==='missing')context.bodies.delete(id);
    if(fault==='unreadable')context.backend.get=async()=>{throw Error('Database unavailable');};
    if(fault==='wrong-id')body.id='other';
    if(fault==='wrong-kind')body.kind='handover';
    if(fault==='wrong-version')body.version=99;
    if(fault==='extra-field')body.privateExtra=true;
    if(fault==='invalid-data')body.value.tas=null;
    await assert.rejects(hydrateTeamMetadata(compact,context.options),undefined,fault);
    assert.equal(json(compact),before,fault);
  }
});

test('invalid refs, inconsistent inline values and wrong pending headers are rejected',async()=>{
  for(const change of [meta=>meta.active.baselineRef.id='../other',meta=>meta.active.baselineRef.version=99,
    meta=>meta.active.baselineRef.extra=true,meta=>meta.active.baselineData={bad:true},meta=>meta.pendingExport.revision++]){
    const context=setup(),compact=await prepareTeamMetadata(fixture(),context.options);change(compact);
    await assert.rejects(hydrateTeamMetadata(compact,context.options));
  }
});

test('missing required session or recovery data never becomes a blank snapshot',async()=>{
  const context=setup();
  for(const change of [meta=>delete meta.active.baselineData,meta=>delete meta.recovery.data,meta=>meta.recovery.data=null]){
    const original=fixture();change(original);await assert.rejects(prepareTeamMetadata(original,context.options));
  }
  const first=fixture();first.active={id:'first',phase:'exporting',firstFile:true};first.recovery=null;
  assert.ok((await prepareTeamMetadata(first,context.options)).pendingExport.payloadRef);
});

test('old referenced bodies remain recoverable after confirm or later preparation',async()=>{
  const context=setup(),first=await prepareTeamMetadata(fixture(),context.options),before=copy(first);
  const hydrated=await hydrateTeamMetadata(first,context.options);
  const confirmed=await prepareTeamMetadata({...hydrated,active:null,pendingExport:null},context.options);
  assert.equal(context.bodies.size,3);assert.ok(confirmed.recovery.dataRef);
  assert.equal(Object.hasOwn(confirmed,'pendingExportRef'),false);
  assert.deepEqual((await hydrateTeamMetadata(before,context.options)).pendingExport,fixture().pendingExport);
});

test('immutable ID collision cannot overwrite an earlier saved copy',async()=>{
  const context=setup(),original=fixture();context.options.createId=()=> 'one-id';
  await assert.rejects(prepareTeamMetadata(original,context.options),/no saved progress was changed/);
  assert.equal(context.bodies.size,1);assert.equal(context.bodies.get('one-id').kind,'snapshot');
  assert.deepEqual(context.bodies.get('one-id').value,original.active.baselineData);
});
