// Backup reminder: a digest-only safety receipt never changes shared progress.
import {KEYS, DATA_KEYS, snapshot} from './team-handover-core.mjs?v=team-handover-1';
import {hydrateTeamMetadata} from './team-handover-payloads.mjs?v=backup-flow-2';

export const SAFETY_RECEIPT_KEY='wwhs-team-safety-receipt:v1';
const LAUNCHPAD_JOURNAL='morning-launchpad-restore:v1';
const canonical=value=>JSON.stringify(sort(value));
function sort(value){
  if(Array.isArray(value))return value.map(sort);
  return value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value;
}
function safetyCapture(storage){
  return {before:Object.fromEntries([...DATA_KEYS,KEYS.metadata].map(key=>[key,storage.getItem(key)])),
    journals:[storage.getItem(KEYS.journal),storage.getItem(LAUNCHPAD_JOURNAL)]};
}
function assertSafetyCapture(storage,expected){
  if(!expected?.before||!Array.isArray(expected.journals)||expected.journals.length!==2||
    [...DATA_KEYS,KEYS.metadata].some(key=>!Object.hasOwn(expected.before,key))||
    [...Object.values(expected.before),...expected.journals].some(value=>value!==null&&typeof value!=='string'))throw Error('The saved safety copy cannot be matched to the current progress. Save a new copy before clearing this reminder.');
  const current=safetyCapture(storage);
  if([...DATA_KEYS,KEYS.metadata].some(key=>current.before[key]!==expected.before[key])||current.journals.some((value,index)=>value!==expected.journals[index]))throw Error('Progress or recovery changed after this safety copy was prepared. Keep the file and save the current progress again.');
}
const safetyBinding=capture=>canonical({data:snapshot(capture.before),metadata:capture.before[KEYS.metadata],journals:capture.journals});
async function safetyDigest(value,cryptoProvider=globalThis.crypto){
  if(!cryptoProvider?.subtle)throw Error('This browser cannot verify the safety copy. The backup file is kept, but the close reminder remains.');
  return Array.from(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function readSafetyReceipt(storage){
  try{const value=JSON.parse(storage.getItem(SAFETY_RECEIPT_KEY));return value?.version===1&&/^[a-f0-9]{64}$/.test(value.digest)?value.digest:null;}catch{return null;}
}

// This receipt acknowledges a safety file only. It never changes handover
// metadata or claims that the shared file has been updated or synchronised.
export async function acknowledgeSafetyBackup(storage,expected,{cryptoProvider=globalThis.crypto}={}){
  const captured={before:{...expected?.before},journals:[...(expected?.journals||[])]};
  assertSafetyCapture(storage,captured);
  const binding=safetyBinding(captured),digest=await safetyDigest(binding,cryptoProvider);
  assertSafetyCapture(storage,captured);
  storage.setItem(SAFETY_RECEIPT_KEY,JSON.stringify({version:1,digest}));
  assertSafetyCapture(storage,captured);
  if(readSafetyReceipt(storage)!==digest)throw Error('The safety copy was saved, but its reminder receipt could not be kept in this browser.');
  return {digest,binding};
}
const cardFields=['noteText','status','group','sectionOverride','priority','nextAction','eventDate','followUpDate','dateNote','owner','instruction','dependsOn','workstream'];
const sourceFields=['title','action','dueDate','waitingOn'];
const identity=item=>`${item.origin.wing}:${item.origin.recordKey}`;
const pick=(item,fields)=>Object.fromEntries(fields.map(key=>[key,item[key]]));
export function hasProgressChanges(before,after){
  // Forecast refreshes and private pin metadata are not staff edits.
  for(const key of ['vet','tas','review'])if(canonical(before[key])!==canonical(after[key]))return true;
  const old=new Map(before.inbox.items.map(item=>[identity(item),item]));
  const next=new Map(after.inbox.items.map(item=>[identity(item),item]));
  const removed=data=>data.inbox.workboardImports.filter(key=>!data.inbox.items.some(item=>identity(item)===key)).sort();
  if(canonical(removed(before))!==canonical(removed(after)))return true;
  for(const [key,item] of old){
    const current=next.get(key);if(!current)return true;
    const fields=[...cardFields,...sourceFields.filter(field=>!item.forecast?.managed||!current.forecast?.managed||item.dirty.includes(field)||current.dirty.includes(field))];
    if(canonical(pick(item,fields))!==canonical(pick(current,fields)))return true;
  }
  for(const [key,item] of next){
    if(old.has(key))continue;
    const source=before[item.origin.wing]?.records[item.origin.recordKey];
    const review=before.review.records[`${item.origin.wing}:${item.origin.cycle}:${encodeURIComponent(item.origin.recordKey)}`];
    // Untouched cards may include generated sign-off text as well as native notes.
    if((source||review?.completed)&&!item.dirty.length&&!item.progressOverride&&!item.lastActionOn)continue;
    if(!item.forecast?.managed||item.noteText||item.status!=='review'||item.group!=='ready'||item.sectionOverride||
      item.dirty.some(field=>field!=='sectionOverride'))return true;
  }
  return false;
}

export function isWorkboardDestination(href,base){
  try{
    const root=new URL(base),url=new URL(href,root);
    return url.origin===root.origin&&['','index.html','head-teacher-tas/','head-teacher-tas/index.html',
      'morning-launchpad/','morning-launchpad/index.html','team-handover/','team-handover/index.html']
      .some(path=>url.pathname===root.pathname+path);
  }catch{return false;}
}

export function installTeamExitGuard(win,doc,storage,{hydrate=hydrateTeamMetadata}={}){
  if(win.WWHS_TEAM_EXIT_GUARD)return win.WWHS_TEAM_EXIT_GUARD;
  const base=new URL('../../',import.meta.url),watched=[...DATA_KEYS,KEYS.metadata,KEYS.journal,LAUNCHPAD_JOURNAL,SAFETY_RECEIPT_KEY];
  let loadedRaw,loadingRaw,baseline,sequence=0,state='idle',listening=false,allowUntil=0;
  let lastDataRaw,lastSnapshot;
  let safetyVerified=null,safetySequence=0;
  function safetyMatches(){
    try{return !!safetyVerified&&readSafetyReceipt(storage)===safetyVerified.digest&&safetyBinding(safetyCapture(storage))===safetyVerified.binding;}catch{return false;}
  }
  async function refreshSafety(){
    const ticket=++safetySequence,digest=readSafetyReceipt(storage);
    if(!digest){safetyVerified=null;return;}
    try{
      const binding=safetyBinding(safetyCapture(storage));
      if(safetyVerified?.digest===digest&&safetyVerified.binding===binding)return;
      safetyVerified=null;
      const actual=await safetyDigest(binding,win.crypto||globalThis.crypto);
      if(ticket===safetySequence&&actual===digest&&readSafetyReceipt(storage)===digest&&safetyBinding(safetyCapture(storage))===binding)safetyVerified={digest,binding};
    }catch{if(ticket===safetySequence)safetyVerified=null;}
  }
  function currentSnapshot(){
    const raw=Object.fromEntries(DATA_KEYS.map(key=>[key,storage.getItem(key)]));
    if(!lastDataRaw||DATA_KEYS.some(key=>raw[key]!==lastDataRaw[key])){
      lastSnapshot=snapshot(raw);lastDataRaw=raw;
    }
    return lastSnapshot;
  }
  function inspect(){
    try{
      if(storage.getItem(KEYS.journal)!==null||storage.getItem(LAUNCHPAD_JOURNAL)!==null)return 'check';
      const raw=storage.getItem(KEYS.metadata),meta=raw===null?null:JSON.parse(raw);
      if(!meta)return 'idle';
      if(meta.version!==1||!meta.lastFile?.workspaceId)return 'check';
      if(meta.pendingExport||meta.active?.phase==='exporting')return 'upload';
      if(!meta.active)return 'idle';
      if(meta.active.phase!=='editing')return 'check';
      if(raw!==loadedRaw)return 'checking';
      if(baseline===null)return 'check';
      return hasProgressChanges(baseline,currentSnapshot())?'changed':'clean';
    }catch{return 'check';}
  }
  const needsWarning=()=>!['idle','clean'].includes(inspect())&&!safetyMatches();
  function beforeUnload(event){
    if(allowUntil>Date.now()){allowUntil=0;return;}
    if(needsWarning()){event.preventDefault();event.returnValue='';}
  }
  function publish(){
    const next=inspect(),active=next!=='idle';
    if(active!==listening){win[active?'addEventListener':'removeEventListener']('beforeunload',beforeUnload);listening=active;}
    if(next!==state){state=next;win.dispatchEvent(new CustomEvent('wwhs:team-exit-status',{detail:{state}}));}
  }
  async function refreshBaseline(){
    publish();
    let raw,meta;
    try{raw=storage.getItem(KEYS.metadata);meta=raw===null?null:JSON.parse(raw);}catch{return;}
    if(!meta?.active||meta.active.phase!=='editing'||raw===loadedRaw||raw===loadingRaw)return;
    loadingRaw=raw;const ticket=++sequence;
    let next=null;
    try{
      // Only the baseline is needed; do not duplicate recovery/export copies.
      const hydrated=await hydrate({version:meta.version,lastFile:meta.lastFile,active:meta.active});
      next=hydrated.active.baselineData;
    }catch{/* Keep a warning if the baseline cannot be checked. */}
    if(ticket!==sequence)return;
    loadingRaw=undefined;
    if(storage.getItem(KEYS.metadata)!==raw){void refresh();return;}
    loadedRaw=raw;baseline=next;publish();
  }
  async function refresh(){await Promise.all([refreshBaseline(),refreshSafety()]);publish();}
  async function acknowledge(expected){
    const result=await acknowledgeSafetyBackup(storage,expected,{cryptoProvider:win.crypto||globalThis.crypto});
    safetySequence++;safetyVerified=result;publish();return true;
  }
  function allowNavigation(href){
    if(!isWorkboardDestination(href,base))return false;
    // One navigation only. Other handlers still protect unsaved form text.
    allowUntil=Date.now()+1000;return true;
  }
  doc.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
    const url=new URL(link.href,win.location.href);
    if(url.pathname===win.location.pathname&&url.search===win.location.search&&link.href.includes('#'))return;
    allowNavigation(url.href);
  });
  for(const name of ['wwhs:records-updated','wwhs:review-updated','wwhs:work-saved','wwhs:work-reloaded','wwhs:team-session-updated','focus','pageshow'])win.addEventListener(name,()=>void refresh());
  win.addEventListener('storage',event=>{if(event.key===null||watched.includes(event.key))void refresh();});
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)void refresh();});
  const guard=Object.freeze({refresh,status:()=>state,allowNavigation,acknowledgeSafetyBackup:acknowledge,hasSafetyBackup:safetyMatches});
  win.WWHS_TEAM_EXIT_GUARD=guard;void refresh();return guard;
}
if(typeof window==='object')installTeamExitGuard(window,document,window.WWHS_STORAGE||localStorage);
