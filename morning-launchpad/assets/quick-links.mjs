// Read the current cards when opened so this shortcut menu follows the main links.
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const dock=el('div',null,{class:'quick-links-dock'});
const toggle=el('button','Quick links ↗',{type:'button',class:'quick-links-toggle','aria-expanded':'false','aria-controls':'quick-links-panel'});
const panel=el('aside',null,{id:'quick-links-panel',class:'quick-links-panel','aria-label':'Quick links'});
panel.hidden=true;
function close(restore=true){panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(restore)toggle.focus({preventScroll:true});}
function chooser(label,selector){
 const b=el('button',label+' ›',{type:'button'});
 b.addEventListener('click',()=>{const dialog=document.querySelector(selector);if(dialog){close();dialog.showModal();} });
 return b;
}
function open(){
 panel.replaceChildren();
 const head=el('div',null,{class:'quick-links-heading'});
 const dismiss=el('button','×',{type:'button','aria-label':'Close quick links'});
 dismiss.addEventListener('click',()=>close());
 head.append(el('h2','Quick links'),dismiss);panel.append(head,el('p','Open an app and keep your place here.'));
 const nav=el('nav',null,{'aria-label':'Launchpad app shortcuts'});
 for(const card of document.querySelectorAll('.destination-grid a.destination-card')){
  const name=card.querySelector('h2')?.textContent||'Open app';
  if(card.getAttribute('href')==='evernote:///'){nav.append(chooser(name,'#evernote-chooser'));continue;}
  const a=el('a',name+' ↗',{href:card.href,target:'_blank',rel:'noopener noreferrer'});
  a.addEventListener('click',()=>close());nav.append(a);
 }
 if(document.querySelector('.chatgpt-chooser'))nav.append(chooser('ChatGPT','.chatgpt-chooser'));
 panel.append(nav);panel.hidden=false;toggle.setAttribute('aria-expanded','true');
 dismiss.focus({preventScroll:true});
}
toggle.addEventListener('click',()=>panel.hidden?open():close());
dock.append(toggle,panel);document.body.append(dock);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}});
document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!dock.contains(event.target))close(false);});
