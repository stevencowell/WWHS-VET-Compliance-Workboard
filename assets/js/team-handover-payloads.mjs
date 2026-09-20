// Immutable, private browser copies. Only small references enter localStorage.
import {parseBackup,snapshot} from './team-handover-core.mjs?v=early-completion-1';

const DB_NAME='wwhs-team-handover-payloads', STORE='payloads', MAX_SIZE=12000000;
const INFO=['scope','workspaceId','revision','parentRevision','parentExportId','exportId','savedAt','savedBy','note','changes'];
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
const fail=message=>{throw new Error(message);};
const copy=value=>JSON.parse(JSON.stringify(value));
const info=value=>Object.fromEntries(INFO.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
function reference(value,kind){
  if(!object(value)||value.version!==1||value.kind!==kind||typeof value.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,149}$/.test(value.id)||Object.keys(value).some(key=>!['version','id','kind'].includes(key)))fail('The saved team file reference is invalid. Keep this browser data intact for recovery.');
  return value;
}
function validate(value,kind){
  if(kind==='archive'){
    if(!object(value)||Object.keys(value).some(key=>!['metadataRaw','data','capturedAt'].includes(key))||
      !(value.metadataRaw===null||typeof value.metadataRaw==='string'&&value.metadataRaw.length<=MAX_SIZE))fail('The private team recovery archive is invalid.');
    validate(value.data,'snapshot');
    // The metadata string is preserved verbatim, even when it cannot be parsed.
    // It can include old private inbox copies and must never become a team file.
    parseBackup({kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,workspaceId:'local-validation',revision:1,parentRevision:null,parentExportId:null,exportId:'local-validation',savedAt:value.capturedAt,savedBy:'Local validation',note:'',changes:[],data:value.data});
    return value;
  }
  if(!object(value)||JSON.stringify(value).length>MAX_SIZE)fail('The saved team file copy is invalid or too large.');
  // Reuse the portable schema checks without changing the original saved value.
  parseBackup(kind==='handover'?value:{kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,workspaceId:'local-validation',revision:1,parentRevision:null,parentExportId:null,exportId:'local-validation',savedAt:'2026-01-01T00:00:00.000Z',savedBy:'Local validation',note:'',changes:[],data:value});
  return value;
}
function metadata(value){
  if(value===null)return null;
  if(!object(value)||value.version!==1||!value.lastFile?.workspaceId||!Number.isInteger(value.lastFile.revision)||value.lastFile.revision<1)fail('The team session record cannot be read. Keep this browser data intact for recovery.');
  if(value.active!=null&&(!object(value.active)||!['editing','exporting'].includes(value.active.phase)))fail('The active team session is invalid. Keep this browser data intact for recovery.');
  if(value.recovery!=null&&!object(value.recovery))fail('The local recovery record is invalid.');
  return copy(value);
}
function indexedDBBackend(){
  let connection;
  function open(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      if(!globalThis.indexedDB){reject(Error('IndexedDB is unavailable'));return;}
      let request,settled=false;
      const rejectOnce=error=>{if(!settled){settled=true;reject(error);}};
      try{request=globalThis.indexedDB.open(DB_NAME,1);}catch(error){rejectOnce(error);return;}
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};
      request.onerror=()=>rejectOnce(request.error||Error('The team file database could not be opened'));
      request.onblocked=()=>rejectOnce(Error('Another page is blocking the team file database'));
      request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}settled=true;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
    }).catch(error=>{connection=null;throw error;});
    return connection;
  }
  async function perform(mode,operation){
    const db=await open();
    return new Promise((resolve,reject)=>{
      let transaction,request,result;
      try{
        try{transaction=mode==='readwrite'?db.transaction(STORE,mode,{durability:'strict'}):db.transaction(STORE,mode);}
        catch(error){if(!['TypeError','NotSupportedError'].includes(error?.name))throw error;transaction=db.transaction(STORE,mode);}
        transaction.oncomplete=()=>resolve(result);
        transaction.onabort=()=>reject(transaction.error||request?.error||Error('The private team copy could not be saved'));
        transaction.onerror=()=>reject(transaction.error||request?.error||Error('The private team copy could not be saved'));
        request=operation(transaction.objectStore(STORE));request.onsuccess=()=>{result=request.result;};
      }catch(error){try{transaction?.abort();}catch{}reject(error);}
    });
  }
  return {put:body=>perform('readwrite',store=>store.add(body)),get:id=>perform('readonly',store=>store.get(id))};
}
let defaultBackend;
function backendFor(options){
  const backend=options.backend===undefined?(defaultBackend??=indexedDBBackend()):options.backend;
  if(!backend||['put','get'].some(key=>typeof backend[key]!=='function'))fail('This browser cannot keep the private team file copies. Your saved progress is unchanged.');
  return backend;
}
async function read(ref,kind,options){
  reference(ref,kind);let body;
  try{body=await backendFor(options).get(ref.id);}catch(error){throw new Error('The private team file copy could not be opened. Your saved progress has been kept.',{cause:error});}
  if(!body)fail('A private team file copy is missing. Keep this browser data intact; the handover cannot continue safely.');
  if(!object(body)||body.version!==1||body.id!==ref.id||body.kind!==kind||Object.keys(body).some(key=>!['version','id','kind','value'].includes(key)))fail('The private team file copy is invalid. Your saved progress has been kept.');
  return copy(validate(body.value,kind));
}
async function restore(container,field,refField,kind,options){
  if(own(container,refField)){
    const value=await read(container[refField],kind,options);
    if(own(container,field)&&JSON.stringify(container[field])!==JSON.stringify(value))fail('The private team file copy does not match its saved record. Your saved progress has been kept.');
    container[field]=value;
  }else if(own(container,field))validate(container[field],kind);
}
export async function hydrateTeamMetadata(input,options={}){
  const result=metadata(input);if(!result)return null;
  if(result.active){
    await restore(result.active,'baselineData','baselineRef','snapshot',options);
    if(!result.active.firstFile&&!own(result.active,'baselineData'))fail('The team session baseline is missing. Your saved progress has been kept.');
  }
  if(result.recovery){
    await restore(result.recovery,'data','dataRef','snapshot',options);
    if(!own(result.recovery,'data'))fail('The local recovery copy is missing. Your saved progress has been kept.');
  }
  if(result.pendingExport){
    if(result.pendingExport.payloadRef){
      const compact=result.pendingExport,ref=compact.payloadRef;
      const value=await read(ref,'handover',options);
      if(JSON.stringify(info(compact))!==JSON.stringify(info(value)))fail('The pending team file does not match its saved record. Your saved progress has been kept.');
      result.pendingExport=value;result.pendingExportRef=ref;
    }else{
      validate(result.pendingExport,'handover');
      if(result.pendingExportRef){const value=await read(result.pendingExportRef,'handover',options);if(JSON.stringify(value)!==JSON.stringify(result.pendingExport))fail('The pending team file does not match its saved copy.');}
    }
  }
  return result;
}
// Recovery screens must not require every historical copy just to inspect one.
// This never repairs, removes or substitutes a missing historical value.
export async function inspectTeamMetadata(input,options={}){
  const raw=input===null?null:typeof input==='string'?input:JSON.stringify(input);
  const result={raw,stored:null,hydrated:null,complete:true,issues:[]};
  let value;
  try{
    value=raw===null?null:JSON.parse(raw);result.stored=copy(value);
    // Validate the connection separately from its independent history sections.
    if(value!==null)metadata({...value,active:null,recovery:null});
    result.hydrated=copy(value);
  }
  catch(error){result.complete=false;result.issues.push({section:'metadata',message:error.message});return result;}
  if(!result.hydrated)return result;
  const partial=result.hydrated;
  const empty=snapshot({getItem:()=>null});
  // A readable object is not necessarily usable history. A malformed editor,
  // date or header must send the page to current-data safety saving instead of
  // selecting a normal save action that will inevitably reject that history.
  try{parseBackup({...partial.lastFile,kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,data:empty});}
  catch(error){result.issues.push({section:'metadata',message:error.message});}
  const checks=[
    ['baseline',async()=>{
      if(!partial.active)return;
      if(!object(partial.active)||!['editing','exporting'].includes(partial.active.phase))fail('The active team session is invalid. Keep this browser data intact for recovery.');
      parseBackup({kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,workspaceId:'session-validation',revision:1,parentRevision:null,parentExportId:null,
        exportId:own(partial.active,'id')?partial.active.id:'session-validation',savedBy:own(partial.active,'editor')?partial.active.editor:'Local inspection',
        savedAt:own(partial.active,'startedAt')?partial.active.startedAt:'2026-01-01T00:00:00.000Z',note:'',changes:[],data:empty});
      await restore(partial.active,'baselineData','baselineRef','snapshot',options);
      if(!partial.active.firstFile&&!own(partial.active,'baselineData'))fail('The team session baseline is missing. Your saved progress has been kept.');
    },()=>{if(object(partial.active))delete partial.active.baselineData;}],
    ['recovery',async()=>{
      if(!partial.recovery)return;
      if(!object(partial.recovery))fail('The local recovery record is invalid.');
      await restore(partial.recovery,'data','dataRef','snapshot',options);
      if(!own(partial.recovery,'data'))fail('The local recovery copy is missing. Your saved progress has been kept.');
    },()=>{if(object(partial.recovery)){delete partial.recovery.data;delete partial.recovery.raw;}}],
    ['pending',async()=>{
      if(!partial.pendingExport){if(partial.active?.phase==='exporting')fail('The prepared team file record is missing. Current progress can still be saved as a safety copy.');return;}
      const hydrated=await hydrateTeamMetadata({...partial,active:null,recovery:null},options);
      partial.pendingExport=hydrated.pendingExport;
      if(hydrated.pendingExportRef)partial.pendingExportRef=hydrated.pendingExportRef;
    },()=>{partial.pendingExport=null;delete partial.pendingExportRef;}]
  ];
  const issues=await Promise.all(checks.map(async([section,check,unavailable])=>{
    try{await check();return null;}catch(error){unavailable();return {section,message:error.message};}
  }));
  result.issues.push(...issues.filter(Boolean));result.complete=!result.issues.length;return result;
}
async function store(value,kind,ref,options){
  validate(value,kind);
  if(ref)return reference(ref,kind); // Hydration has already verified its exact value.
  const next=reference({version:1,id:(options.createId||(()=>globalThis.crypto.randomUUID()))(),kind},kind);
  try{await backendFor(options).put({...next,value:copy(value)});}
  catch(error){throw new Error('The browser could not save the private team file copy, so no saved progress was changed.',{cause:error});}
  return next;
}
export async function prepareTeamMetadata(input,options={}){
  // Clone before the first await so callers cannot alter the plan while saving.
  const result=await hydrateTeamMetadata(input,options);if(!result)return null;
  if(result.active&&own(result.active,'baselineData')){
    result.active.baselineRef=await store(result.active.baselineData,'snapshot',result.active.baselineRef,options);
    delete result.active.baselineData;
  }
  if(result.recovery){
    result.recovery.dataRef=await store(result.recovery.data,'snapshot',result.recovery.dataRef,options);
    delete result.recovery.data;delete result.recovery.raw;
  }
  if(result.pendingExport){
    const payloadRef=await store(result.pendingExport,'handover',result.pendingExportRef,options);
    result.pendingExport={...info(result.pendingExport),payloadRef};
  }
  delete result.pendingExportRef;
  return result;
}

// These bodies stay inside this browser. Archiving does not replace live stores
// and does not require the old metadata's referenced copies to be readable.
export async function archiveTeamState(input,options={}){
  const value=copy(input);return store(value,'archive',null,options);
}
export async function readTeamArchive(ref,options={}){return read(ref,'archive',options);}
