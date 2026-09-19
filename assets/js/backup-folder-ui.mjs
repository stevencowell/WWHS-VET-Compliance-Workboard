import {getBackupFolder} from './backup-folder.mjs?v=default-folder-1';

// Folder handles stay in this browser. A selected folder is not proof of cloud sync.
export function mountBackupFolderSettings(host,{scope='private'}={}){
  const controller=getBackupFolder(scope),isPrivate=scope==='private';
  const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const panel=make('section');panel.className='backup-folder-settings';panel.dataset.backupScope=scope;
  panel.setAttribute('aria-label',isPrivate?'Default private backup folder':'Default shared handover folder');
  const title=make('strong',isPrivate?'Default private backup folder':'Default shared handover folder');
  const chosen=make('p'),help=make('p',isPrivate
    ?'Choose Steve - Private Backups in Google Drive once for Launchpad and Finance. Save backup then puts a dated copy there, keeping earlier backups.'
    :'Choose 01 Current handover in Google Drive once for VET and TAS. Save as will open there so you can replace the current handover file.');
  help.className='backup-folder-help';
  const controls=make('div');controls.className='backup-folder-actions';
  const select=make('button'),forget=make('button','Use Save as instead');select.type=forget.type='button';
  select.dataset.folderAction='select';forget.dataset.folderAction='forget';
  const message=make('p');message.className='backup-folder-status';message.setAttribute('role','status');
  const note=make('p','This choice applies to this browser. Google Drive handles syncing after a file is saved.');note.className='backup-folder-help';
  controls.append(select,forget);panel.append(title,chosen,help,controls,message,note);host.append(panel);
  function render(state){
    chosen.textContent=state.loading?'Checking your saved folder…':state.name?`Selected: ${state.name}`:'No default folder selected yet.';
    select.textContent=state.name?'Change folder…':isPrivate?'Set private backup folder…':'Set shared handover folder…';
    select.disabled=forget.disabled=state.loading||state.busy;
    select.hidden=!state.supported;forget.hidden=!state.name;
    if(!state.supported){chosen.textContent='Remembered folders are not available in this browser. Use Save as or Download a copy, or set a folder in Chrome.';help.hidden=true;note.hidden=true;}
    message.textContent=state.error||'';
  }
  select.addEventListener('click',async()=>{try{const changed=await controller.select();if(changed)message.textContent='Default folder saved for both areas in this browser.';}catch(error){message.textContent=error.message;}});
  forget.addEventListener('click',async()=>{try{await controller.forget();message.textContent='Default cleared. Your backup files have not been changed.';}catch(error){message.textContent=error.message;}});
  controller.subscribe(render);render(controller.state());return controller;
}
