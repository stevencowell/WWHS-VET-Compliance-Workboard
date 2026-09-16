import {emailSearchText} from './email-search.mjs?v=1';
import './email-capture.mjs?v=3';
import './launchpad-calendar.mjs?v=8';
import {INBOX_KEY, LIMIT, parseSummary, validateInbox, mergeInbox, safeUrl, PRIORITIES, NEXT_ACTIONS, EDITABLE, enrich, todaySydney, bucket, rank, nextDate, consolidateDuplicates, LEGACY_PLAN_KEY, isPinned, migrateToPins, recordNoteAction} from './summary-core.mjs?v=11';

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
function button(text, action, className = '') {
  const node = element('button', text, {type: 'button', class: className});
  node.addEventListener('click', action);
  return node;
}

// An inert template retains links from Evernote HTML without executing scripts,
// rendering imported markup, or inserting its images into the live document.
export function textFromHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  fragment.querySelectorAll('script,style,iframe,object,embed,noscript,svg,form,template').forEach(node => node.remove());
  fragment.querySelectorAll('a[href]').forEach(node => {
    const url = safeUrl(node.getAttribute('href'));
    if (url && node.textContent.trim() !== url) node.append(document.createTextNode(` ${url}`));
  });
  fragment.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')));
  fragment.querySelectorAll('p,div,h1,h2,h3,h4,section,article,li,tr,table').forEach(node => {
    node.prepend(document.createTextNode('\n')); node.append(document.createTextNode('\n'));
  });
  return fragment.textContent;
}

