import {getBackupFolder,BACKUP_AREAS} from './backup-folder.mjs?v=plain-language-1';

// Folder handles stay in this browser. A selected folder is not proof of cloud sync.
export function mountBackupFolderSettings(host,{scope='launchpad'}={}){
  const controller=getBackupFolder(scope),isPrivate=['private','launchpad','finance'].includes(scope),area=BACKUP_AREAS[scope];
  const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const panel=make('section');panel.className='backup-folder-settings';panel.dataset.backupScope=scope;
  panel.setAttribute('aria-label',area?`${area} backup folder`:isPrivate?'Default private backup folder':'Default shared handover folder');
  const title=make('strong',area?`${area} backup folder`:isPrivate?'Default private backup folder':'Default shared handover folder');
  const chosen=make('p'),help=make('p',area?`Choose your ${area} folder once. Open and Save backup will use it in this browser.`:isPrivate
    ?'Choose Steve - Private Backups in Google Drive. Each save adds a dated copy and keeps earlier backups.'
    :'Choose 01 Current handover in Google Drive. Save backup will check the existing file before replacing it.');
  help.className='backup-folder-help';
  const controls=make('div');controls.className='backup-folder-actions';
  const select=make('button'),forget=make('button','Use Save as instead');select.type=forget.type='button';
  select.dataset.folderAction='select';forget.dataset.folderAction='forget';
  const message=make('p');message.className='backup-folder-status';message.setAttribute('role','status');
  const note=make('p','This choice applies to this browser. Google Drive handles syncing after a file is saved.');note.className='backup-folder-help';
  controls.append(select,forget);panel.append(title,chosen,help,controls,message,note);host.append(panel);
  function render(state){
    chosen.textContent=state.loading?'Checking your saved folder…':state.name?`Selected: ${state.name}`:state.parentName?`${area} backups will go in their own folder inside ${state.parentName}. Older files stay where they are.`:'Choose this area’s folder once to remember it for Open and Save.';
    select.textContent=state.name?'Change folder…':area?`Choose ${area} folder…`:isPrivate?'Set private backup folder…':'Set shared handover folder…';
    select.disabled=forget.disabled=state.loading||state.busy;
    select.hidden=!state.supported;forget.hidden=!state.name;
    if(!state.supported){chosen.textContent='This browser cannot remember a folder. Use Save as or Download a copy. Chrome can remember your folder.';help.hidden=true;note.hidden=true;}
    message.textContent=state.error||'';
  }
  select.addEventListener('click',async()=>{try{const changed=await controller.select();if(changed)message.textContent=area?`${area} folder remembered for Open and Save.`:'Default folder saved in this browser.';}catch(error){message.textContent=error.message;}});
  forget.addEventListener('click',async()=>{try{await controller.forget();message.textContent='Folder choice cleared. Your backup files are unchanged.';}catch(error){message.textContent=error.message;}});
  controller.subscribe(render);render(controller.state());return controller;
}
