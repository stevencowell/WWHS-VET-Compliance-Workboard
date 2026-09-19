import {BACKUP_KEYS,MAX_BACKUP_BYTES,parseLaunchpadBackup,planLaunchpadRestore,backupCounts} from './launchpad-backup.mjs?v=backup-flow-2';
import {applyLaunchpadRestore,captureLaunchpadTeamGuard} from './launchpad-backup-transaction.mjs?v=backup-flow-2';
import {validateInbox} from './summary-core.mjs?v=backup-flow-2';
const storage=()=>globalThis.WWHS_STORAGE||globalThis.localStorage;
const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const[key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;};

export function installLaunchpadBackupDialog(board){
  let preview=null;
  const dialog=board.backupDialog=el('dialog',undefined,{class:'chatgpt-chooser launchpad-backup-dialog','aria-labelledby':'launchpad-backup-title'});
  dialog.addEventListener('cancel',event=>{if(board.backupImportBusy)event.preventDefault();});
  dialog.append(el('p','Launchpad · Private backup',{class:'import-save-scope'}),el('h2','Open backup',{id:'launchpad-backup-title'}),el('p','Choose your Launchpad backup from your private folder or Downloads. It brings back notes, completed tasks, calendar, older plans and saved links. Older task-only backups still work.'),el('p','Missing records are added. Records already here stay unless you choose the backup versions below. Nothing here is removed.'),el('p','Finance and shared VET/TAS progress use their own Open backup controls.',{class:'import-help'}));
  const file=board.backupFile=el('input',undefined,{type:'file',accept:'.json,application/json',id:'launchpad-backup-file'});
  const message=board.backupMessage=el('p','',{role:'status','aria-live':'polite'});
  const details=board.backupStorageDetails=el('details');details.hidden=true;
  const prefer=el('input',undefined,{type:'checkbox'}),choice=el('label','Use versions from this backup where records differ',{class:'launchpad-backup-choice'});choice.prepend(prefer);choice.hidden=true;
  const apply=el('button','Open backup',{type:'button',class:'import-primary'}),cancel=el('button','Cancel',{type:'button'});
  const busy=value=>{board.backupImportBusy=value;apply.disabled=value||!preview;cancel.disabled=value;file.disabled=value;prefer.disabled=value;};
  board.resetBackupPreview=()=>{preview=null;prefer.checked=false;choice.hidden=true;busy(false);};board.resetBackupPreview();
  cancel.addEventListener('click',()=>dialog.close());
  const prepare=async chosen=>{
    board.resetBackupPreview();if(!chosen)return;busy(true);
    try{
      if(chosen.size>MAX_BACKUP_BYTES)throw new Error('This Launchpad backup is too large to open safely. Keep the original file.');
      const raw=await chosen.text(),backup=parseLaunchpadBackup(raw);
      const keep=planLaunchpadRestore(storage(),backup),frozen={getItem:key=>keep.before[key]??null},use=planLaunchpadRestore(frozen,backup,{preferBackup:true});
      preview={keep,use,raw};const counts=backupCounts(backup);choice.hidden=!keep.counts.different;
      const coverage=backup.legacy==='tasks'?`${counts.tasks} tasks · Older task-only backup; calendar, plans and links stay as they are.`:backup.legacy==='calendar'?`${counts.events} calendar events · Calendar-only backup; tasks, plans and links stay as they are.`:`${counts.tasks} tasks, ${counts.events} calendar events, ${counts.days} older daily plans, ${counts.links} saved links.`;
      message.setAttribute('role','status');message.textContent=coverage+(keep.counts.different?` ${keep.counts.different} matching records differ. Keep the browser versions, or tick below to use this file’s versions.`:'');
    }catch(error){message.setAttribute('role','alert');message.textContent='Could not open this backup. '+error.message;}
    finally{busy(false);}
  };
  file.addEventListener('change',()=>void prepare(file.files[0]));
  board.openBackupFile=async chosen=>{board.openTaskBackupImport();await prepare(chosen);};
  apply.addEventListener('click',async()=>{
    if(!preview)return;
    if(board.hasNoteDraft()||board.calendar?.hasDraft()){message.textContent='Save or cancel your open note or calendar event first. Your draft is still here.';return;}
    busy(true);
    try{
      const plan=prefer.checked?preview.use:preview.keep;
      const teamGuard=captureLaunchpadTeamGuard(storage());
      if(board.blocked||storage().getItem(BACKUP_KEYS.inbox)!==board.raw)throw new Error('Your shared work list changed in another tab. Reload saved work before opening a backup.');
      if(window.WWHS_TEAM_SESSION&&!window.WWHS_TEAM_SESSION.allowWrite(BACKUP_KEYS.inbox,validateInbox(plan.after[BACKUP_KEYS.inbox])))throw new Error(window.WWHS_TEAM_SESSION.reason());
      await applyLaunchpadRestore(storage(),plan.before,plan.after,{preservePrevious:plan.counts.updated>0,teamGuard});
      board.raw=storage().getItem(BACKUP_KEYS.inbox);board.inbox=validateInbox(board.raw);board.legacyRaw=storage().getItem(BACKUP_KEYS.plans);
      board.calendar?.reloadSaved();board.renderItems();dialog.close();
      for(const key of [BACKUP_KEYS.links,BACKUP_KEYS.theme])if(plan.before[key]!==plan.after[key])window.dispatchEvent(new StorageEvent('storage',{key,newValue:plan.after[key],oldValue:plan.before[key]}));
      window.dispatchEvent(new CustomEvent('launchpad:backup-restored',{detail:{raw:preview.raw}}));window.dispatchEvent(new Event('wwhs:work-reloaded'));
      board.say(`Backup opened. ${plan.counts.added} records added${plan.counts.updated?`; ${plan.counts.updated} matching records updated`:''}${plan.counts.kept?`; ${plan.counts.kept} different records kept as they were in this browser`:''}. Save a fresh backup after making changes.`);
    }catch(error){
      board.say(error.message,true);
      if(error.recoveryRequired){dialog.close();board.disconnectedCallback();board.showRestoreRecovery(error);}
    }finally{busy(false);}
  });
  const actions=el('div',undefined,{class:'import-actions'});actions.append(apply,cancel);
  dialog.append(el('label','Choose a Launchpad backup',{for:'launchpad-backup-file'}),file,message,choice,details,actions);board.append(dialog);
}
