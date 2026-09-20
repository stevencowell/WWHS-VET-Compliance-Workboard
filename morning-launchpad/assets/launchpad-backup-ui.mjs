import {BACKUP_KEYS,MAX_BACKUP_BYTES,parseLaunchpadBackup,planLaunchpadRestore,backupCounts} from './launchpad-backup.mjs?v=plain-language-1';
import {applyLaunchpadRestore,captureLaunchpadTeamGuard} from './launchpad-backup-transaction.mjs?v=plain-language-1';
import {validateInbox} from './summary-core.mjs?v=plain-language-1';
import {mountBackupFileBrowser} from '../../assets/js/backup-file-browser.mjs?v=plain-language-1';
const storage=()=>globalThis.WWHS_STORAGE||globalThis.localStorage;
const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const[key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;};

export function installLaunchpadBackupDialog(board){
  let preview=null;
  const dialog=board.backupDialog=el('dialog',undefined,{class:'chatgpt-chooser launchpad-backup-dialog','aria-labelledby':'launchpad-backup-title'});
  dialog.addEventListener('cancel',event=>{if(board.backupImportBusy)event.preventDefault();});
  dialog.append(el('p','Launchpad · Private backup',{class:'import-save-scope'}),el('h2','Open backup',{id:'launchpad-backup-title'}),el('p','Choose your Launchpad backup. It includes notes, completed tasks, calendar, older plans and saved links. Older task backups also work.'),el('p','New items will be added. Existing items stay as they are unless you choose the backup’s versions below. Nothing is removed.'),el('p','Open Finance, VET and TAS backups in their own area.',{class:'import-help'}));
  const file=board.backupFile=el('input',undefined,{type:'file',accept:'.json,application/json',id:'launchpad-backup-file'});
  file.hidden=true;
  const message=board.backupMessage=el('p','',{role:'status','aria-live':'polite'});
  const details=board.backupStorageDetails=el('details');details.hidden=true;
  const prefer=el('input',undefined,{type:'checkbox'}),choice=el('label','Use the backup’s version when an item is different',{class:'launchpad-backup-choice'});choice.prepend(prefer);choice.hidden=true;
  const apply=el('button','Open backup',{type:'button',class:'import-primary'}),cancel=el('button','Cancel',{type:'button'});
  const busy=value=>{board.backupImportBusy=value;apply.disabled=value||!preview;cancel.disabled=value;file.disabled=value;prefer.disabled=value;board.backupFileBrowser?.setDisabled(value);};
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
      message.setAttribute('role','status');message.textContent=coverage+(keep.counts.different?` ${keep.counts.different} items are different from those saved here. Keep the versions on this browser, or tick below to use the backup’s versions.`:'');
    }catch(error){message.setAttribute('role','alert');message.textContent='Could not open this backup. '+error.message;}
    finally{busy(false);}
  };
  file.addEventListener('change',()=>void prepare(file.files[0]));
  const files=el('div');board.backupFileBrowser=mountBackupFileBrowser(files,{scope:'launchpad',onFile:prepare,onError:error=>{board.resetBackupPreview();message.setAttribute('role','alert');message.textContent=error.message;}});
  dialog.addEventListener('close',()=>board.backupFileBrowser.reset());
  board.openBackupFile=async chosen=>{board.openTaskBackupImport();await prepare(chosen);};
  apply.addEventListener('click',async()=>{
    if(!preview)return;
    if(board.hasNoteDraft()||board.calendar?.hasDraft()){message.textContent='Save or cancel your open note or calendar event first. Your draft is still here.';return;}
    busy(true);
    try{
      const plan=prefer.checked?preview.use:preview.keep;
      const teamGuard=captureLaunchpadTeamGuard(storage());
      if(board.blocked||storage().getItem(BACKUP_KEYS.inbox)!==board.raw)throw new Error('Your task list changed in another tab. Reload saved work before opening a backup.');
      if(window.WWHS_TEAM_SESSION&&!window.WWHS_TEAM_SESSION.allowWrite(BACKUP_KEYS.inbox,validateInbox(plan.after[BACKUP_KEYS.inbox])))throw new Error(window.WWHS_TEAM_SESSION.reason());
      await applyLaunchpadRestore(storage(),plan.before,plan.after,{preservePrevious:plan.counts.updated>0,teamGuard});
      board.raw=storage().getItem(BACKUP_KEYS.inbox);board.inbox=validateInbox(board.raw);board.legacyRaw=storage().getItem(BACKUP_KEYS.plans);
      board.calendar?.reloadSaved();board.renderItems();dialog.close();
      for(const key of [BACKUP_KEYS.links,BACKUP_KEYS.theme])if(plan.before[key]!==plan.after[key])window.dispatchEvent(new StorageEvent('storage',{key,newValue:plan.after[key],oldValue:plan.before[key]}));
      window.dispatchEvent(new CustomEvent('launchpad:backup-restored',{detail:{raw:preview.raw}}));window.dispatchEvent(new Event('wwhs:work-reloaded'));
      board.say(`Backup opened. ${plan.counts.added} items added${plan.counts.updated?`; ${plan.counts.updated} existing items updated`:''}${plan.counts.kept?`; ${plan.counts.kept} different items kept as saved in this browser`:''}. Save a fresh backup after making changes.`);
    }catch(error){
      board.say(error.message,true);
      if(error.recoveryRequired){dialog.close();board.disconnectedCallback();board.showRestoreRecovery(error);}
    }finally{busy(false);}
  });
  const actions=el('div',undefined,{class:'import-actions'});actions.append(apply,cancel);
  dialog.append(files,file,message,choice,details,actions);board.append(dialog);
}
