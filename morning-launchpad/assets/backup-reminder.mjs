import {INBOX_KEY,validateInbox} from './summary-core.mjs?v=email-cleanup-1';
import {isTeamItem} from '../../assets/js/team-handover-core.mjs?v=team-handover-1';

export const NOTES_BACKUP_KEY='morning-launchpad-backup-reminder:v1';
function sorted(value){
  if(Array.isArray(value))return value.map(sorted);
  return value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
}
export function privateNotesContent(raw){
  const inbox=validateInbox(raw),ignored=new Set(['id','selected','forecast','taskHelp','dirty','planStamp','planAliases','preserveDoneOnce']);
  const items=inbox.items.filter(item=>!isTeamItem(item)).map(item=>Object.fromEntries(Object.entries(item).filter(([key])=>!ignored.has(key))))
    .map(item=>JSON.stringify(sorted(item))).sort();
  const pins=inbox.items.filter(item=>isTeamItem(item)&&item.pinnedDate).map(item=>({taskKey:item.taskKey,pinnedDate:item.pinnedDate})).sort((a,b)=>a.taskKey.localeCompare(b.taskKey));
  return JSON.stringify({items,pins,briefing:inbox.briefing||''});
}
async function digest(text){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function createNotesBackupTracker(storage,{hash=digest,onChange=()=>{}}={}){
  let record=null,error='',current=null,pending=null,checking=true,sequence=0,exportSequence=0;
  function readRecord(){
    const raw=storage.getItem(NOTES_BACKUP_KEY);if(raw===null)return null;
    const value=JSON.parse(raw);
    if(value?.version!==1||typeof value.enabled!=='boolean'||!/^\w{64}$/.test(value.baseline)||value.confirmedAt!==null&&typeof value.confirmedAt!=='string')throw Error('The backup reminder could not be read. Your notes have not been changed.');
    return value;
  }
  function state(){return {enabled:record?.enabled!==false,checking,needsBackup:!!current&&current!==record?.baseline,
    canConfirm:!!pending&&pending===current&&!checking&&!error,confirmedAt:record?.confirmedAt||null,error};}
  const emit=()=>onChange(state());
  function save(next){storage.setItem(NOTES_BACKUP_KEY,JSON.stringify(next));record=next;}
  // Establish a starting point once; do not pretend it is a verified backup.
  const ready=(async()=>{
    try{record=readRecord();if(!record){const baseline=await hash(privateNotesContent(storage.getItem(INBOX_KEY)));save({version:1,enabled:true,baseline,confirmedAt:null});}}
    catch(failure){error=failure.message;}
  })();
  async function refresh(){
    const ticket=++sequence;checking=true;emit();await ready;
    try{
      const stored=readRecord();if(stored)record=stored;
      const content=privateNotesContent(storage.getItem(INBOX_KEY)),value=await hash(content);
      if(ticket!==sequence)return;
      if(content!==privateNotesContent(storage.getItem(INBOX_KEY))){await refresh();return;}
      current=value;if(pending&&pending!==current)pending=null;
      checking=false;emit();
    }catch(failure){if(ticket===sequence){error=failure.message;checking=false;emit();}}
  }
  async function downloaded(raw){
    const ticket=++exportSequence;pending=null;emit();
    try{
      const value=await hash(privateNotesContent(raw));await refresh();
      if(ticket!==exportSequence)return;
      pending=value===current?value:null;emit();return !!pending;
    }catch(failure){error=failure.message;emit();return false;}
  }
  async function confirm(){
    const expected=pending;await refresh();
    if(!expected||expected!==pending||!state().canConfirm)return false;
    try{save({...record,baseline:expected,confirmedAt:new Date().toISOString()});pending=null;emit();return true;}
    catch(failure){error='The backup confirmation could not be saved in this browser. '+failure.message;emit();return false;}
  }
  async function setEnabled(enabled){
    await ready;
    try{if(!record)throw Error('The reminder is unavailable. Your notes are unchanged.');save({...record,enabled});emit();return true;}
    catch(failure){error=failure.message;emit();return false;}
  }
  void refresh();return {refresh,downloaded,confirm,setEnabled,state};
}

export function installLaunchpadBackupReminder({header}){
  const make=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;};
  const panel=make('aside',undefined,{class:'private-backup-reminder','aria-label':'Private Launchpad backup'});
  const title=make('h2','Private Launchpad backup'),copy=make('p'),status=make('p','',{role:'status',class:'private-backup-status'});
  const toggle=make('input',undefined,{type:'checkbox'}),label=make('label');toggle.checked=true;label.append(toggle,document.createTextNode('Remind me before closing if my personal notes need a backup'));
  const actions=make('div',undefined,{class:'private-backup-actions'}),download=make('button','Save task backup…',{type:'button'}),fallback=make('button','Download a copy',{type:'button'}),confirm=make('button','I’ve saved this backup',{type:'button'});confirm.hidden=true;actions.append(download,fallback,confirm);
  panel.append(title,copy,label,actions,status,make('p','Choose your own private folder in Save as. A synced Google Drive folder uploads automatically. Keep this task file separate from the shared VET/TAS handover. Calendar events use Export calendar backup.',{class:'private-backup-small'}));
  header.after(panel);
  let tracker,listener=false;
  function draftPending(){
    const board=document.querySelector('summary-import');
    if(board?.querySelector('[data-note-unsaved="true"]'))return true;
    if(board?.noteEditor?.open){
      const old=board.inbox?.items.find(item=>item.id===board.editingNote);
      if(Object.entries(board.noteInputs||{}).some(([key,input])=>input.value!==(old?.[key]||'')))return true;
    }
    return false;
  }
  function beforeUnload(event){
    const current=tracker.state();
    if(draftPending()||current.enabled&&(current.checking||current.needsBackup||current.error)){event.preventDefault();event.returnValue='';}
  }
  function render(value){
    toggle.checked=value.enabled;confirm.hidden=!value.canConfirm;confirm.disabled=draftPending();
    panel.dataset.state=value.error?'error':value.needsBackup?'needed':'quiet';
    title.textContent=value.needsBackup?'Personal notes need a backup':'Private Launchpad backup';
    copy.textContent=draftPending()?'Save your open note before backing up. Unsaved text is not in the task file.':value.needsBackup?'Your changes are saved in this browser. Save a private task backup to keep a separate copy.':value.confirmedAt?'Your last confirmed task backup covers the current personal notes.':'Reminders watch for new changes to personal notes, tasks, pins and task dates.';
    if(value.error)status.textContent=value.error;
    const needed=!!(value.enabled||draftPending());
    if(needed!==listener){window[needed?'addEventListener':'removeEventListener']('beforeunload',beforeUnload);listener=needed;}
  }
  tracker=createNotesBackupTracker(localStorage,{onChange:render});
  toggle.addEventListener('change',()=>void tracker.setEnabled(toggle.checked));
  download.addEventListener('click',()=>{
    const board=document.querySelector('summary-import');
    if(draftPending()){status.textContent='Save your open note first, then download the task backup.';return;}
    if(!board?.exportTaskBackup){status.textContent='The task list is still opening. Try again in a moment.';return;}
    board.exportTaskBackup();
  });
  fallback.addEventListener('click',()=>{
    if(draftPending()){status.textContent='Save your open note first, then download the task backup.';return;}
    document.querySelector('summary-import')?.exportTaskBackup({downloadOnly:true});
  });
  confirm.addEventListener('click',async()=>{
    if(draftPending()){status.textContent='Save your open note and download a fresh backup first.';return;}
    status.textContent=await tracker.confirm()?'Backup confirmed. New changes will bring the reminder back.':'Notes changed after that download, or the confirmation could not be saved. Download a fresh backup.';
  });
  window.addEventListener('launchpad:task-backup-requested',async event=>{
    status.textContent=event.detail.saved?'Task backup saved to your chosen folder.':'Download requested. Check that the file saved, then confirm below.';
    if(!await tracker.downloaded(event.detail.raw))status.textContent='That file does not cover the latest personal notes. Reload saved work and save a fresh backup.';
    else if(event.detail.saved&&!draftPending())await tracker.confirm();
  });
  for(const name of ['wwhs:work-saved','wwhs:work-reloaded','focus','pageshow'])window.addEventListener(name,()=>void tracker.refresh());
  window.addEventListener('storage',event=>{if([null,INBOX_KEY,NOTES_BACKUP_KEY].includes(event.key))void tracker.refresh();});
  document.addEventListener('input',event=>{if(!panel.contains(event.target))render(tracker.state());});
  document.addEventListener('click',event=>{if(!panel.contains(event.target))setTimeout(()=>render(tracker.state()),0);});
  window.addEventListener('launchpad:note-draft',()=>render(tracker.state()));
  window.WWHS_PRIVATE_NOTES_BACKUP=tracker;return tracker;
}
