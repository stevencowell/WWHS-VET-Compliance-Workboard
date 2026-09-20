// A complete private Launchpad file. Native VET/TAS and Finance data stay separate.
import {INBOX_KEY, LEGACY_PLAN_KEY, validateInbox, validDate, mergeWorkboardImports} from './summary-core.mjs?v=backup-flow-2';
import {CALENDAR_KEY, validateCalendar} from './calendar-core.mjs?v=8';
import {snapshot as teamSnapshot,isTeamItem} from '../../assets/js/team-handover-core.mjs?v=early-completion-1';

export const BACKUP_FORMAT='wwhs-launchpad-backup';
// The JSON envelope quotes five already-serialised records. Account for escaping
// and UTF-8 separately; Unicode exports must pass the same import limits.
export const MAX_BACKUP_CHARACTERS=60000000;
export const MAX_BACKUP_BYTES=4*MAX_BACKUP_CHARACTERS;
export const BACKUP_KEYS=Object.freeze({inbox:INBOX_KEY,calendar:CALENDAR_KEY,plans:LEGACY_PLAN_KEY,links:'morning-launchpad-favourites:v1',theme:'morning-launchpad-theme'});
export const RESTORE_KEY='morning-launchpad-restore:v1';
const keys=Object.values(BACKUP_KEYS),object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fail=message=>{throw new Error(message);};
const sorted=value=>Array.isArray(value)?value.map(sorted):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
export const canonical=value=>JSON.stringify(sorted(value));
const webLink=value=>{try{const url=new URL(value);return typeof value==='string'&&['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}};

export function checkRecord(key,raw){
  if(raw===null)return null;
  if(typeof raw!=='string'||raw.length>8000000)fail('One saved Launchpad record is too large or unreadable. Keep the original file.');
  if(key===INBOX_KEY)return validateInbox(raw);
  if(key===CALENDAR_KEY)return validateCalendar(raw);
  if(key===BACKUP_KEYS.theme){if(!['light','dark'].includes(raw))fail('The saved appearance is invalid.');return raw;}
  const value=JSON.parse(raw);
  if(key===LEGACY_PLAN_KEY){
    if(!object(value)||value.version!==1||!object(value.days))fail('The saved daily plans are invalid.');
    for(const[date,day]of Object.entries(value.days)){
      if(!date||!validDate(date)||!object(day)||typeof day.commitment!=='string'||!['small','normal'].includes(day.capacity)||typeof day.closed!=='boolean'||!Array.isArray(day.tasks)||day.tasks.length>3||day.tasks.some(task=>!object(task)||typeof task.id!=='string'||!task.id.trim()||typeof task.title!=='string'||!task.title.trim()||!['todo','done','deferred'].includes(task.state)||task.url!==undefined&&task.url!==''&&!webLink(task.url))||new Set(day.tasks.map(task=>task.id)).size!==day.tasks.length)fail('A saved daily plan is invalid.');
    }
    return value;
  }
  if(key===BACKUP_KEYS.links){
    if(!Array.isArray(value)||value.some(link=>!object(link)||typeof link.id!=='string'||!link.id||typeof link.name!=='string'||!link.name.trim()||!webLink(link.url))||new Set(value.map(link=>link.id)).size!==value.length)fail('The saved links are invalid.');
    return value;
  }
  fail('This file contains an unsupported Launchpad record.');
}
export function snapshotLaunchpad(storage){
  const records={};
  for(const key of keys){const raw=storage.getItem(key);checkRecord(key,raw);records[key]=raw;}
  return records;
}
function validateRecords(records,{partial=false}={}){
  if(!object(records)||Object.keys(records).some(key=>!keys.includes(key))||(!partial&&keys.some(key=>!Object.hasOwn(records,key))))fail('Use a complete Launchpad backup or an older task backup.');
  const copy={};for(const[key,raw]of Object.entries(records)){checkRecord(key,raw);copy[key]=raw;}return copy;
}
export function parseLaunchpadBackup(raw){
  if(typeof raw!=='string'||raw.length>MAX_BACKUP_CHARACTERS)fail('This Launchpad backup is too large to open safely. Keep the original file.');
  const value=JSON.parse(raw);
  if(value?.format===BACKUP_FORMAT){
    if(value.version!==1||typeof value.savedAt!=='string'||!Number.isFinite(Date.parse(value.savedAt))||Object.keys(value).some(key=>!['format','version','savedAt','records'].includes(key)))fail('This Launchpad backup version is not supported.');
    return {...value,records:validateRecords(value.records),legacy:false};
  }
  if(value?.version===1&&Array.isArray(value.events)){const calendar=validateCalendar(raw);return {format:BACKUP_FORMAT,version:1,savedAt:null,records:{[CALENDAR_KEY]:JSON.stringify(calendar)},legacy:'calendar'};}
  const inbox=validateInbox(raw);
  return {format:BACKUP_FORMAT,version:1,savedAt:null,records:{[INBOX_KEY]:JSON.stringify(inbox)},legacy:'tasks'};
}
export function createLaunchpadBackup(storage,{savedAt=new Date().toISOString()}={}){
  const value={format:BACKUP_FORMAT,version:1,savedAt,records:snapshotLaunchpad(storage)};
  parseLaunchpadBackup(JSON.stringify(value));return value;
}
export function launchpadContent(records){
  validateRecords(records);
  return canonical(Object.fromEntries(keys.map(key=>[key,checkRecord(key,records[key])])));
}
export function backupCounts(backup){
  const record=backup.records||backup;
  return {tasks:record[INBOX_KEY]?validateInbox(record[INBOX_KEY]).items.length:0,events:record[CALENDAR_KEY]?validateCalendar(record[CALENDAR_KEY]).events.length:0,days:record[LEGACY_PLAN_KEY]?Object.keys(checkRecord(LEGACY_PLAN_KEY,record[LEGACY_PLAN_KEY]).days).length:0,links:record[BACKUP_KEYS.links]?checkRecord(BACKUP_KEYS.links,record[BACKUP_KEYS.links]).length:0};
}
function sameTask(a,b){
  if(isTeamItem(a)&&isTeamItem(b))return a.origin.wing===b.origin.wing&&a.origin.recordKey===b.origin.recordKey;
  if(a.taskKey&&b.taskKey)return a.taskKey===b.taskKey;
  return a.id===b.id||!a.taskKey&&!b.taskKey&&a.title===b.title&&a.action===b.action&&a.source===b.source;
}
function checkSharedCompatibility(raw){teamSnapshot({getItem:key=>key===INBOX_KEY?raw:null});}
function mergeTasks(current,incoming,preferBackup,counts){
  const aliases=new Map(),mapped=incoming.map(item=>{
    const matches=current.filter(old=>sameTask(old,item));
    if(matches.length>1)fail('More than one saved task matches a backup task. Nothing was changed; keep both copies for review.');
    const old=matches[0];if(!old)return item;
    if(item.taskKey&&old.taskKey)aliases.set(item.taskKey,old.taskKey);
    return {...item,id:old.id,taskKey:old.taskKey||item.taskKey};
  });
  const normalised=mapped.map(item=>({...item,dependsOn:[...new Set(item.dependsOn.map(key=>aliases.get(key)||key))]}));
  return mergeList(current,normalised,{match:sameTask,preferBackup,compare:comparableTask,preserveIdentity:true},counts);
}
const comparableTask=task=>{const copy={...task};for(const key of ['id','selected','forecast','taskHelp','planStamp','planAliases'])delete copy[key];return canonical(copy);};
function mergeCalendarEvents(current,incoming,preferBackup,counts){
  // A title and start time are not an identity: separate calendars can contain
  // different events in the same slot. Backup IDs take precedence; a source
  // UID can connect different local IDs only when it is unique in both lists.
  const ids=new Set(current.map(event=>event.id));
  const uidCounts=events=>{const counts=new Map();for(const event of events)if(event.uid)counts.set(event.uid,(counts.get(event.uid)||0)+1);return counts;};
  const currentCounts=uidCounts(current),incomingCounts=uidCounts(incoming);
  const uniqueSources=new Map(current.filter(event=>event.uid&&currentCounts.get(event.uid)===1).map(event=>[event.uid,event]));
  const mapped=incoming.map(event=>{
    if(ids.has(event.id)||!event.uid||incomingCounts.get(event.uid)!==1)return event;
    const saved=uniqueSources.get(event.uid);
    return saved?{...event,id:saved.id}:event;
  });
  return mergeList(current,mapped,{match:(a,b)=>a.id===b.id,preferBackup,preserveIdentity:true},counts);
}
function mergeList(current,incoming,{match,preferBackup,compare=canonical,preserveIdentity=false},counts){
  const out=current.map(item=>structuredClone(item)),matched=new Set();
  for(const item of incoming){
    const index=out.findIndex(old=>match(old,item));
    if(index<0){const next=structuredClone(item);if(next.id&&out.some(old=>old.id===next.id))fail('Two different records use the same ID. The backup was not opened; keep both copies.');matched.add(out.length);out.push(next);counts.added++;continue;}
    if(matched.has(index))fail('Two backup records match the same saved record. Nothing was changed; keep both files so the records can be checked.');matched.add(index);
    if(compare(out[index])!==compare(item)){counts.different++;if(preferBackup){out[index]={...structuredClone(item),...(preserveIdentity?{id:out[index].id}: {})};counts.updated++;}else counts.kept++;}
  }
  return out;
}
export function planLaunchpadRestore(storage,backup,{preferBackup=false}={}){
  if(typeof preferBackup!=='boolean')fail('Choose which matching records to keep.');
  const checked=backup.legacy?parseLaunchpadBackup(backup.records[backup.legacy==='calendar'?CALENDAR_KEY:INBOX_KEY]):parseLaunchpadBackup(JSON.stringify({format:backup.format,version:backup.version,savedAt:backup.savedAt,records:backup.records}));
  const before=snapshotLaunchpad(storage),after={...before},counts={added:0,different:0,updated:0,kept:0};
  for(const[key,raw]of Object.entries(checked.records)){
    if(raw===null)continue; // An empty or older file never clears records already here.
    const incoming=checkRecord(key,raw),current=checkRecord(key,before[key]);
    // Launchpad also holds shared cards. A restored list must remain a valid
    // source for VET/TAS backups, even when another device used different keys.
    if(key===INBOX_KEY){checkSharedCompatibility(raw);checkSharedCompatibility(before[key]);}
    // Opening the app initialises an empty inbox. It contains no work to merge;
    // retain the backup exactly instead of adding empty-device metadata to it.
    const emptyInbox=key===INBOX_KEY&&current!==null&&[validateInbox(null),{...validateInbox(null),pinWorkflowVersion:1}].some(value=>canonical(current)===canonical(value));
    if(current===null||emptyInbox){after[key]=raw;counts.added+=key===INBOX_KEY?incoming.items.length:key===CALENDAR_KEY?incoming.events.length:key===LEGACY_PLAN_KEY?Object.keys(incoming.days).length:key===BACKUP_KEYS.links?incoming.length:1;continue;}
    let result;
    if(key===INBOX_KEY){
      const items=mergeTasks(current.items,incoming.items,preferBackup,counts);
      result={...current,items,workboardImports:mergeWorkboardImports(current.workboardImports,incoming.workboardImports)};
      if(current.briefing&&incoming.briefing&&current.briefing!==incoming.briefing){counts.different++;if(preferBackup)counts.updated++;else counts.kept++;}
      if(preferBackup){for(const field of ['briefing','reviewDate','generatedAt'])if(Object.hasOwn(incoming,field))result[field]=incoming[field];}
      else if(!current.briefing&&incoming.briefing){result.briefing=incoming.briefing;if(incoming.reviewDate)result.reviewDate=incoming.reviewDate;}
      result.forecastContexts={...(incoming.forecastContexts||{}),...(current.forecastContexts||{})};
    }else if(key===CALENDAR_KEY){
      result={...current,events:mergeCalendarEvents(current.events,incoming.events,preferBackup,counts)};
    }else if(key===LEGACY_PLAN_KEY){
      result={...current,days:{...current.days}};
      for(const[date,day]of Object.entries(incoming.days)){
        if(!Object.hasOwn(result.days,date)){result.days[date]=day;counts.added++;continue;}
        const old=result.days[date],tasks=mergeList(old.tasks,day.tasks,{match:(a,b)=>a.id===b.id,preferBackup},counts);
        const {tasks:oldTasks,...oldFields}=old,{tasks:newTasks,...newFields}=day;
        if(canonical(oldFields)!==canonical(newFields)){counts.different++;if(preferBackup)counts.updated++;else counts.kept++;}
        result.days[date]={...(preferBackup?day:old),tasks};
      }
    }else if(key===BACKUP_KEYS.links){result=mergeList(current,incoming,{match:(a,b)=>a.id===b.id,preferBackup,preserveIdentity:true},counts);}
    else {if(current!==incoming){counts.different++;if(preferBackup){after[key]=raw;counts.updated++;}else counts.kept++;}continue;}
    checkRecord(key,JSON.stringify(result));after[key]=canonical(result)===canonical(current)?before[key]:JSON.stringify(result);
  }
  checkSharedCompatibility(after[INBOX_KEY]);
  return {before,after,counts,legacy:checked.legacy,sourceCounts:backupCounts(checked)};
}
