// Portable safety copies and explicit reconnect plans. No browser store is
// written here; the caller previews the plan, then uses the guarded transaction.
import {KEYS,readRaw,snapshot,parseBackup,createBackup,buildImportPlan} from './team-handover-core.mjs?v=team-handover-1';
import {archiveTeamState,prepareTeamMetadata} from './team-handover-payloads.mjs?v=backup-flow-2';

export const SAFETY_KIND='WWHS-TEAM-SAFETY-BACKUP';
const MAX_SIZE=12000000;
const INFO=['workspaceId','revision','parentRevision','parentExportId','exportId','savedAt','savedBy','note','changes'];
const SAFETY_FIELDS=['kind','schemaVersion','snapshotId','savedAt','savedBy','note','data'];
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const copy=value=>JSON.parse(JSON.stringify(value));
const id=()=>globalThis.crypto.randomUUID();
const info=payload=>Object.fromEntries(INFO.map(key=>[key,payload[key]]));
const fail=message=>{throw new Error(message);};

function inputCopy(input){
  const raw=typeof input==='string'?input:JSON.stringify(input);
  if(typeof raw!=='string'||raw.length>MAX_SIZE)fail('The selected team file is invalid or too large.');
  try{return JSON.parse(raw);}catch{fail('The selected team file is not valid JSON.');}
}
export function parseTeamFile(input){
  const value=inputCopy(input);
  if(value?.kind!==SAFETY_KIND){const file=parseBackup(value);return {type:'handover',file,data:file.data};}
  if(!object(value)||value.schemaVersion!==1||Object.keys(value).some(key=>!SAFETY_FIELDS.includes(key))||SAFETY_FIELDS.some(key=>!Object.hasOwn(value,key)))fail('The safety backup format is invalid. Nothing has been replaced.');
  // Reuse every shared-data and identity check without adding revision or
  // ancestry claims to the actual portable safety file.
  const checked=parseBackup({kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,workspaceId:'safety-validation',revision:1,
    parentRevision:null,parentExportId:null,exportId:value.snapshotId,savedAt:value.savedAt,savedBy:value.savedBy,note:value.note,changes:[],data:value.data});
  const file={kind:SAFETY_KIND,schemaVersion:1,snapshotId:checked.exportId,savedAt:checked.savedAt,savedBy:checked.savedBy,note:checked.note,data:checked.data};
  return {type:'safety',file,data:file.data};
}
export function createSafetyBackup({snapshot:data,editor,note='',savedAt=new Date().toISOString(),snapshotId=id()}){
  return parseTeamFile({kind:SAFETY_KIND,schemaVersion:1,snapshotId,savedAt,savedBy:editor,note,data}).file;
}

function savedConnection(raw){
  if(raw===null)return {metadata:null,lastFile:null,unavailable:false};
  let metadata;try{metadata=JSON.parse(raw);}catch{return {metadata:null,lastFile:null,unavailable:true};}
  const lastFile=metadata?.lastFile;
  // A damaged baseline/recovery reference cannot erase known revision checks.
  // Only the identity is needed; unrelated damaged history remains archived.
  const identity=value=>typeof value==='string'&&value.length>0&&value.length<=150&&!/[\u0000-\u001f\u007f]/.test(value);
  if(!object(lastFile)||!Number.isSafeInteger(lastFile.revision)||lastFile.revision<1||!identity(lastFile.workspaceId)||!identity(lastFile.exportId))return {metadata,lastFile:null,unavailable:true};
  return {metadata,lastFile:copy(lastFile),unavailable:false};
}
export function buildReconnectPlan(storage,input,{editor,editing=true,allowUnverifiedLineage=false,sessionId=id(),startedAt=new Date().toISOString(),workspaceId=id(),exportId=id(),createId=id}={}){
  const before={...readRaw(storage),[KEYS.metadata]:storage.getItem(KEYS.metadata)};
  const source=parseTeamFile(input),connection=savedConnection(before[KEYS.metadata]);
  // Snapshot validates every live shared store. A malformed live value must not
  // silently become an empty recovery copy before an import overwrites it.
  const beforeSnapshot=snapshot(before);
  let payload,lineage;
  if(source.type==='safety'){
    payload=createBackup({snapshot:source.data,editor:editor||source.file.savedBy,workspaceId,exportId,savedAt:startedAt,
      note:'New local team connection restored from a safety backup.',changes:[]});
    lineage='fresh-safety';
  }else{
    if(connection.unavailable&&!allowUnverifiedLineage)fail('The old team connection cannot be verified. Review and confirm reconnecting to this trusted file before continuing.');
    payload=source.file;
    lineage=connection.unavailable?'unverified-reconnect':connection.lastFile?'existing-team':'first-connection';
  }
  const captured={getItem:key=>Object.hasOwn(before,key)?before[key]:null};
  const plan=buildImportPlan(captured,payload,{lastFile:source.type==='safety'?null:connection.lastFile,
    firstConnection:source.type==='safety'||!connection.lastFile,createId});
  // Validate the editing name/time/id even when a normal file supplies its own
  // perfectly valid header. Validation creates no private or portable file.
  if(editing)createBackup({snapshot:source.data,editor,workspaceId:'session-validation',exportId:sessionId,savedAt:startedAt});
  const nextMetadata={version:1,lastFile:info(payload),
    active:editing?{id:sessionId,editor,startedAt,phase:'editing',baseExportId:payload.exportId,baselineData:source.data}:null,
    pendingExport:null,recovery:{capturedAt:startedAt,lastFile:connection.lastFile,data:beforeSnapshot}};
  if(source.type==='safety')nextMetadata.lineage={type:'safety-restored',snapshotId:source.file.snapshotId,savedAt:source.file.savedAt};
  return {...plan,before,beforeSnapshot,nextMetadata,sourceType:source.type,sourceFile:source.file,lineage,
    previousFile:connection.lastFile,skipsRevisions:source.type==='handover'&&!!connection.lastFile&&payload.revision>connection.lastFile.revision+1};
}

export async function prepareReconnectPlan(input,options={}){
  // Capture the entire reviewed plan before waiting for durable private copies.
  const plan=copy(input);
  if(!object(plan.before)||!Object.hasOwn(plan.before,KEYS.metadata)||!object(plan.nextMetadata))fail('The reconnect preview is invalid. Choose the file again.');
  const archiveRef=await archiveTeamState({metadataRaw:plan.before[KEYS.metadata],data:plan.beforeSnapshot,
    capturedAt:plan.nextMetadata.recovery.capturedAt},options);
  const nextMetadata=await prepareTeamMetadata({...plan.nextMetadata,archiveRef},options);
  const after={...plan.after,[KEYS.metadata]:JSON.stringify(nextMetadata)};
  // The returned before map includes all four data stores AND exact raw old
  // metadata. applyTeamTransaction must compare this whole map before writing.
  return {...plan,nextMetadata,archiveRef,after};
}
