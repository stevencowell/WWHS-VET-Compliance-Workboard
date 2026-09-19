const workStorage=()=>globalThis.WWHS_STORAGE||globalThis.localStorage;
import {INBOX_KEY,validateInbox} from './summary-core.mjs?v=backup-flow-2';
import {isTeamItem} from '../../assets/js/team-handover-core.mjs?v=team-handover-1';
import {mountBackupFolderSettings} from '../../assets/js/backup-folder-ui.mjs?v=backup-flow-2';
import {BACKUP_KEYS,snapshotLaunchpad,launchpadContent,parseLaunchpadBackup,backupCounts} from './launchpad-backup.mjs?v=backup-flow-2';
import {readPreviousLaunchpadBackup} from './launchpad-backup-transaction.mjs?v=backup-flow-2';
import {choosePrivateBackupDestination} from '../../assets/js/backup-folder.mjs?v=backup-flow-2';

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
  let record=null,error='',current=null,pending=null,checking=true,sequence=0,exportSequence=0,hasContent=false;
  const content=()=>{const records=snapshotLaunchpad(storage),counts=backupCounts(records);hasContent=Object.values(counts).some(Boolean)||Boolean(records[BACKUP_KEYS.theme]);return launchpadContent(records);};
  function readRecord(){
    const raw=storage.getItem(NOTES_BACKUP_KEY);if(raw===null)return null;
    const value=JSON.parse(raw);
    if(value?.version!==1||typeof value.enabled!=='boolean'||!/^\w{64}$/.test(value.baseline)||value.confirmedAt!==null&&typeof value.confirmedAt!=='string')throw Error('The backup reminder could not be read. Your notes have not been changed.');
    return value;
  }
  function state(){return {enabled:record?.enabled!==false,checking,needsBackup:!!current&&(current!==record?.baseline||hasContent&&!record?.confirmedAt),
    canConfirm:!!pending&&pending===current&&!checking&&!error,confirmedAt:record?.confirmedAt||null,error};}
  const emit=()=>onChange(state());
  function save(next){storage.setItem(NOTES_BACKUP_KEY,JSON.stringify(next));record=next;}
  // Establish a starting point once; do not pretend it is a verified backup.
  const ready=(async()=>{
    try{record=readRecord();if(!record){const baseline=await hash(content());save({version:1,enabled:true,baseline,confirmedAt:null});}}
    catch(failure){error=failure.message;}
  })();
  async function refresh(){
    const ticket=++sequence;checking=true;emit();await ready;
    try{
      const stored=readRecord();if(stored)record=stored;else if(!record)save({version:1,enabled:true,baseline:await hash(content()),confirmedAt:null});
      const text=content(),value=await hash(text);
      if(ticket!==sequence)return;
      if(text!==content()){await refresh();return;}
      current=value;if(pending&&pending!==current)pending=null;
      error='';checking=false;emit();
    }catch(failure){if(ticket===sequence){error=failure.message;checking=false;emit();}}
  }
  async function downloaded(raw){
    const ticket=++exportSequence;pending=null;emit();
    try{
      const backup=parseLaunchpadBackup(raw),records={...Object.fromEntries(Object.values(BACKUP_KEYS).map(key=>[key,null])),...backup.records};
      const value=await hash(launchpadContent(records));await refresh();
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
  const panel=make('aside',undefined,{class:'private-backup-reminder import-save-panel','aria-label':'Private Launchpad backup'});
  const title=make('h2','Your backup'),copy=make('p'),status=make('p','',{role:'status',class:'private-backup-status'});
  const toggle=make('input',undefined,{type:'checkbox'}),label=make('label');toggle.checked=true;label.append(toggle,document.createTextNode('Remind me before closing if my Launchpad needs a backup'));
  const actions=make('div',undefined,{class:'private-backup-actions'}),importBackup=make('button','Open backup…',{type:'button','data-backup-action':'import'}),download=make('button','Save backup…',{type:'button','data-backup-action':'save'}),fallback=make('button','Download a copy',{type:'button'}),confirm=make('button','I’ve saved this backup',{type:'button'});confirm.hidden=true;actions.append(importBackup,download);
  const more=make('details',undefined,{class:'private-backup-more'}),secondary=make('div',undefined,{class:'private-backup-actions'});secondary.append(fallback);more.append(make('summary','More backup options'),label,secondary);
  const previous=make('button','Save previous copy…',{type:'button'});previous.hidden=true;secondary.append(previous);
  const refreshPrevious=async()=>{try{previous.hidden=!await readPreviousLaunchpadBackup();}catch{previous.hidden=false;}};
  previous.addEventListener('click',async()=>{
    try{
      const destination=await choosePrivateBackupDestination({suggestedName:'launchpad-before-restore.json',id:'launchpad-before-restore'});if(!destination)return;
      const backup=await readPreviousLaunchpadBackup();if(!backup)throw Error('No previous replacement copy is saved in this browser.');
      const result=await destination.write(JSON.stringify(backup));status.textContent=result.saved?'Previous Launchpad copy saved. Open it to review the work from before the last replacement.':'Previous copy download requested. Check that the file saved before opening it.';
    }catch(error){status.textContent=error.message;}
  });
  void refreshPrevious();
  const confirmation=make('div',undefined,{class:'private-backup-actions'});confirmation.append(confirm);
  panel.append(make('p','Launchpad · Private backup',{class:'import-save-scope'}),title,make('p','One file for your notes, completed tasks, calendar, older plans and saved links.'),actions,copy,status,confirmation,more,make('p','Use the latest file when changing device. Files do not sync automatically. Keep this private; Finance and shared VET/TAS progress have separate backups.',{class:'private-backup-small'}));
  mountBackupFolderSettings(more,{scope:'private'});
  header.after(panel);
  let tracker,listener=false;
  function draftPending(){
    const board=document.querySelector('summary-import');
    if(board?.calendar?.hasDraft())return true;
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
    copy.textContent=draftPending()?'Save or cancel the open note or calendar event before backing up.':value.needsBackup?'Saved in this browser. Save a backup to keep a separate copy.':value.confirmedAt?'Your last confirmed backup covers the current Launchpad.':'Your Launchpad is ready. Saved notes and dates will be included in one backup.';
    if(value.error)status.textContent=value.error;
    const needed=!!(value.enabled||draftPending());
    if(needed!==listener){window[needed?'addEventListener':'removeEventListener']('beforeunload',beforeUnload);listener=needed;}
  }
  tracker=createNotesBackupTracker(workStorage(),{onChange:render});
  toggle.addEventListener('change',()=>void tracker.setEnabled(toggle.checked));
  importBackup.addEventListener('click',()=>{
    const board=document.querySelector('summary-import');
    if(!board?.started||!board?.openTaskBackupImport){status.textContent='Finish opening or recovering your Launchpad first. Recovery controls are shown with the task list.';return;}
    board.openTaskBackupImport();
  });
  download.addEventListener('click',()=>{
    const board=document.querySelector('summary-import');
    if(draftPending()){status.textContent='Save or cancel the open note or event first, then save your backup.';return;}
    if(!board?.started||!board?.exportTaskBackup){status.textContent='Finish opening or recovering your Launchpad first. Recovery controls are shown with the task list.';return;}
    board.exportTaskBackup();
  });
  fallback.addEventListener('click',()=>{
    if(draftPending()){status.textContent='Save or cancel the open note or event first, then save your backup.';return;}
    document.querySelector('summary-import')?.exportTaskBackup({downloadOnly:true});
  });
  confirm.addEventListener('click',async()=>{
    if(draftPending()){status.textContent='Save or cancel the open note or event, then save a fresh backup.';return;}
    status.textContent=await tracker.confirm()?'Backup confirmed. New changes will bring the reminder back.':'Notes changed after that download, or the confirmation could not be saved. Download a fresh backup.';
  });
  window.addEventListener('launchpad:task-backup-requested',async event=>{
    status.textContent=event.detail.saved?'Launchpad backup saved to your chosen folder.':'Download requested. Check that the file saved, then confirm below.';
    if(!await tracker.downloaded(event.detail.raw))status.textContent='Your Launchpad changed while the backup was saving. Save a fresh backup to include the latest changes.';
    else if(event.detail.saved&&!draftPending())await tracker.confirm();
  });
  window.addEventListener('launchpad:backup-restored',async event=>{
    void refreshPrevious();
    await tracker.refresh();
    // A file the user opened already exists. Confirm it only if it exactly
    // covers the restored current state; a merge still needs a fresh copy.
    if(event.detail?.raw&&await tracker.downloaded(event.detail.raw)&&!draftPending())await tracker.confirm();
  });
  for(const name of ['wwhs:work-saved','wwhs:work-reloaded','launchpad:calendar-saved','launchpad:plan-updated','launchpad:preferences-saved','focus','pageshow'])window.addEventListener(name,()=>void tracker.refresh());
  window.addEventListener('storage',event=>{if([null,...Object.values(BACKUP_KEYS),NOTES_BACKUP_KEY].includes(event.key))void tracker.refresh();});
  document.addEventListener('input',event=>{if(!panel.contains(event.target))render(tracker.state());});
  document.addEventListener('click',event=>{if(!panel.contains(event.target))setTimeout(()=>render(tracker.state()),0);});
  window.addEventListener('launchpad:note-draft',()=>render(tracker.state()));
  window.WWHS_PRIVATE_NOTES_BACKUP=tracker;return tracker;
}
