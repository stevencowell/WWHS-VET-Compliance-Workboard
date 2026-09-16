const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const dialog=el('dialog',null,{class:'calendar-choice','aria-labelledby':'calendar-choice-title'});
dialog.append(el('h2','Which calendar?',{id:'calendar-choice-title'}),el('p','Choose the calendar you need.'));
const choices=el('div',null,{class:'calendar-choice-options'});
const onLaunchpad=()=>!!document.querySelector('summary-import');
const local=el('a',null,{href:new URL('../#calendar',import.meta.url).href,target:'_blank',rel:'noopener noreferrer'});
local.append(el('strong','Launchpad calendar'),el('span','Your lessons, task dates and imported diary entries.'));
local.addEventListener('click',event=>{if(onLaunchpad()){event.preventDefault();dialog.close();window.dispatchEvent(new Event('launchpad:open-calendar'));}else dialog.close();});
const staff=el('a',null,{href:'https://waggawagga-h.sentral.com.au/s-lD94m0/webcal/calendar/17',target:'_blank',rel:'noopener noreferrer'});
staff.append(el('strong','Staff calendar (Sentral) ↗'),el('span','Live school dates and events. Opens in a new tab.'));
staff.addEventListener('click',()=>dialog.close());
choices.append(local,staff);dialog.append(choices);
const cancel=el('button','Cancel',{type:'button'});cancel.addEventListener('click',()=>dialog.close());dialog.append(cancel);document.body.append(dialog);
function open(){if(!dialog.open)dialog.showModal();}
window.addEventListener('launchpad:choose-calendar',open);
// Capture before the Head Teacher workboard's delegated system launcher.
document.addEventListener('click',event=>{
 const trigger=event.target.closest?.('a[href="https://waggawagga-h.sentral.com.au/s-lD94m0/webcal/calendar/17"],[data-action="launch-system"][data-system-id="staff-calendar"]');
 if(trigger){event.preventDefault();event.stopImmediatePropagation();open();}
},true);
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
