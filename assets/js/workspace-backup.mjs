// One portable snapshot of current saved work. Session locks and folder handles
// are device-specific; Finance stays encrypted with its existing password.
import {BACKUP_KEYS, checkRecord, backupCounts, canonical, parseLaunchpadBackup, planLaunchpadRestore} from '../../morning-launchpad/assets/launchpad-backup.mjs?v=vet-admin-procedures-20260924';
import {KEYS, snapshot, parseBackup, buildImportPlan} from './team-handover-core.mjs?v=vet-admin-procedures-20260924';
import {validateEncryptedRecord} from '../../finance/security/local-vault.mjs?v=workspace-backup-1';

export const FORMAT='wwhs-workspace-backup';
export const RECORD_KEYS=Object.freeze([...Object.values(BACKUP_KEYS),KEYS.vet,KEYS.tas,KEYS.review]);
export const RESTORE_KEY='wwhs-workspace-restore:v1';
export const EPOCH_KEY='wwhs-workspace-generation:v1';
export const RECEIPT_KEY='wwhs-workspace-backup-receipt:v1';
export const MAX_BYTES=320*1024*1024;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const same=(a,b)=>canonical(a)===canonical(b);
export function validateSnapshot(value){
  if(!object(value)||!object(value.records)||Object.keys(value).some(k=>!['records','finance'].includes(k))||!Object.hasOwn(value,'finance')||Object.keys(value.records).length!==RECORD_KEYS.length||RECORD_KEYS.some(k=>!Object.hasOwn(value.records,k)))throw Error('This backup is incomplete. Keep the original file.');
  for(const key of RECORD_KEYS){const raw=value.records[key];if(raw!==null&&(typeof raw!=='string'||raw.length>12000000))throw Error('A saved record is unreadable or too large.');}
  for(const key of Object.values(BACKUP_KEYS))checkRecord(key,value.records[key]);
  snapshot({getItem:key=>value.records[key]??null});
  if(value.finance!==null&&!same(value.finance,validateEncryptedRecord(value.finance)))throw Error('The Finance part of this backup contains unsupported fields.');
  return structuredClone(value);
}
export async function captureWorkspace(storage,finance){
  const records=Object.fromEntries(RECORD_KEYS.map(k=>[k,storage.getItem(k)]));
  const result=validateSnapshot({records,finance:await finance.read()});
  if(RECORD_KEYS.some(k=>storage.getItem(k)!==records[k]))throw Error('Saved work changed while the backup was being prepared. Try Save backup again.');
  return result;
}
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function createWorkspaceBackup(data,savedAt=new Date().toISOString()){
  const content={format:FORMAT,version:1,savedAt,data:validateSnapshot(data)};
  const backup={...content,checksum:await digest(content)};
  if(new TextEncoder().encode(JSON.stringify(backup)).length>MAX_BYTES)throw Error('This complete backup is too large. Your saved data is unchanged.');
  return backup;
}
export async function parseWorkspaceBackup(text){
  if(typeof text!=='string'||!text.trim())throw Error('This file is empty. Choose a backup with a file size greater than 0 KB.');
  if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('This backup is too large to open. Keep the original file.');
  let value;try{value=JSON.parse(text);}catch{throw Error('This file is not a readable JSON backup. Your saved work is unchanged.');}
  if(value?.format!==FORMAT)return {legacy:true,value,text};
  if(value.version!==1||!Number.isFinite(Date.parse(value.savedAt))||Object.keys(value).some(k=>!['format','version','savedAt','data','checksum'].includes(k)))throw Error('This workspace backup version is not supported.');
  const {checksum,...content}=value;
  if(checksum!==await digest(content))throw Error('This backup is incomplete or has changed since it was saved. Choose another copy.');
  return {...value,data:validateSnapshot(value.data),legacy:false};
}
export function planOlderBackup(current,parsed){
  const data=structuredClone(current),storage={getItem:k=>data.records[k]??null};
  let area;
  if(parsed.value?.format==='finance-studio-encrypted-vault'){
    data.finance=validateEncryptedRecord(parsed.value);area='Finance';
  }else if(parsed.value?.kind==='WWHS-TEAM-HANDOVER'){
    const backup=parseBackup(parsed.value),plan=buildImportPlan(storage,backup,{firstConnection:true,scope:backup.scope||null});
    for(const key of RECORD_KEYS)if(Object.hasOwn(plan.after,key))data.records[key]=plan.after[key];
    area=backup.scope?backup.scope.toUpperCase():'VET and TAS';
  }else{
    const plan=planLaunchpadRestore(storage,parseLaunchpadBackup(parsed.text),{preferBackup:true});
    Object.assign(data.records,plan.after);area='Launchpad';
  }
  return {data:validateSnapshot(data),area};
}
export function describeWorkspace(data){
  const counts=backupCounts(data.records),team=snapshot({getItem:k=>data.records[k]??null});
  const count=(n,singular,plural=singular+'s')=>`${n} ${n===1?singular:plural}`;
  return [
    ['Launchpad',`${count(counts.tasks,'card')} · ${count(counts.events,'calendar entry','calendar entries')} · ${count(counts.links,'saved link')} · ${count(counts.days,'older daily plan')}`],
    ['VET',`${count(Object.keys(team.vet.records).length,'task record')} · progress, settings and reviews`],
    ['TAS',`${count(Object.keys(team.tas.records).length,'task record')} · progress, settings and reviews`],
    ['Finance',data.finance?'Encrypted records, budget and settings':'No saved Finance records'],
  ];
}
