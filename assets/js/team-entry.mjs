// Entry guidance only: never import, export or alter task/session records here.
export function installTeamEntry({wing,base,header}) {
  if(!['vet','tas'].includes(wing))return;
  const make=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
  const handover=new URL(`team-handover/?wing=${wing}`,base).href;
  const banner=make('aside',undefined,{class:'workspace-team-banner backup-toolbar','aria-label':`${wing.toUpperCase()} backups`});
  const copy=make('div',undefined,{class:'backup-toolbar-copy'}),heading=make('span',undefined,{class:'team-entry-status backup-toolbar-status'}),description=make('p');
  const actions=make('div',undefined,{class:'team-entry-actions backup-toolbar-actions'});
  const importLink=make('a','Open backup…',{href:`${handover}#import-backup`,class:'team-entry-guide'});
  const saveLink=make('a','Save backup…',{href:`${handover}#save-backup`,class:'team-entry-primary'});
  const guide=make('button','Details',{type:'button',class:'team-entry-details','aria-haspopup':'dialog','aria-controls':'team-import-prompt'});
  copy.append(make('span',`${wing.toUpperCase()} backups`,{class:'backup-toolbar-label'}),heading);
  actions.append(importLink,saveLink,guide);banner.append(copy,actions);header.after(banner);

  const dialog=make('dialog',undefined,{id:'team-import-prompt',class:'team-import-prompt','aria-labelledby':'team-import-title'});
  const title=make('h2',`${wing.toUpperCase()} backup details`,{id:'team-import-title'});
  const footer=make('div',undefined,{class:'team-entry-actions'});
  const close=make('button','Close',{type:'button',class:'team-entry-guide',autofocus:''});
  footer.append(make('a','Open backup…',{href:`${handover}#import-backup`,class:'team-entry-guide'}),make('a','Save backup…',{href:`${handover}#save-backup`,class:'team-entry-primary'}),close);
  dialog.append(title,description,make('p','Starting on another device? Open the latest backup. When you finish, save a backup for your colleague.'),make('p','Launchpad and Finance use separate private backups. Save shared work in Google Drive. Changes are not shared automatically.',{class:'team-entry-small'}),footer);
  document.body.append(dialog);
  guide.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
  close.addEventListener('click',()=>dialog.close());

  function refresh(message){
    const helper=window.WWHS_TEAM_SESSION,state=helper?.read(wing);
    let interrupted=false;try{interrupted=!!localStorage.getItem(helper?.JOURNAL);}catch{interrupted=true;}
    const editing=state?.managed&&helper.isEditing(wing),info=state?.lastFile;
    const blocked=!!(state?.blocked||interrupted||state?.active&&!editing);
    const waiting=editing&&window.WWHS_TEAM_EXIT_GUARD?.status()==='changed';
    const version=info?`Version ${info.revision} · ${info.savedBy} · ${new Date(info.savedAt).toLocaleDateString('en-AU')}. `:'';
    heading.textContent=blocked?'Check your team session':waiting?'Changes to back up':editing?`Editing as ${state.active.editor}`:state?.managed?'Your saved team progress':'Saved on this browser';
    description.textContent=message||(blocked?helper?.reason(wing)||'Open Review issue before continuing.':waiting?'Save your changes to the shared Google Drive folder before closing.':editing?`${version}Finish and save a backup to share your changes.`:state?.managed?`${version}Open the latest file before editing. This copy is view-only.`:'Open the latest shared backup to see your team’s progress.');
    banner.dataset.state=blocked?'blocked':waiting?'needed':editing?'editing':'viewing';
    banner.title=blocked?description.textContent:'';
    saveLink.title='Save the progress on this computer';
    importLink.title='Preview and open the latest backup';
    guide.textContent=blocked?'Review issue':'Details';
  }
  window.addEventListener('storage',event=>{if(event.key===null||event.key?.startsWith('wwhs-team-'))refresh();});
  window.addEventListener('wwhs:team-session-updated',()=>refresh());
  window.addEventListener('wwhs:team-exit-status',()=>refresh());
  window.addEventListener('wwhs:team-write-blocked',event=>refresh(event.detail?.message));
  refresh();
}
