import {getBackupFolder,BACKUP_AREAS} from './backup-folder.mjs?v=plain-language-1';
import {isBackupForArea,compatibleBackupFiles} from './backup-file-types.mjs?v=area-backups-1';

export function mountBackupFileBrowser(host,{scope,onFile,onError=()=>{}}){
  const controller=getBackupFolder(scope),label=BACKUP_AREAS[scope];
  if(!label)throw new Error('Choose a backup area.');
  if(!document.querySelector('[data-backup-file-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../css/backup-file-browser.css?v=area-backups-1',import.meta.url).href;style.dataset.backupFileStyle='';document.head.append(style);}
  const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const panel=el('section'),controls=el('div'),show=el('button',`Show ${label} backups`),browse=el('button','Browse files…'),input=el('input'),message=el('p'),list=el('ul');
  panel.className='backup-file-browser';panel.setAttribute('aria-label',`${label} backup files`);controls.className='backup-file-actions';message.setAttribute('role','status');
  show.type=browse.type='button';input.type='file';input.accept='.json,application/json';input.hidden=true;list.hidden=true;
  controls.append(show,browse);panel.append(controls,input,message,list);host.append(panel);
  let disabled=false,working=false,disposed=false,sequence=0;
  const render=()=>{const state=controller.state();for(const button of panel.querySelectorAll('button'))button.disabled=disabled||working||state.loading||state.busy;show.hidden=!state.supported;};
  const report=error=>{message.textContent=error.message;onError(error);};
  async function choose(file,token=sequence){
    if(!file||disabled||disposed||token!==sequence)return;
    if(file.size>240000000)throw new Error('This file is too large. Keep it and choose a supported backup.');
    let value;try{value=JSON.parse(await file.text());}catch{if(disposed||token!==sequence)return;throw new Error('This file could not be read as a backup. Your saved work is unchanged.');}
    if(disabled||disposed||token!==sequence)return;
    if(!isBackupForArea(value,scope))throw new Error(`This is not a ${label} backup. Choose a file saved from ${label}.`);
    message.textContent=`Selected: ${file.name}`;await onFile(file);
  }
  async function refresh(){
    if(disabled||working)return;working=true;const token=++sequence;render();message.textContent=`Checking ${label} backups…`;list.replaceChildren();list.hidden=true;
    try{
      const entries=await compatibleBackupFiles(await controller.files(),scope);
      if(disposed||token!==sequence)return;
      for(const entry of entries){
        const row=el('li'),button=el('button',entry.file.name),details=el('small',`${new Date(entry.file.lastModified).toLocaleString('en-AU')} · ${entry.folder}${entry.legacy?' · earlier folder':''}`);button.type='button';
        button.addEventListener('click',async()=>{if(disabled||working)return;const token=sequence;working=true;render();try{await choose(await entry.handle.getFile(),token);}catch(error){if(token===sequence&&!disposed)report(error);}finally{working=false;render();}});
        row.append(button,details);list.append(row);
      }
      list.hidden=!entries.length;message.textContent=entries.length?`${entries.length} ${label} backup${entries.length===1?'':'s'}. Newest first.`:`No ${label} backups here. Use Browse files, or change the folder in backup options.`;
    }catch(error){if(token===sequence&&!disposed)report(error);}finally{working=false;render();}
  }
  show.addEventListener('click',()=>void refresh());
  browse.addEventListener('click',()=>{
    if(disabled||working)return;
    if(typeof window.showOpenFilePicker!=='function'){input.value='';input.click();return;}
    const token=sequence;working=true;render();controller.openFile().then(file=>choose(file,token)).catch(error=>{if(token===sequence&&!disposed)report(error);}).finally(()=>{working=false;render();});
  });
  input.addEventListener('change',()=>{const token=sequence;working=true;render();choose(input.files[0],token).catch(error=>{if(token===sequence&&!disposed)report(error);}).finally(()=>{working=false;render();});});
  const unsubscribe=controller.subscribe(render);render();
  return {refresh,reset(){sequence++;list.replaceChildren();list.hidden=true;message.textContent='';input.value='';},setDisabled(value){disabled=!!value;render();},dispose(){disposed=true;sequence++;unsubscribe();panel.remove();}};
}
