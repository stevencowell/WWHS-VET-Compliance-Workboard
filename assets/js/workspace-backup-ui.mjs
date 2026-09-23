import {captureWorkspace,createWorkspaceBackup,parseWorkspaceBackup,planOlderBackup,describeWorkspace,MAX_BYTES,RESTORE_KEY,EPOCH_KEY,RECEIPT_KEY} from './workspace-backup.mjs';
import {openWorkspaceRecovery,applyWorkspaceRestore,recoverWorkspace,withBackupLock} from './workspace-backup-transaction.mjs';
import {openVaultDatabase,createLocalVault} from '../../finance/security/local-vault.mjs?v=workspace-backup-1';
import {chooseBackupDestination,downloadDestination} from './save-backup-file.mjs?v=backup-flow-2';

const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const button=(text,action)=>{const b=el('button',text,{type:'button'});b.addEventListener('click',action);return b;};
const saved=()=>window.WWHS_STORAGE||localStorage;
const date=value=>new Date(value).toLocaleString('en-AU');
export function installWorkspaceBackup({header=document.querySelector('.workspace-header'),flush=async()=>{},recoverFinance}={}){
  if(window.WWHS_BACKUPS)return window.WWHS_BACKUPS;
  if(!document.querySelector('link[href*="workspace-backup.css"]')){const css=el('link',undefined,{rel:'stylesheet',href:new URL('../css/workspace-backup.css',import.meta.url).href});document.head.append(css);}
  const toolbar=el('aside',undefined,{class:'workspace-backup-toolbar','aria-label':'Backup all areas'});
  const copy=el('div'),status=el('span','One file for Launchpad, VET, TAS and Finance');
  copy.append(el('strong','All areas · one backup'),status);
  const controls=el('div'),openButton=button('Open backup…',()=>open('open')),saveButton=button('Save backup…',()=>open('save'));
  saveButton.className='workspace-backup-primary';controls.append(openButton,saveButton);toolbar.append(copy,controls);header.after(toolbar);
  const dialog=el('dialog',undefined,{class:'workspace-backup-dialog','aria-labelledby':'workspace-backup-title'});
  const title=el('h2','',{id:'workspace-backup-title'}),intro=el('p'),message=el('p','',{role:'status','aria-live':'polite'}),table=el('dl',undefined,{class:'workspace-backup-coverage'});
  const privateNotice=el('p','Keep this file in your private folder. It contains your notes and email text. Finance remains password protected.',{class:'workspace-backup-note'});
  const file=el('input',undefined,{type:'file',accept:'.json,application/json','aria-label':'Choose backup file'});
  const password=el('input',undefined,{type:'password',autocomplete:'current-password'}),passwordLabel=el('label','Finance password for this backup');passwordLabel.append(password);
  const confirmation=el('input',undefined,{type:'checkbox'}),confirmationLabel=el('label',undefined,{class:'workspace-backup-check'});confirmationLabel.append(confirmation,el('span','Use this backup’s saved data. A recovery copy of the current data will be kept in this browser.'));
  const action=button('Save backup…',()=>void run()),cancel=button('Close',()=>dialog.close()),actions=el('div',undefined,{class:'workspace-backup-actions'});action.className='workspace-backup-primary';actions.append(action,cancel);
  const reload=button('Reload saved work',()=>location.reload());reload.hidden=true;actions.append(reload);
  const confirmed=button('I’ve saved the downloaded file',()=>void confirmDownload());confirmed.hidden=true;
  const more=el('details'),moreCopy=el('p','Choose Open backup to recover an older Launchpad, VET, TAS or encrypted Finance file. Older files restore their own area only. Afterwards, Save backup creates one complete file.');
  const previous=button('Save the previous complete copy…',()=>void exportPrevious());
  const download=button('Download a copy instead',()=>void run(true));
  const recover=button('Recover interrupted restore',()=>void recoverInterrupted());
  more.append(el('summary','Older files and recovery'),moreCopy,previous,download,recover);
  if(recoverFinance)more.append(button('Rescue unsaved Finance edits…',async()=>{if(busy)return;setBusy(true);try{message.textContent=await recoverFinance();}catch(error){report(error);}finally{setBusy(false);}}),el('p','If Finance cannot save, this rescue option keeps an encrypted Finance-only copy of the edits still open here. Use the main Save backup button for all areas.'));
  dialog.append(el('p','YOUR PRIVATE WORKSPACE',{class:'workspace-backup-eyebrow'}),title,intro,privateNotice,file,table,passwordLabel,confirmationLabel,message,actions,confirmed,more);document.body.append(dialog);
  let busy=false,mode='save',preview=null,downloaded=null,resourcesPromise;
  const generation=saved().getItem(EPOCH_KEY);
  const resources=()=>resourcesPromise??=Promise.all([openVaultDatabase(indexedDB,'finance-studio-private-v1'),openWorkspaceRecovery()]).then(([finance,backend])=>({finance,backend}));
  function refreshStatus(){try{const receipt=JSON.parse(saved().getItem(RECEIPT_KEY));status.textContent=receipt?.savedAt?`Last backup saved ${date(receipt.savedAt)} · all four areas`:'One file for Launchpad, VET, TAS and Finance';}catch{status.textContent='One file for Launchpad, VET, TAS and Finance';}}
  function showData(data){table.replaceChildren();for(const [area,detail]of describeWorkspace(data))table.append(el('dt',area),el('dd',detail));}
  function setBusy(value){busy=value;for(const control of [action,cancel,file,password,confirmation,previous,download,recover,confirmed,reload])control.disabled=value;action.disabled=value||(mode==='open'&&(!preview||!confirmation.checked));}
  function report(error){message.textContent=error.message||String(error);message.dataset.error='true';}
  async function flushHere(){
    const board=document.querySelector('summary-import');
    if(board?.hasNoteDraft?.()||board?.calendar?.hasDraft?.())throw Error('Save or cancel the open note or calendar event first. Your draft is still here.');
    if(board?.blocked||board?.starting)throw Error('The task list needs to finish loading or recover before continuing.');
    await flush();
  }
  // Ask other open workboards to persist pending edits before a snapshot. Never
  // send records or passwords across the channel, only readiness messages.
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('wwhs-workspace-backup-v1'):null;
  const pending=new Map();
  channel?.addEventListener('message',async({data})=>{
    if(data?.type==='prepare'){
      channel.postMessage({type:'present',id:data.id,tab:tabId});
      try{await flushHere();channel.postMessage({type:'ready',id:data.id,tab:tabId});}catch(error){channel.postMessage({type:'ready',id:data.id,tab:tabId,error:error.message});}
    }else if(pending.has(data?.id))pending.get(data.id).push(data);
  });
  const tabId=crypto.randomUUID();
  async function flushAll(){
    await flushHere();if(!channel)return;
    const id=crypto.randomUUID(),responses=[];pending.set(id,responses);channel.postMessage({type:'prepare',id});
    try{
      await new Promise(resolve=>setTimeout(resolve,200));
      const tabs=new Set(responses.filter(r=>r.type==='present').map(r=>r.tab));
      const until=Date.now()+5000;
      while([...tabs].some(tab=>!responses.some(r=>r.type==='ready'&&r.tab===tab))&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,50));
      if([...tabs].some(tab=>!responses.some(r=>r.type==='ready'&&r.tab===tab)))throw Error('Another workboard tab is still saving. Finish its edits and try again.');
      const error=responses.find(r=>r.error);if(error)throw Error(`Another workboard tab: ${error.error}`);
    }finally{pending.delete(id);}
  }
  async function current(){const {finance}=await resources();return captureWorkspace(saved(),finance);}
  async function open(next='open'){
    if(busy)return;
    mode=next;preview=null;downloaded=null;file.value='';password.value='';confirmation.checked=false;confirmed.hidden=true;reload.hidden=saved().getItem(EPOCH_KEY)===generation;
    title.textContent=mode==='save'?'Save all areas':'Open one backup';
    intro.textContent=mode==='save'?'One file includes everything saved in this browser across all four areas, including notes, images and completed work. Saving keeps your work open for editing.':'Choose your complete backup. Review it below, then restore all four areas together. The file’s version replaces the current saved data, including areas that are empty in the file.';
    file.hidden=mode==='save';passwordLabel.hidden=true;confirmationLabel.hidden=true;download.hidden=mode!=='save';recover.hidden=!saved().getItem(RESTORE_KEY);more.open=!recover.hidden;
    action.textContent=mode==='save'?'Save backup…':'Restore all areas';table.replaceChildren();message.textContent='';delete message.dataset.error;setBusy(true);dialog.showModal();
    try{await flushHere();if(mode==='save')showData(await current());}catch(error){report(error);}finally{setBusy(false);}
  }
  file.addEventListener('change',async()=>{
    preview=null;confirmation.checked=false;password.value='';passwordLabel.hidden=true;confirmationLabel.hidden=true;table.replaceChildren();setBusy(true);message.textContent='Checking the file…';delete message.dataset.error;
    try{
      const chosen=file.files[0];if(!chosen){message.textContent='Choose a backup file.';return;}
      if(chosen.size>MAX_BYTES)throw Error('This backup is too large to open.');
      await flushAll();const parsed=await parseWorkspaceBackup(await chosen.text()),before=await current();
      const planned=parsed.legacy?planOlderBackup(before,parsed):{data:parsed.data};
      preview={before,after:planned.data,financeChanged:!parsed.legacy||planned.area==='Finance'};
      passwordLabel.hidden=!(preview.financeChanged&&preview.after.finance);confirmationLabel.hidden=false;
      showData(preview.after);message.textContent=parsed.legacy?`Older ${planned.area} backup. Only that area is restored; the other saved areas stay as they are.`:`Backup saved ${date(parsed.savedAt)}. All four areas will be restored.`;
      action.textContent=parsed.legacy?`Restore ${planned.area}`:'Restore all areas';
    }catch(error){preview=null;report(error);}finally{setBusy(false);}
  });
  confirmation.addEventListener('change',()=>setBusy(false));
  async function receipt(){saved().setItem(RECEIPT_KEY,JSON.stringify({savedAt:new Date().toISOString()}));refreshStatus();}
  async function confirmDownload(){if(!downloaded)return;try{await receipt();message.textContent='Complete backup confirmed. You can keep working in any area.';confirmed.hidden=true;}catch(error){report(error);}}
  async function run(downloadOnly=false){
    if(busy)return;setBusy(true);delete message.dataset.error;
    try{
      if(mode==='save'){
        const name=`wwhs-all-areas-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
        const destination=downloadOnly?downloadDestination(name):await chooseBackupDestination({suggestedName:name,id:'wwhs-private-workspace'});
        if(!destination){message.textContent='Save cancelled. Your data is unchanged.';return;}
        await flushAll();
        const backup=await withBackupLock(async()=>{if(saved().getItem(RESTORE_KEY)||saved().getItem('wwhs-team-handover-journal:v1')||saved().getItem('morning-launchpad-restore:v1'))throw Error('Finish the interrupted restore before saving a complete backup.');return createWorkspaceBackup(await current());});
        showData(backup.data);const result=await destination.write(JSON.stringify(backup));
        if(result.saved){await receipt();message.textContent='Complete backup saved. Launchpad, VET, TAS and Finance are in this one file.';}
        else{downloaded=backup;confirmed.hidden=false;message.textContent='Download started. Check your Downloads folder for the complete backup, then confirm below.';}
      }else{
        if(!preview||!confirmation.checked)throw Error('Choose and review a backup first.');
        await flushAll();const {finance,backend}=await resources(),after=structuredClone(preview.after);
        if(preview.financeChanged&&after.finance){
          const vault=await createLocalVault({}, {database:{read:()=>finance.read(),close(){}}});
          try{after.finance=await vault.prepareRestoreBackup(after.finance,password.value,preview.before.finance);}finally{vault.close();}
        }
        await applyWorkspaceRestore(saved(),finance,backend,preview.before,after);
        password.value='';preview=null;message.textContent='Backup restored. Reloading all saved areas…';
        window.dispatchEvent(new Event('wwhs:workspace-restored'));location.reload();
      }
    }catch(error){report(error);recover.hidden=!saved().getItem(RESTORE_KEY);more.open=!recover.hidden;reload.hidden=!recover.hidden||saved().getItem(EPOCH_KEY)===generation;if(!reload.hidden)message.textContent+=' Reload this area to continue.';}finally{setBusy(false);}
  }
  async function exportPrevious(){
    if(busy)return;setBusy(true);
    try{const destination=await chooseBackupDestination({suggestedName:'wwhs-previous-complete-backup.json',id:'wwhs-private-workspace'});if(!destination)return;const {backend}=await resources(),data=await backend.get('previous');if(!data)throw Error('There is no previous complete copy yet. One is kept when you restore a backup.');await destination.write(JSON.stringify(await createWorkspaceBackup(data)));message.textContent='Previous complete copy exported. Check the saved file. The current data is unchanged.';}catch(error){report(error);}finally{setBusy(false);}
  }
  async function recoverInterrupted(){
    if(busy)return;setBusy(true);
    try{const {finance,backend}=await resources();await recoverWorkspace(saved(),finance,backend);window.dispatchEvent(new Event('wwhs:workspace-restored'));location.reload();}catch(error){report(error);}finally{setBusy(false);}
  }
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  let staleBanner;
  function checkGeneration(){
    refreshStatus();
    if(saved().getItem(EPOCH_KEY)!==generation&&!staleBanner){
      staleBanner=el('aside','A backup was opened in another tab. Reload this area before editing.',{class:'workspace-backup-toolbar',role:'alert'});
      staleBanner.append(button('Reload saved work',()=>location.reload()));toolbar.after(staleBanner);
    }
  }
  window.addEventListener('focus',checkGeneration);window.addEventListener('storage',checkGeneration);refreshStatus();
  window.WWHS_BACKUPS=Object.freeze({open});return window.WWHS_BACKUPS;
}
