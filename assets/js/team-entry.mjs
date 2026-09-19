// Entry guidance only: never import, export or alter task/session records here.
export function installTeamEntry({wing,base,header}) {
  const make=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
  const handover=new URL(`team-handover/?wing=${wing==='tas'?'tas':'vet'}`,base).href;
  const drive='https://drive.google.com/drive/folders/1cAlk5cGGQef1jOJ_x53RyhXuAUkZvKVA';
  const seenKey='wwhs-team-import-prompt-seen:v1';
  let shown=false;
  const inWing=()=>wing==='tas'?location.hash!=='#my-work':wing==='vet'&&!['','#home','#my-work'].includes(location.hash);
  const banner=make('aside',undefined,{class:'workspace-team-banner','aria-label':'VET and TAS shared progress: import and save'});
  const copy=make('div'),heading=make('span',undefined,{class:'team-entry-status'}),description=make('span'),actions=make('div',undefined,{class:'team-entry-actions'});
  const importLink=make('a','Open backup…',{href:`${handover}#import-backup`,class:'team-entry-primary'});
  const saveLink=make('a','Save backup…',{href:`${handover}#save-backup`,class:'team-entry-guide'});
  const guide=make('button','Help',{type:'button',class:'team-entry-guide'});
  copy.append(make('span','!',{class:'team-entry-mark','aria-hidden':'true'}),make('span','VET + TAS · Shared progress',{class:'team-entry-label'}),make('strong','Backups'),heading,description,make('span','One backup for both sections',{class:'team-entry-file'}));actions.append(importLink,saveLink,guide);banner.append(copy,actions);header.after(banner);

  const dialog=make('dialog',undefined,{id:'team-import-prompt',class:'team-import-prompt','aria-labelledby':'team-import-title','aria-describedby':'team-import-intro'});
  const title=make('h2','Start with your team’s saved progress',{id:'team-import-title'});
  const intro=make('p','On a new phone or computer, import the latest shared file to see your team’s notes and completed tasks.',{id:'team-import-intro'});
  const steps=make('ol');
  const first=make('li');first.append(make('a','Open the shared Drive folder ↗',{href:drive,target:'_blank',rel:'noopener noreferrer'}),make('span',' and find WWHS-team-handover.json in 01 Current handover. On a phone, download it first if needed.'));
  const second=make('li','Choose Open backup… and select the latest file. Review it, then open it for editing or just to view. Use Save backup when you finish.');steps.append(first,second);
  const primary=make('a','Open backup…',{href:`${handover}#import-backup`,class:'team-entry-primary',autofocus:''});
  const browse=make('button','Browse without importing',{type:'button',class:'team-entry-guide'});
  const footer=make('div',undefined,{class:'team-entry-actions'});footer.append(primary,browse);
  dialog.append(make('p',`${wing.toUpperCase()} · FIRST STEP`,{class:'eyebrow'}),title,intro,steps,footer,make('p','Import brings across both VET and TAS. Your personal Launchpad and Finance stay separate. If you edit shared work, finish and save the handover file to your shared Drive folder.',{class:'team-entry-small'}));
  document.body.append(dialog);
  function remember(){shown=true;try{sessionStorage.setItem(seenKey,'yes');}catch{}}
  function show(){if(dialog.open)return;dialog.showModal();remember();}
  browse.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',remember);
  guide.addEventListener('click',show);
  function maybePrompt(){
    const state=window.WWHS_TEAM_SESSION?.read();
    if(!inWing()||!state||state.managed||shown||document.querySelector('dialog[open]'))return;
    try{if(localStorage.getItem(window.WWHS_TEAM_SESSION.JOURNAL))return;}catch{return;}
    try{if(sessionStorage.getItem(seenKey)==='yes')return;}catch{}
    show();
  }
  function refresh(message){
    const helper=window.WWHS_TEAM_SESSION,state=helper?.read();
    let interrupted=false;try{interrupted=!!localStorage.getItem(helper?.JOURNAL);}catch{interrupted=true;}
    const needsImport=inWing()&&!state?.managed;
    banner.hidden=!needsImport&&!state?.managed&&!interrupted;
    if(banner.hidden)return;
    const editing=state?.managed&&helper.isEditing(),info=state?.lastFile;
    const version=info?`Version ${info.revision} · ${info.savedBy} · ${new Date(info.savedAt).toLocaleDateString('en-AU')}. `:'';
    heading.textContent=editing?`Editing as ${state.active.editor}`:state?.active||state?.blocked||interrupted?'Check your team session':needsImport?'Start here: import the latest backup':'Your saved team progress';
    const waiting=editing&&window.WWHS_TEAM_EXIT_GUARD?.status()==='changed';
    description.textContent=message||(waiting?'Changes waiting for handover. Finish and save the backup to your shared Google Drive folder before closing.':editing?`${version}Finish and save a backup to share your changes.`:state?.blocked||interrupted||state?.active?helper.reason():needsImport?'Bring in your team’s notes and completion ticks from the shared Drive file.':`${version}Import the latest file before editing. This copy is view-only.`);
    banner.dataset.state=editing?'editing':state?.active||state?.blocked||interrupted?'blocked':'viewing';
    importLink.title='Preview and open a shared VET and TAS backup';
    saveLink.title='Save the VET and TAS progress on this computer';
    guide.hidden=!!state?.active||!!state?.blocked||interrupted;
    if(state?.managed&&dialog.open)dialog.close();
  }
  window.addEventListener('hashchange',()=>{refresh();maybePrompt();});
  window.addEventListener('storage',event=>{if(event.key===null||[window.WWHS_TEAM_SESSION?.KEY,window.WWHS_TEAM_SESSION?.JOURNAL].includes(event.key))refresh();});
  window.addEventListener('wwhs:team-session-updated',()=>refresh());
  window.addEventListener('wwhs:team-exit-status',()=>refresh());
  window.addEventListener('wwhs:team-write-blocked',event=>refresh(event.detail?.message));
  refresh();queueMicrotask(maybePrompt);
}
