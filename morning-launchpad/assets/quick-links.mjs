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

const base=new URL('../../',import.meta.url);
function appDialog(id,title,desktop,web){
 if(document.querySelector(id))return;
 const d=el('dialog',null,{id:id.slice(1),class:'calendar-choice','aria-label':'Open '+title});
 d.append(el('h2','Open '+title));
 const choices=el('div',null,{class:'calendar-choice-options'});
 for(const[label,url]of [['Desktop app',desktop],['Web app',web]]){
  const a=el('a',label,{href:url,...(url.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})});
  a.addEventListener('click',()=>d.close());choices.append(a);
 }
 const cancel=el('button','Cancel',{type:'button'});cancel.addEventListener('click',()=>d.close());
 d.append(choices,el('p','If the desktop app does not open, choose Web app.'),cancel);document.body.append(d);
}
if(!document.querySelector('#root')){
 appDialog('#quick-evernote','Evernote','evernote:///','https://www.evernote.com/client/web');
 appDialog('#quick-chatgpt','ChatGPT','chatgpt://','https://chatgpt.com/');
}
function open(){
 panel.replaceChildren();
 const head=el('div',null,{class:'quick-links-heading'});
 const dismiss=el('button','×',{type:'button','aria-label':'Close quick links'});
 dismiss.addEventListener('click',()=>close());
 head.append(el('h2','Quick links'),dismiss);panel.append(head,el('p','Open an app and keep your place here.'));
 const nav=el('nav',null,{'aria-label':'Launchpad app shortcuts'});
 const cards=document.querySelectorAll('.destination-grid a.destination-card');
 for(const card of cards){
  const name=card.querySelector('h2')?.textContent||'Open app';
  if(card.getAttribute('href')==='evernote:///'){nav.append(chooser(name,'#evernote-chooser'));continue;}
  const a=el('a',name+' ↗',{href:card.href,target:'_blank',rel:'noopener noreferrer'});
  a.addEventListener('click',()=>close());nav.append(a);
 }
 if(!cards.length){
  const links=[['Morning Launchpad',new URL('morning-launchpad/',base).href],['Head Teacher TAS',new URL('head-teacher-tas/',base).href],['VET workboard',new URL('#vet-home',base).href],['Outlook','https://outlook.cloud.microsoft/mail/'],['Sentral','https://waggawagga-h.sentral.com.au/auth/'],['TAS Learning Hub','https://stevencowell.github.io/Main-Page/']];
  for(const[name,url]of links){const a=el('a',name+' ↗',{href:url,target:'_blank',rel:'noopener noreferrer'});a.addEventListener('click',()=>close());nav.append(a);}
  nav.append(chooser('Evernote','#quick-evernote'),chooser('ChatGPT','#quick-chatgpt'));
  const calendars=el('button','Calendars ›',{type:'button'});calendars.addEventListener('click',()=>{close();window.dispatchEvent(new Event('launchpad:choose-calendar'));});nav.append(calendars);
 }
 if(document.querySelector('.chatgpt-chooser'))nav.append(chooser('ChatGPT','.chatgpt-chooser'));
 panel.append(nav);panel.hidden=false;toggle.setAttribute('aria-expanded','true');
 dismiss.focus({preventScroll:true});
}
toggle.addEventListener('click',()=>panel.hidden?open():close());
dock.append(toggle,panel);document.body.append(dock);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}});
document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!dock.contains(event.target))close(false);});
