// A saved page can change workspaces without treating that click as an app exit.
// Each beforeunload handler owns an allowance; unsaved drafts must still warn.
export function isWorkboardDestination(href,base){
  try{
    const root=new URL(base),url=new URL(href,root);
    return url.origin===root.origin&&['','index.html','head-teacher-tas/','head-teacher-tas/index.html',
      'morning-launchpad/','morning-launchpad/index.html','finance/','finance/index.html',
      'team-handover/','team-handover/index.html','task-sources/','task-sources/index.html'].some(path=>url.pathname===root.pathname+path);
  }catch{return false;}
}

export function createWorkspaceNavigationAllowance(win,doc,{base=new URL('../../',import.meta.url),now=()=>Date.now()}={}){
  let allowUntil=0,clickEvent=null;
  function allowNavigation(href,event=null){
    allowUntil=0;clickEvent=null;
    if(!isWorkboardDestination(href,base))return false;
    allowUntil=now()+1000;clickEvent=event;return true;
  }
  function consume(){const allowed=allowUntil>now()&&!clickEvent?.defaultPrevented;allowUntil=0;clickEvent=null;return allowed;}
  doc.addEventListener('click',event=>{
    allowUntil=0;clickEvent=null;
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self')return;
    try{
      const current=new URL(win.location.href),url=new URL(link.href,current);
      // Hash-only routes do not unload. Never leave an allowance armed for them.
      if(url.pathname===current.pathname&&url.search===current.search&&url.origin===current.origin&&link.href.includes('#'))return;
      allowNavigation(url.href,event);
    }catch{/* An invalid link cannot suppress an exit warning. */}
  });
  return Object.freeze({allowNavigation,consume});
}
