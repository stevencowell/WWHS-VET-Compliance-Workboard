import {INBOX_KEY, LIMIT, parseSummary, validateInbox, mergeInbox, safeUrl, PRIORITIES, NEXT_ACTIONS, EDITABLE, enrich, todaySydney, bucket, rank, nextDate, reconcilePlans, consolidateDuplicates} from './summary-core.mjs?v=7';

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
    this.selected=new Set();this.view='ready';this.expanded=false;this.planState={ready:false,count:0,capacity:'normal',closed:false};this.blocked=false;this.raw=null;
    try {this.raw=localStorage.getItem(INBOX_KEY);this.inbox=validateInbox(this.raw);} catch {this.blocked=true;this.inbox=validateInbox(null);}
    this.build();
    this.onPlan=event=>{this.planState=event.detail;this.syncPlans();this.updateCount();};
    this.onStorage=event=>{if(event.key===INBOX_KEY||event.key===null){this.blocked=true;this.renderItems();this.say('This review list changed in another tab. Reload before making changes.',true);}};
    window.addEventListener('launchpad:plan-updated',this.onPlan);window.addEventListener('storage',this.onStorage);
    const request={};window.dispatchEvent(new CustomEvent('launchpad:plan-state',{detail:request}));if(request.state)this.planState=request.state;
    this.syncPlans();this.renderItems();
    if(this.blocked)this.say('Your saved review list could not be read. It is untouched. Export a copy before recovering it.',true);
  }
  disconnectedCallback(){window.removeEventListener('launchpad:plan-updated',this.onPlan);window.removeEventListener('storage',this.onStorage);this.started=false;}
  persist(next) {
    try {
      if(this.blocked||localStorage.getItem(INBOX_KEY)!==this.raw)throw new Error('The review list changed in another tab. Reload before saving.');
      const checked=validateInbox(JSON.stringify(next));const raw=JSON.stringify(checked);localStorage.setItem(INBOX_KEY,raw);this.raw=raw;this.inbox=checked;return true;
    } catch(error){this.say(`Could not save: ${error.message} Your previous saved list is unchanged.`,true);return false;}
  }
  say(message,error=false){this.message.textContent=message;this.message.classList.toggle('import-error',error);this.fileMessage.textContent=message;this.fileMessage.classList.toggle('import-error',error);if(error){this.inputDetails.open=true;this.fileMessage.scrollIntoView({block:'center'});}}
  syncPlans(){
    if(this.blocked||!this.planState.ready||!this.planState.days)return;
    const progress=reconcilePlans(this.inbox.items,this.planState.days,this.planState.date);
    const result=consolidateDuplicates(progress.items);
    if((progress.changed||result.changed)&&this.persist({...this.inbox,items:result.items})){this.renderItems();if(result.archived)this.say(`${result.archived} duplicate entries moved to Earlier imports. Edits and completion status are preserved.`);}
  }
  build() {
    this.replaceChildren();this.setAttribute('aria-label','Import and review your email summary');
    const heading=element('div',undefined,{class:'import-heading'});const copy=element('div');
    copy.append(element('p','FROM YOUR NOTES TO TODAY',{class:'eyebrow'}),element('h2','Bring your work into focus.'),element('p','Bring in your AI-processed summary. Keep the details here and choose up to three priorities for today.',{class:'import-intro'}));
    heading.append(copy,button('Add my note',()=>this.editPersonal()),button('Import email summary',()=>{this.inputDetails.open=true;this.file.focus();},'import-primary'));this.append(heading);
    this.message=element('p','',{role:'status','aria-live':'polite',class:'import-message'});this.append(this.message);this.buildNoteEditor();
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
    this.toolbar=element('div',undefined,{class:'import-toolbar'});this.counter=element('p');this.addButton=button('Add selected to today',()=>this.addToPlan(),'import-primary');this.toolbar.append(this.counter,this.addButton);this.append(this.toolbar);
    this.nav=element('nav',undefined,{'aria-label':'Task views',class:'import-tabs'});this.tabs={};
    for(const [key,label]of [['ready','Today'],['upcoming','Coming up'],['waiting','Waiting'],['later','Later'],['notes','My notes'],['done','Done'],['dismissed','Put aside']]){const b=button(label,()=>{this.view=key;this.expanded=false;this.renderItems();});this.tabs[key]={button:b,label};this.nav.append(b);}this.append(this.nav);
    this.viewHelp=element('p','',{class:'import-help'});this.list=element('div',undefined,{class:'import-list'});this.append(this.viewHelp,this.list);
    this.earlier=element('details',undefined,{class:'import-other'});this.earlierHeading=element('summary');this.earlierList=element('div',undefined,{class:'import-list'});this.earlier.append(this.earlierHeading,element('p','The AI task file replaces these basic entries. Their text and edits are kept here; restore one only if it contains additional work.',{class:'import-help'}),this.earlierList);this.append(this.earlier);
    const footer=element('div',undefined,{class:'import-footer'});footer.append(element('p','Saved in this browser. Export your task backup to keep progress or move to another computer. Email and Evernote are not changed.',{class:'import-help'}),button('Export task backup',()=>{const raw=this.blocked?this.raw:JSON.stringify(this.inbox,null,2);if(raw===null){this.say('There is no saved task list to export.');return;}download(raw,'launchpad-task-backup.json');}));this.append(footer);
  }
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
    this.editingNote=item?.id||null;for(const[key,input]of Object.entries(this.noteInputs))input.value=item?.[key]||'';
    this.noteEditor.open=true;this.noteInputs.title.focus();this.noteEditor.scrollIntoView({behavior:'smooth',block:'center'});
  }
  savePersonal(){
    const values=Object.fromEntries(Object.entries(this.noteInputs).map(([key,input])=>[key,input.value.trim()]));
    if(!values.title){this.noteInputs.title.focus();return;}
    const old=this.inbox.items.find(x=>x.id===this.editingNote);const id=old?.id||crypto.randomUUID();
    const item=enrich({...old,...values,id,personal:true,taskKey:old?.taskKey||`personal:${id}`,dueDate:values.dueDate||null,status:values.action?'review':'note',reason:'Your own note',dirty:[...new Set([...(old?.dirty||[]),'title','source','action','dueDate'])]});
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
    const merged=mergeInbox(this.inbox.items,data.items);
    const next={...this.inbox,version:2,items:merged.items,importedAt:new Date().toISOString()};
    for(const key of ['briefing','reviewDate','generatedAt'])if(data[key]!==undefined)next[key]=data[key];
    if(!this.persist(next))return;
    this.selected.clear();this.paste.value='';this.inputDetails.open=false;this.syncPlans();this.renderItems();
    this.say(`${merged.added} tasks added; ${merged.updated} matched tasks refreshed. Your edits and progress are preserved.${merged.archived?` ${merged.archived} basic entries retained under Earlier imports.`:''}`);
    this.toolbar.scrollIntoView({behavior:'smooth',block:'start'});
  }
  updateItem(id,changes,rerender=false){
    const next={...this.inbox,items:this.inbox.items.map(x=>x.id===id?{...x,...changes,dirty:[...new Set([...x.dirty,...Object.keys(changes).filter(k=>EDITABLE.includes(k))])]}:x)};
    if(this.persist(next)){if(rerender)this.renderItems();this.updateCount();return true;}return false;
  }
  field(item,key,label,type='text',options){
    const wrapper=element('label',label);let input;
    if(options){input=element('select',undefined,{'aria-label':`${label} for ${item.title}`});for(const[value,text]of Object.entries(options))input.append(element('option',text,{value}));}
    else input=element('input',undefined,{type,'aria-label':`${label} for ${item.title}`,maxlength:'2000'});
    input.value=item[key]||'';input.disabled=this.blocked;
    input.addEventListener('change',()=>{const value=type==='date'?(input.value||null):input.value.trim();this.updateItem(item.id,{[key]:value},true);});wrapper.append(input);return wrapper;
  }
  setProgress(item,status){
    const request={id:item.id,title:`[${item.title}] — ${item.action}`,planAliases:item.planAliases,state:status==='done'?'done':'todo'};
    window.dispatchEvent(new CustomEvent('launchpad:set-reviewed-progress',{detail:request}));
    if(request.result&&!request.result.ok){this.say(request.result.message,true);return;}
    this.selected.delete(item.id);if(this.updateItem(item.id,{status,preserveDoneOnce:false},true)){this.view=status==='done'?'done':item.personal?'notes':'ready';this.renderItems();this.say(status==='done'?`Marked done: ${item.title}. Saved in the Done view.`:`Restored: ${item.title}.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  card(item){
    const article=element('article',undefined,{class:'import-card','data-task-key':item.taskKey||item.id});
    const active=['review','added'].includes(item.status);const dependencies=item.dependsOn.map(key=>this.inbox.items.find(x=>x.taskKey===key));
    const blockedBy=dependencies.some(x=>!x||x.status!=='done');
    const head=element('div',undefined,{class:'import-card-top'});const pick=element('input',undefined,{type:'checkbox','aria-label':`Choose ${item.title} for today`});
    pick.checked=this.selected.has(item.id);pick.disabled=this.blocked||item.status!=='review'||blockedBy;
    pick.addEventListener('change',()=>{if(pick.checked)this.selected.add(item.id);else this.selected.delete(item.id);this.updateCount();});if(active){const pickLabel=element('label','Choose for today');pickLabel.prepend(pick);head.append(pickLabel);}head.append(element('strong',item.title));article.append(head);
    const chips=element('div',undefined,{class:'import-chips'});
    if(item.personal)chips.append(element('span','My note',{class:'import-chip'}));if(item.status==='superseded')chips.append(element('span','Earlier import — inactive',{class:'import-chip'}));if(item.status==='dismissed')chips.append(element('span','Put aside',{class:'import-chip'}));
    chips.append(element('span',PRIORITIES[item.priority],{class:`import-chip priority-${item.priority||'unknown'}`}));if(item.nextAction)chips.append(element('span',NEXT_ACTIONS[item.nextAction],{class:'import-chip'}));
    for(const[key,label]of [['dueDate','Due'],['eventDate','Event'],['followUpDate','Follow up']])if(item[key])chips.append(element('span',`${label}: ${dateLabel(item[key])}`,{class:'import-chip'}));
    if(item.status==='added')chips.append(element('span','In today’s plan',{class:'import-chip'}));if(item.duplicateOf)chips.append(element('span','Duplicate retained for reference',{class:'import-chip'}));if(item.status==='done')chips.append(element('span','✓ Done',{class:'import-chip'}));article.append(chips);
    article.append(element('p',item.reason,{class:'import-reason'}));
    if(item.dateNote)article.append(element('p',item.dateNote,{class:'import-uncertain'}));
    if(item.waitingOn)article.append(element('p',`Waiting on: ${item.waitingOn}`,{class:'import-help'}));
    if(item.instruction)article.append(element('p',`Steve’s instruction: ${item.instruction}`,{class:'import-instruction'}));
    const action=element('textarea',item.action,{rows:'2',maxlength:'800','aria-label':`Action for ${item.title}`});action.disabled=this.blocked||!active||item.status==='added';
    action.addEventListener('change',()=>{if(!action.value.trim()){action.value=item.action;this.say('Keep a short action, or put the task aside.',true);return;}this.updateItem(item.id,{action:action.value.trim()});});if(item.action)article.append(action);if(item.personal&&item.source)article.append(element('pre',item.source,{class:'import-source'}));
    if(item.url)article.append(element('a','Open linked work ↗',{href:item.url,target:'_blank',rel:'noopener noreferrer',class:'import-work-link'}));
    if(item.dependsOn.length)article.append(element('p',`Depends on: ${dependencies.map((x,i)=>x?`${x.action}${x.status==='done'?' ✓':''}`:`Missing task ${item.dependsOn[i]}`).join('; ')}${blockedBy?' — complete the prerequisite first.':''}`,{class:'import-help'}));
    if(active){
      const edit=element('details');edit.append(element('summary','Edit priority, dates and instructions'));const grid=element('div',undefined,{class:'import-fields'});
      grid.append(this.field(item,'priority','Priority','text',PRIORITIES),this.field(item,'nextAction','Next step','text',NEXT_ACTIONS),this.field(item,'dueDate','Deadline','date'),this.field(item,'eventDate','Event date','date'),this.field(item,'followUpDate','Follow-up date','date'),this.field(item,'owner','Responsible person'),this.field(item,'waitingOn','Waiting on'),this.field(item,'instruction','Steve’s instruction'),this.field(item,'dateNote','Date or status uncertainty'));
      edit.append(grid);article.append(edit);
    }
    const source=element('details');source.append(element('summary','Source and links'),element('p',item.personal?'Your note title:':'Exact note title for Evernote search:'),element('p',item.title,{class:'import-source-title'}));
    for(const title of item.relatedTitles)source.append(element('p',`Also: ${title}`,{class:'import-source-title'}));
    if(item.source)source.append(element('pre',item.source,{class:'import-source'}));for(const url of item.links)source.append(element('a',url,{href:url,target:'_blank',rel:'noopener noreferrer',class:'import-source-link'}));
    if(active){const linkLabel=element('label','Link to use in today’s plan');const url=element('input',undefined,{type:'url',value:item.url,placeholder:'https://… (optional)','aria-label':`Work link for ${item.title}`,maxlength:'2048'});url.disabled=this.blocked||item.status==='added';url.addEventListener('change',()=>{if(url.value&&!safeUrl(url.value)){url.value=item.url;this.say('Use a full https:// link.',true);return;}this.updateItem(item.id,{url:url.value.trim()});});linkLabel.append(url);source.append(linkLabel);}article.append(source);
    if(item.help){const help=element('details');help.append(element('summary','ChatGPT can help with this'));const prompt=`${item.help}\n\nTask: [${item.title}] — ${item.action}\nSteve’s instruction: ${item.instruction||'None added'}\n\nSource:\n${item.source}\n\nLinks:\n${item.links.join('\n')}\n\nPrepare the work here. Do not send messages or make external changes.`;help.append(element('p',item.help),button('Copy help request',async()=>{try{await navigator.clipboard.writeText(prompt);this.say('Help request copied. Paste it into our chat.');}catch{this.say('Copy the request from the text box in this task.');}}),element('textarea',prompt,{rows:'3',readonly:'','aria-label':`Help request for ${item.title}`}));article.append(help);}
    const controls=element('div',undefined,{class:'import-card-controls'});
    if(item.personal&&['note','review'].includes(item.status))controls.append(button('Edit my note',()=>this.editPersonal(item)));
    if(active){
      if(item.status==='review'){const group=element('select',undefined,{'aria-label':`Review group for ${item.title}`});for(const[value,label]of [['ready','Consider for today'],['later','Later'],['waiting','Waiting on someone']])group.append(element('option',label,{value}));group.value=item.group;group.disabled=this.blocked;group.addEventListener('change',()=>{this.selected.delete(item.id);this.updateItem(item.id,{group:group.value},true);});controls.append(group);}
      else controls.append(button('Open today’s plan',()=>document.getElementById('daily-plan')?.scrollIntoView({behavior:'smooth'})));
      const done=button('Mark done',()=>this.setProgress(item,'done'));done.disabled=this.blocked;controls.append(done);
      if(item.status==='review'){const dismiss=button('Put aside',()=>{this.selected.delete(item.id);this.updateItem(item.id,{status:'dismissed'},true);});dismiss.disabled=this.blocked;controls.append(dismiss);}
    }else if(!item.duplicateOf&&item.status!=='note'){const restore=button('Review again',()=>this.setProgress(item,'review'));restore.disabled=this.blocked;controls.append(restore);}
    article.append(controls);return article;
  }
  renderItems(){
    const today=todaySydney();const active=this.inbox.items.filter(x=>['review','added'].includes(x.status));
    const inView=(x,key)=>key==='notes'?x.personal&&['note','review','added'].includes(x.status):['done','dismissed'].includes(key)?x.status===key:!['review','added'].includes(x.status)?false:key==='upcoming'?Boolean(nextDate(x)):key==='waiting'?x.group==='waiting':(x.status==='added'?'ready':bucket(x,today))===key;
    for(const[key,{button:b,label}]of Object.entries(this.tabs)){b.textContent=`${label} (${this.inbox.items.filter(x=>inView(x,key)).length})`;b.setAttribute('aria-pressed',String(this.view===key));}
    const sorted=this.inbox.items.filter(x=>inView(x,this.view)).sort((a,b)=>this.view==='upcoming'?nextDate(a).localeCompare(nextDate(b))||rank(b,today)-rank(a,today):rank(b,today)-rank(a,today));
    this.list.replaceChildren();this.nav.hidden=!this.inbox.items.length;
    this.viewHelp.textContent={ready:'Review the suggestions and choose what fits. An urgent label is a suggestion, not a confirmed deadline.',upcoming:'Deadlines, event dates and scheduled follow-ups. Dates come from the source or your edits.',waiting:'Replies and prerequisites. Add a follow-up date when you want an item to return to Today.',later:'Useful work you have chosen to leave for later.',notes:'Your own notes. Use Edit my note to add details or turn a reference note into an action.',done:'Completed tasks are saved here. Review again returns a task to your active work.',dismissed:'Tasks you put aside are saved here. Review again restores them.'}[this.view];
    if(!sorted.length)this.list.append(element('p',this.inbox.items.length?'Nothing in this view.':'Import your processed task file to begin.',{class:'import-empty'}));
    const shown=this.view==='ready'&&!this.expanded?sorted.slice(0,5):sorted;shown.forEach(x=>this.list.append(this.card(x)));
    if(shown.length<sorted.length)this.list.append(button(`Show ${sorted.length-shown.length} more actions`,()=>{this.expanded=true;this.renderItems();}));
    const earlier=this.inbox.items.filter(x=>x.status==='superseded');
    this.earlierList.replaceChildren(...earlier.map(x=>this.card(x)));this.earlierHeading.textContent=`Earlier imports (${earlier.length})`;this.earlier.hidden=!earlier.length;
    this.brief.hidden=!this.inbox.briefing;this.briefText.textContent=this.inbox.briefing||'';this.briefDate.textContent=this.inbox.reviewDate?`Prepared ${dateLabel(this.inbox.reviewDate)}. The briefing is a snapshot; task cards retain your later edits.`:'';
    this.updateCount();
  }
  updateCount(){
    const room=Math.max(0,(this.planState.capacity==='small'?1:3)-this.planState.count);
    this.counter.textContent=this.planState.closed?'Today’s plan is wrapped up. Reopen it below to add priorities.':`${this.selected.size} selected · Room for ${room} more today`;
    this.addButton.disabled=this.blocked||!this.planState.ready||this.planState.closed||!this.selected.size||this.selected.size>room;
    this.importButton.disabled=this.blocked||this.reading;this.file.disabled=this.blocked||this.reading;this.toolbar.hidden=!this.inbox.items.length;
  }
  addToPlan(){
    const items=this.inbox.items.filter(x=>this.selected.has(x.id));
    if(items.some(x=>x.dependsOn.some(key=>!this.inbox.items.some(t=>t.taskKey===key&&t.status==='done')))){this.say('Complete the prerequisite before adding this task.',true);return;}
    const request={items};window.dispatchEvent(new CustomEvent('launchpad:add-reviewed',{detail:request}));
    if(!request.result?.ok){this.say(request.result?.message||'Today’s plan is still loading. Try again in a moment.',true);return;}
    if(this.persist({...this.inbox,items:this.inbox.items.map(x=>this.selected.has(x.id)?{...x,status:'added'}:x)})){this.selected.clear();this.renderItems();this.say(`${request.result.count} priorities added to today’s plan. The remaining tasks stay here.`);}
    document.getElementById('daily-plan')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
customElements.define('summary-import',SummaryImport);