function download(text, name, type='application/json') {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const link=element('a','Download',{href:url,download:name});link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function dateLabel(date) {
  return new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:'Australia/Sydney'}).format(new Date(date+'T12:00:00Z'));
}
class SummaryImport extends HTMLElement {
  connectedCallback() {
    if(this.started)return;this.started=true;
    this.view='ready';this.expanded=false;this.legacyRaw=null;this.blocked=false;this.raw=null;
    try {this.raw=localStorage.getItem(INBOX_KEY);this.inbox=validateInbox(this.raw);this.legacyRaw=localStorage.getItem(LEGACY_PLAN_KEY);} catch {this.blocked=true;this.inbox=validateInbox(null);}
    this.build();
    this.onStorage=event=>{if(event.key===INBOX_KEY||event.key===null){this.blocked=true;this.renderItems();this.say('This review list changed in another tab. Reload before making changes.',true);}};
    window.addEventListener('storage',this.onStorage);
    this.openToday=()=>{this.showCalendar(true);this.calendar.openDate(todaySydney(),'day');this.calendar.scrollIntoView({behavior:'smooth',block:'start'});};window.addEventListener('launchpad:open-today',this.openToday);
    this.openCalendarChoice=()=>this.showCalendar(true);window.addEventListener('launchpad:open-calendar',this.openCalendarChoice);if(location.hash==='#calendar')this.showCalendar(true);
    this.syncPlans();this.renderItems();this.displayDate=todaySydney();this.dayTimer=setInterval(()=>{const date=todaySydney();if(date!==this.displayDate){this.displayDate=date;this.renderItems();}},30000);
    if(this.blocked)this.say('Your saved review list could not be read. It is untouched. Export a copy before recovering it.',true);
  }
  disconnectedCallback(){window.removeEventListener('launchpad:open-calendar',this.openCalendarChoice);window.removeEventListener('launchpad:open-today',this.openToday);clearInterval(this.dayTimer);window.removeEventListener('storage',this.onStorage);this.started=false;}
  persist(next) {
    try {
      if(this.blocked||localStorage.getItem(INBOX_KEY)!==this.raw)throw new Error('The review list changed in another tab. Reload before saving.');
      const checked=validateInbox(JSON.stringify(next));const raw=JSON.stringify(checked);localStorage.setItem(INBOX_KEY,raw);this.raw=raw;this.inbox=checked;this.calendar?.setTasks(checked.items);return true;
    } catch(error){this.say(`Could not save: ${error.message} Your previous saved list is unchanged.`,true);return false;}
  }
  say(message,error=false){this.message.textContent=message;this.message.classList.toggle('import-error',error);this.fileMessage.textContent=message;this.fileMessage.classList.toggle('import-error',error);if(error){this.inputDetails.open=true;this.fileMessage.scrollIntoView({block:'center'});}}
  syncPlans(){
    if(this.blocked)return;
    const migration=migrateToPins(this.inbox,this.legacyRaw);
    const result=consolidateDuplicates(migration.inbox.items);
    if((migration.changed||result.changed)&&this.persist({...migration.inbox,items:result.items})){this.renderItems();if(migration.warning)this.say(migration.warning);}
  }
  build() {
    this.replaceChildren();this.setAttribute('aria-label','Import and review your email summary');
    const heading=element('div',undefined,{class:'import-heading'});const copy=element('div');
    copy.append(element('p','FROM YOUR NOTES TO TODAY',{class:'eyebrow'}),element('h2','Bring your work into focus.'),element('p','Pin today’s priorities. Keep everything else here.',{class:'import-intro'}));
    this.calendarToggle=button('Calendar',()=>{if(!this.calendar.hidden)this.showCalendar(false);else window.dispatchEvent(new Event('launchpad:choose-calendar'));});
    const toolbar=element('div',undefined,{class:'import-heading-actions','aria-label':'Add and organise work'});toolbar.append(this.calendarToggle,button('Paste email',()=>{this.showCalendar(false);this.emailCapture.open();},'import-primary'),button('Add my note',()=>this.editPersonal()),button('Import email summary',()=>{this.showCalendar(false);this.inputDetails.open=true;this.file.focus();},'import-primary'));heading.append(copy,toolbar);this.append(heading);
    this.message=element('p','',{role:'status','aria-live':'polite',class:'import-message'});this.append(this.message);this.buildNoteEditor();
    this.emailCapture=element('email-capture');this.emailCapture.addEventListener('email:save',event=>{try{const data=validateInbox(JSON.stringify({version:2,items:[event.detail.item]}));const merged=mergeInbox(this.inbox.items,data.items);if(!this.persist({...this.inbox,items:merged.items}))return;event.detail.ok=true;const saved=merged.items.find(x=>x.taskKey===data.items[0].taskKey)||data.items[0];this.view=['done','dismissed'].includes(saved.status)?saved.status:bucket(saved);this.expanded=true;this.renderItems();this.say(merged.added?`Saved “${saved.title}”. Confirmed dates appear in Calendar.`:`This email already exists. Your saved edits and progress were kept.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});}catch(error){event.detail.error=error.message;}});this.append(this.emailCapture);
    this.inputDetails=element('details',undefined,{class:'import-input'});this.inputDetails.append(element('summary','Import an AI task file or an Evernote export'));
    this.inputDetails.append(element('p','For priorities, dates and follow-ups, upload your Evernote HTML to our chat first and ask for a Launchpad AI task file. Import the returned JSON here. Raw HTML still creates basic review items.'));
    const instructions=element('a','Download the AI processing instructions',{href:'./launchpad-ai-prompt.md',download:'launchpad-ai-prompt.md'});this.inputDetails.append(instructions);
    const label=element('label','Summary or task data',{for:'summary-paste'});this.paste=element('textarea','',{id:'summary-paste',rows:'5',maxlength:String(LIMIT),placeholder:'Choose the AI task file below, or paste a summary with exact note titles.'});
    const actions=element('div',undefined,{class:'import-actions'});
    this.importButton=button('Review actions',()=>{if(this.paste.value.trim())this.importText(this.paste.value);else if(this.file.files[0])this.importFile(this.file.files[0]);else this.say('Choose a file or paste a summary first.',true);},'import-primary');
    this.file=element('input',undefined,{id:'summary-file',type:'file',accept:'.json,.txt,.md,.html,.htm,application/json,text/plain,text/html'});
    this.file.addEventListener('change',()=>{if(this.file.files[0])this.importFile(this.file.files[0]);});
    actions.append(this.importButton,element('label','Or choose a file',{for:'summary-file'}),this.file);
    this.fileMessage=element('p','',{role:'status','aria-live':'polite',class:'import-message import-file-message',tabindex:'-1'});
    this.inputDetails.append(label,this.paste,actions,this.fileMessage);this.append(this.inputDetails);
    this.brief=element('details',undefined,{class:'import-other'});this.brief.append(element('summary','Read the processed briefing'));
    this.briefDate=element('p','',{class:'import-help'});this.briefText=element('pre','',{class:'import-briefing'});
    this.brief.append(this.briefDate,button('Download briefing',()=>download(this.inbox.briefing||'','launchpad-briefing.md','text/markdown')),this.briefText);this.append(this.brief);
    this.nav=element('nav',undefined,{'aria-label':'Task views',class:'import-tabs'});this.tabs={};
    for(const [key,label]of [['ready','Today'],['upcoming','Coming up'],['waiting','Waiting'],['later','Later'],['notes','My notes'],['done','Done'],['dismissed','Put aside']]){const b=button(label,()=>{this.view=key;this.expanded=false;this.renderItems();});this.tabs[key]={button:b,label};this.nav.append(b);}this.append(this.nav);
    this.viewHelp=element('p','',{class:'import-help'});this.list=element('div',undefined,{class:'import-list'});this.append(this.viewHelp,this.list);
    this.earlier=element('details',undefined,{class:'import-other'});this.earlierHeading=element('summary');this.earlierList=element('div',undefined,{class:'import-list'});this.earlier.append(this.earlierHeading,element('p','The AI task file replaces these basic entries. Their text and edits are kept here; restore one only if it contains additional work.',{class:'import-help'}),this.earlierList);this.append(this.earlier);
    const footer=element('div',undefined,{class:'import-footer'});footer.append(element('p','Saved in this browser. Export your task backup to keep progress or move to another computer. Email and Evernote are not changed.',{class:'import-help'}),button('Export task backup',()=>{const raw=this.blocked?this.raw:JSON.stringify(this.inbox,null,2);if(raw===null){this.say('There is no saved task list to export.');return;}download(raw,'launchpad-task-backup.json');}));if(this.legacyRaw!==null)footer.append(button('Export older daily plans',()=>download(this.legacyRaw,'launchpad-older-daily-plans.json')));this.append(footer);
    this.taskArea=element('div',undefined,{class:'task-area'});for(const child of [...this.children])if(child!==heading&&child!==this.message)this.taskArea.append(child);this.append(this.taskArea);
    this.calendar=element('launchpad-calendar');this.calendar.hidden=true;
    this.calendar.addEventListener('calendar:open-task',event=>this.openCalendarTask(event.detail.id));
    this.calendar.addEventListener('calendar:change-task-date',event=>{const d=event.detail;if(['dueDate','eventDate','followUpDate'].includes(d.key)&&this.inbox.items.some(x=>x.id===d.id))d.ok=this.updateItem(d.id,{[d.key]:d.date},true);});this.append(this.calendar);this.buildChatGPTChooser();

  }
  buildChatGPTChooser(){
    this.chatGPTChooser=element('dialog',undefined,{'aria-labelledby':'chatgpt-choice-title',class:'chatgpt-chooser'});
    this.chatGPTChooser.append(element('h2','Open ChatGPT',{id:'chatgpt-choice-title'}),element('p','Copy the help request, choose where to open ChatGPT, then paste it into the chat with Ctrl + V.'));
    const choices=element('div',undefined,{class:'chatgpt-choice-links'});
    const desktop=element('a','Desktop app',{href:'chatgpt://'});
    const web=element('a','Web app',{href:'https://chatgpt.com/',target:'_blank',rel:'noopener noreferrer'});
    web.addEventListener('click',()=>this.chatGPTChooser.close());
    choices.append(desktop,web);this.chatGPTChooser.append(choices,element('p','If the desktop app does not open, choose Web app or open ChatGPT from your Start menu.',{class:'import-help'}),button('Cancel',()=>this.chatGPTChooser.close()));this.append(this.chatGPTChooser);
  }
  showCalendar(open){this.taskArea.hidden=open;this.calendar.hidden=!open;this.calendarToggle.textContent=open?'Back to tasks':'Calendar';this.calendarToggle.setAttribute('aria-pressed',String(open));if(open)this.calendar.setTasks(this.inbox.items);}
  openCalendarTask(id){const item=this.inbox.items.find(x=>x.id===id);if(!item)return;this.showCalendar(false);this.view=item.status==='done'?'done':item.personal&&!item.action?'notes':isPinned(item)?'ready':bucket(item);this.expanded=true;this.renderItems();const card=[...this.list.querySelectorAll('article')].find(x=>x.dataset.taskKey===(item.taskKey||item.id));card?.scrollIntoView({behavior:'smooth',block:'center'});}
  buildNoteEditor(){
    this.noteEditor=element('details',undefined,{class:'import-input'});this.noteEditor.append(element('summary','Write your own note'));
    this.noteForm=element('form');this.noteInputs={};
    for(const[key,label,type,max]of [['title','Note title','text',300],['source','My note','textarea',20000],['action','Next action (optional)','textarea',800],['dueDate','Due date (optional)','date',10]]){
      const wrapper=element('label',label);const input=element(type==='textarea'?'textarea':'input',undefined,{'aria-label':label,maxlength:String(max),...(type==='textarea'?{rows:key==='source'?'5':'2'}:{type})});
      if(key==='title')input.required=true;this.noteInputs[key]=input;wrapper.append(input);this.noteForm.append(wrapper);
    }
    this.noteForm.append(element('p','Leave the action blank to keep a reference note. Add an action to include it in your task views. Your notes are included in Export task backup.',{class:'import-help'}));
    const save=element('button','Save note',{type:'submit',class:'import-primary'});this.noteForm.append(save,button('Cancel',()=>{this.noteEditor.open=false;this.editingNote=null;this.noteForm.reset();}));
    this.noteForm.addEventListener('submit',event=>{event.preventDefault();this.savePersonal();});this.noteEditor.append(this.noteForm);this.append(this.noteEditor);
  }
  editPersonal(item){
    this.showCalendar(false);
    this.editingNote=item?.id||null;for(const[key,input]of Object.entries(this.noteInputs))input.value=item?.[key]||'';
    this.noteEditor.open=true;this.noteInputs.title.focus();this.noteEditor.scrollIntoView({behavior:'smooth',block:'center'});
  }
  savePersonal(){
    const values=Object.fromEntries(Object.entries(this.noteInputs).map(([key,input])=>[key,input.value.trim()]));
    if(!values.title){this.noteInputs.title.focus();return;}
    const old=this.inbox.items.find(x=>x.id===this.editingNote);const id=old?.id||crypto.randomUUID();
    const item=enrich({...old,...values,createdOn:old?old.createdOn:todaySydney(),lastActionOn:old?recordNoteAction(old,{...values,dueDate:values.dueDate||null}).lastActionOn:null,id,personal:true,taskKey:old?.taskKey||`personal:${id}`,dueDate:values.dueDate||null,status:values.action?'review':'note',reason:'Your own note',dirty:[...new Set([...(old?.dirty||[]),'title','source','action','dueDate'])]});
    const items=old?this.inbox.items.map(x=>x.id===id?item:x):[...this.inbox.items,item];
    if(!this.persist({...this.inbox,items}))return;
    this.view='notes';this.noteEditor.open=false;this.editingNote=null;this.noteForm.reset();this.renderItems();this.say(`Saved “${item.title}” in My notes.${item.action?' Its action is also in your task views.':''}`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});
  }
  importText(text){try{if(text.trim().startsWith('{'))this.importData(validateInbox(text));else this.importData({items:parseSummary(text)});}catch(error){this.say(error.message,true);}}
  async importFile(file){
    if(this.reading)return;this.reading=true;this.updateCount();this.say(`Reading ${file.name}…`);let timeout;
    try {
      if(file.size>20*LIMIT)throw new Error('This file is over 20 MB. Export fewer notes or use an AI task file.');
      const text=await Promise.race([file.text(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('The browser could not finish reading this file.')),15000);})]);
      if(/\.json$/i.test(file.name))this.importData(validateInbox(text));else this.importData({items:parseSummary(/\.html?$/i.test(file.name)?textFromHtml(text):text)});
    }catch(error){this.say(`Could not import ${file.name}. ${error.message}`,true);}finally{clearTimeout(timeout);this.reading=false;this.updateCount();}
  }
  importData(data){
    data={...data,items:data.items.map(x=>x.status==='added'?{...x,status:'review',pinnedDate:x.pinnedDate||todaySydney()}:x)};
    const merged=mergeInbox(this.inbox.items,data.items);
    const next={...this.inbox,version:2,items:merged.items,importedAt:new Date().toISOString()};
    for(const key of ['briefing','reviewDate','generatedAt'])if(data[key]!==undefined)next[key]=data[key];
    if(!this.persist(next))return;
    this.paste.value='';this.inputDetails.open=false;this.syncPlans();this.renderItems();
    this.say(`${merged.added} tasks added; ${merged.updated} matched tasks refreshed. Your edits and progress are preserved.${merged.archived?` ${merged.archived} basic entries retained under Earlier imports.`:''}`);
    this.nav.scrollIntoView({behavior:'smooth',block:'start'});
  }
  updateItem(id,changes,rerender=false){
    const next={...this.inbox,items:this.inbox.items.map(x=>x.id===id?{...recordNoteAction(x,changes),dirty:[...new Set([...x.dirty,...Object.keys(changes).filter(k=>EDITABLE.includes(k))])]}:x)};
    if(this.persist(next)){if(rerender)this.renderItems();else this.refreshActionDates();this.updateCount();return true;}return false;
  }
  actionDateLabel(item){const date=item.lastActionOn||item.createdOn;return date?`Last action: ${dateLabel(date)}${item.lastActionOn?'':' · Created'}`:'Last action: Date not recorded';}
  refreshActionDates(){for(const card of this.list.querySelectorAll('article')){const item=this.inbox.items.find(x=>(x.taskKey||x.id)===card.dataset.taskKey);const stamp=card.querySelector('.import-last-action');if(item&&stamp)stamp.textContent=this.actionDateLabel(item);}}
  field(item,key,label,type='text',options){
    const wrapper=element('label',label);let input;
    if(options){input=element('select',undefined,{'aria-label':`${label} for ${item.title}`});for(const[value,text]of Object.entries(options))input.append(element('option',text,{value}));}
    else input=element('input',undefined,{type,'aria-label':`${label} for ${item.title}`,maxlength:'2000'});
    input.value=item[key]||'';input.disabled=this.blocked;
    input.addEventListener('change',()=>{const value=type==='date'?(input.value||null):input.value.trim();this.updateItem(item.id,{[key]:value},true);});wrapper.append(input);return wrapper;
  }
  setProgress(item,status){
    if(this.updateItem(item.id,{status,pinnedDate:null,preserveDoneOnce:false},true)){this.view=status==='done'?'done':item.personal?'notes':'ready';this.renderItems();this.say(status==='done'?`Marked done: ${item.title}. Saved in the Done view.`:`Restored: ${item.title}.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  togglePin(item){
    const pinned=isPinned(item);
    if(!pinned&&item.dependsOn.some(key=>!this.inbox.items.some(x=>x.taskKey===key&&x.status==='done'))){this.say('Complete the prerequisite before pinning this task.');return;}
    if(this.updateItem(item.id,{pinnedDate:pinned?null:todaySydney(),status:'review'},true)){
      if(!pinned)this.view='ready';this.renderItems();this.say(pinned?`Unpinned: ${item.title}. The task is still in your list.`:`Pinned for today: ${item.title}. Saved at the top of Today.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});
      const card=[...this.list.querySelectorAll('article')].find(x=>x.dataset.taskKey===(item.taskKey||item.id));card?.querySelector('.import-pin')?.focus({preventScroll:true});
    }
  }
  card(item){
    const article=element('article',undefined,{class:`import-card${isPinned(item)?' is-pinned':''}`,'data-task-key':item.taskKey||item.id});
    const active=['review','added'].includes(item.status);const dependencies=item.dependsOn.map(key=>this.inbox.items.find(x=>x.taskKey===key));
    const blockedBy=dependencies.some(x=>!x||x.status!=='done');
    const head=element('div',undefined,{class:'import-card-top'});head.append(element('strong',item.title));
    if(active){const pin=button(isPinned(item)?'Unpin':'Pin for today',()=>this.togglePin(this.inbox.items.find(x=>x.id===item.id)||item),'import-pin');pin.setAttribute('aria-label',`${isPinned(item)?'Unpin':'Pin for today'}: ${item.title}`);pin.setAttribute('aria-pressed',String(isPinned(item)));pin.disabled=this.blocked||(!isPinned(item)&&blockedBy);head.append(pin);}article.append(head);article.append(element('p',this.actionDateLabel(item),{class:'import-last-action',title:'Latest saved edit or status change; otherwise the date added to Launchpad. Older notes may not have a recorded date.'}));
    const chips=element('div',undefined,{class:'import-chips'});
    if(item.personal)chips.append(element('span','My note',{class:'import-chip'}));if(item.status==='superseded')chips.append(element('span','Earlier import — inactive',{class:'import-chip'}));if(item.status==='dismissed')chips.append(element('span','Put aside',{class:'import-chip'}));
    chips.append(element('span',PRIORITIES[item.priority],{class:`import-chip priority-${item.priority||'unknown'}`}));if(item.nextAction)chips.append(element('span',NEXT_ACTIONS[item.nextAction],{class:'import-chip'}));
    for(const[key,label]of [['dueDate','Due'],['eventDate','Event'],['followUpDate','Follow up']])if(item[key])chips.append(element('span',`${label}: ${dateLabel(item[key])}`,{class:'import-chip'}));
    if(isPinned(item))chips.append(element('span','📌 Pinned for today',{class:'import-chip'}));if(item.duplicateOf)chips.append(element('span','Duplicate retained for reference',{class:'import-chip'}));if(item.status==='done')chips.append(element('span','✓ Done',{class:'import-chip'}));article.append(chips);
    article.append(element('p',item.reason,{class:'import-reason'}));
    if(item.dateNote)article.append(element('p',item.dateNote,{class:'import-uncertain'}));
    if(item.waitingOn)article.append(element('p',`Waiting on: ${item.waitingOn}`,{class:'import-help'}));
    if(item.instruction){const tasks=element('section',undefined,{class:'import-instruction','aria-label':'Tasks'});tasks.append(element('h3','Tasks'),element('p',item.instruction));article.append(tasks);}
    const action=element('textarea',item.action,{class:'import-action',rows:'3',maxlength:'800','aria-label':`Action for ${item.title}`});action.disabled=this.blocked||!active;
    action.addEventListener('change',()=>{if(!action.value.trim()){action.value=item.action;this.say('Keep a short action, or put the task aside.',true);return;}this.updateItem(item.id,{action:action.value.trim()});});if(item.action)article.append(action);if(item.personal&&item.source)article.append(element('pre',item.source,{class:'import-source'}));
    if(!item.personal){
      const search=element('details',undefined,{class:'import-email-search'});
      search.append(element('summary','Email search text'));
      const query=element('input',undefined,{type:'text',value:emailSearchText(item),'aria-label':`Email search text for ${item.title}`,maxlength:'300'});
      search.append(query,element('p','Uses the email subject when available, otherwise the note title. Adjust it if needed, then paste into Outlook Search.',{class:'import-help'}));
      const actions=element('div',undefined,{class:'help-request-actions'});
      const copy=button('Copy email search',async()=>{const text=query.value.trim();if(!text){search.open=true;query.focus();return;}try{await navigator.clipboard.writeText(text);this.say('Email search copied. Open Outlook, paste into Search and press Enter.');}catch{search.open=true;query.focus();query.select();this.say('Automatic copy was blocked. The search text is selected—press Ctrl + C, then paste into Outlook Search.');}});
      actions.append(copy,element('a','Open Outlook ↗',{href:'https://outlook.cloud.microsoft/mail/',target:'_blank',rel:'noopener noreferrer',class:'import-email-link'}));
      article.append(actions,search);
    }
    if(item.originalEmailUrl)article.append(element('a','Open original email ↗',{href:item.originalEmailUrl,target:'_blank',rel:'noopener noreferrer',class:'import-email-link',title:'Open the original email and its attachments in Outlook'}));
    if(item.url)article.append(element('a','Open linked work ↗',{href:item.url,target:'_blank',rel:'noopener noreferrer',class:'import-work-link'}));
    if(item.dependsOn.length)article.append(element('p',`Depends on: ${dependencies.map((x,i)=>x?`${x.action}${x.status==='done'?' ✓':''}`:`Missing task ${item.dependsOn[i]}`).join('; ')}${blockedBy?' — complete the prerequisite first.':''}`,{class:'import-help'}));
    if(active){
      const edit=element('details');edit.append(element('summary','Edit priority, dates and tasks'));const grid=element('div',undefined,{class:'import-fields'});
      grid.append(this.field(item,'priority','Priority','text',PRIORITIES),this.field(item,'nextAction','Next step','text',NEXT_ACTIONS),this.field(item,'dueDate','Deadline','date'),this.field(item,'eventDate','Event date','date'),this.field(item,'followUpDate','Follow-up date','date'),this.field(item,'owner','Responsible person'),this.field(item,'waitingOn','Waiting on'),this.field(item,'instruction','Tasks'),this.field(item,'dateNote','Date or status uncertainty'));
      edit.append(grid);article.append(edit);
    }
    const source=element('details');source.append(element('summary','Source and links'),element('p',item.personal?'Your note title:':'Exact note title for Evernote search:'),element('p',item.title,{class:'import-source-title'}));
    for(const title of item.relatedTitles)source.append(element('p',`Also: ${title}`,{class:'import-source-title'}));
    if(item.source)source.append(element('pre',item.source,{class:'import-source'}));for(const url of item.links)source.append(element('a',url,{href:url,target:'_blank',rel:'noopener noreferrer',class:'import-source-link'}));
    if(active){const linkLabel=element('label','Work link');const url=element('input',undefined,{type:'url',value:item.url,placeholder:'https://… (optional)','aria-label':`Work link for ${item.title}`,maxlength:'2048'});url.disabled=this.blocked;url.addEventListener('change',()=>{if(url.value&&!safeUrl(url.value)){url.value=item.url;this.say('Use a full https:// link.',true);return;}this.updateItem(item.id,{url:url.value.trim()});});linkLabel.append(url);source.append(linkLabel);}const emailLabel=element('label','Original email link (optional)');const emailUrl=element('input',undefined,{type:'url',value:item.originalEmailUrl,placeholder:'https://…','aria-label':`Original email link for ${item.title}`,maxlength:'2048'});emailUrl.disabled=this.blocked;emailUrl.addEventListener('change',()=>{const value=emailUrl.value.trim();if(value&&!safeUrl(value)){emailUrl.value=item.originalEmailUrl;this.say('Use a full https:// link for the original email.',true);return;}this.updateItem(item.id,{originalEmailUrl:value},true);});emailLabel.append(emailUrl);source.append(emailLabel);article.append(source);
    if(item.help){const help=element('details');help.append(element('summary','ChatGPT can help with this'));const prompt=`${item.help}\n\nTask: [${item.title}] — ${item.action}\nTasks: ${item.instruction||'None added'}\n\nSource:\n${item.source}\n\nLinks:\n${item.links.join('\n')}\n\nPrepare the work here. Do not send messages or make external changes.`;const actions=element('div',undefined,{class:'help-request-actions'});actions.append(button('Copy help request',async()=>{try{await navigator.clipboard.writeText(prompt);this.say('Help request copied. Open ChatGPT and paste it into the chat.');}catch{this.say('Copy the request from the text box in this task.');}}),button('Open ChatGPT',()=>this.chatGPTChooser.showModal()));help.append(element('p',item.help),actions,element('textarea',prompt,{rows:'3',readonly:'','aria-label':`Help request for ${item.title}`}));article.append(help);}
    const controls=element('div',undefined,{class:'import-card-controls'});
    if(item.personal&&['note','review'].includes(item.status))controls.append(button('Edit my note',()=>this.editPersonal(item)));
    if(active){
      if(item.status==='review'){const group=element('select',undefined,{'aria-label':`Review group for ${item.title}`});for(const[value,label]of [['ready','Consider for today'],['later','Later'],['waiting','Waiting on someone']])group.append(element('option',label,{value}));group.value=item.group;group.disabled=this.blocked;group.addEventListener('change',()=>{this.updateItem(item.id,{group:group.value},true);});controls.append(group);}
      const done=button('Mark done',()=>this.setProgress(item,'done'));done.disabled=this.blocked;controls.append(done);
      if(item.status==='review'){const dismiss=button('Put aside',()=>{this.updateItem(item.id,{status:'dismissed',pinnedDate:null},true);});dismiss.disabled=this.blocked;controls.append(dismiss);}
    }else if(!item.duplicateOf&&item.status!=='note'){const restore=button('Review again',()=>this.setProgress(item,'review'));restore.disabled=this.blocked;controls.append(restore);}
    article.append(controls);return article;
  }
  renderItems(){
    const today=todaySydney();const active=this.inbox.items.filter(x=>['review','added'].includes(x.status));
    const inView=(x,key)=>key==='notes'?x.personal&&['note','review','added'].includes(x.status):['done','dismissed'].includes(key)?x.status===key:!['review','added'].includes(x.status)?false:key==='upcoming'?Boolean(nextDate(x)):key==='waiting'?x.group==='waiting':(isPinned(x,today)?'ready':bucket(x,today))===key;
    for(const[key,{button:b,label}]of Object.entries(this.tabs)){b.textContent=`${label} (${this.inbox.items.filter(x=>inView(x,key)).length})`;b.setAttribute('aria-pressed',String(this.view===key));}
    const sorted=this.inbox.items.filter(x=>inView(x,this.view)).sort((a,b)=>Number(isPinned(b,today))-Number(isPinned(a,today))||(this.view==='upcoming'?nextDate(a).localeCompare(nextDate(b))||rank(b,today)-rank(a,today):rank(b,today)-rank(a,today)));
    this.list.replaceChildren();this.nav.hidden=!this.inbox.items.length;
    this.viewHelp.textContent={ready:'Pin for today saves a task at the top immediately. Pins reset each day; the tasks stay in your list.',upcoming:'Deadlines, event dates and scheduled follow-ups. Dates come from the source or your edits.',waiting:'Replies and prerequisites. Add a follow-up date when you want an item to return to Today.',later:'Useful work you have chosen to leave for later.',notes:'Your own notes. Use Edit my note to add details or turn a reference note into an action.',done:'Completed tasks are saved here. Review again returns a task to your active work.',dismissed:'Tasks you put aside are saved here. Review again restores them.'}[this.view];
    if(!sorted.length)this.list.append(element('p',this.inbox.items.length?'Nothing in this view.':'Import your processed task file to begin.',{class:'import-empty'}));
    const shown=this.view==='ready'&&!this.expanded?sorted.slice(0,Math.max(5,sorted.filter(x=>isPinned(x,today)).length)):sorted;shown.forEach(x=>this.list.append(this.card(x)));
    if(shown.length<sorted.length)this.list.append(button(`Show ${sorted.length-shown.length} more actions`,()=>{this.expanded=true;this.renderItems();}));
    const earlier=this.inbox.items.filter(x=>x.status==='superseded');
    this.earlierList.replaceChildren(...earlier.map(x=>this.card(x)));this.earlierHeading.textContent=`Earlier imports (${earlier.length})`;this.earlier.hidden=!earlier.length;
    this.brief.hidden=!this.inbox.briefing;this.briefText.textContent=this.inbox.briefing||'';this.briefDate.textContent=this.inbox.reviewDate?`Prepared ${dateLabel(this.inbox.reviewDate)}. The briefing is a snapshot; task cards retain your later edits.`:'';
    this.calendar?.setTasks(this.inbox.items);this.updateCount();
  }
  updateCount(){
    this.importButton.disabled=this.blocked||this.reading;this.file.disabled=this.blocked||this.reading;
  }
}
customElements.define('summary-import',SummaryImport);
