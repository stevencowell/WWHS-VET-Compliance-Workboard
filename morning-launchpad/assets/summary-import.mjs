const workStorage=()=>globalThis.WWHS_STORAGE||globalThis.localStorage;
import {RESTORE_KEY,createLaunchpadBackup} from './launchpad-backup.mjs?v=plain-language-1';
import {recoverLaunchpadRestore,readLaunchpadRecovery} from './launchpad-backup-transaction.mjs?v=plain-language-1';
import {installLaunchpadBackupDialog} from './launchpad-backup-ui.mjs?v=plain-language-1';
import {storageSizes} from '../../assets/js/team-storage-report.mjs?v=area-backups-1';
import {createNoteEditor} from './note-editor.mjs?v=plain-language-1';
import {downloadDestination} from '../../assets/js/save-backup-file.mjs?v=backup-flow-2';
import {choosePrivateBackupDestination,getBackupFolder} from '../../assets/js/backup-folder.mjs?v=plain-language-1';
import {createTaskHelpDialog} from './task-help-dialog.mjs?v=instruction-lists-1';
import {emailSearchText} from './email-search.mjs?v=1';
import './email-capture.mjs?v=plain-language-1';
import './launchpad-calendar.mjs?v=plain-language-1';
import {INBOX_KEY, LIMIT, parseSummary, validateInbox, mergeInbox, safeUrl, workingNoteLinks, matchesNoteSearch, PRIORITIES, NEXT_ACTIONS, EDITABLE, enrich, todaySydney, taskSection, rank, nextDate, consolidateDuplicates, LEGACY_PLAN_KEY, isPinned, migrateToPins, recordNoteAction, WORKSTREAMS, createTrackedWork, mergeWorkboardImports, clearEmailImports, isUnfinishedEmailNote, reconcileForecast, sourceCompleted, normaliseForecastContext} from './summary-core.mjs?v=head-teacher-label-1';

const repositoryRoot=new URL('../../',import.meta.url);

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
function fitNoteText(node){if(!node.getClientRects().length)return;node.style.height='auto';node.style.height=`${node.scrollHeight+2}px`;}
function copyFeedback(node, success=true) {
  node.dataset.copyLabel ||= node.textContent;
  clearTimeout(node.copyFeedbackTimer);
  node.textContent=success?'✓ Copied':'Copy blocked — use Ctrl+C';
  node.classList.toggle('is-copied',success);
  node.setAttribute('aria-live','polite');
  node.copyFeedbackTimer=setTimeout(()=>{node.textContent=node.dataset.copyLabel;node.classList.remove('is-copied');},3000);
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
    if(this.started||this.starting)return;
    try{if(workStorage().getItem(RESTORE_KEY)!==null){void this.recoverBeforeOpening();return;}}catch(error){this.showRestoreRecovery(error);return;}
    this.startWorkspace();
  }
  async recoverBeforeOpening(){
    if(this.starting)return;this.starting=true;this.replaceChildren(element('p','Recovering your saved Launchpad…',{role:'status'}));
    try{await recoverLaunchpadRestore(workStorage());this.starting=false;this.startWorkspace();window.dispatchEvent(new Event('launchpad:backup-restored'));}
    catch(error){this.starting=false;this.showRestoreRecovery(error);}
  }
  showRestoreRecovery(error){
    this.replaceChildren(element('h2','Recover your saved work'),element('p',error.message,{role:'alert'}),element('p','Keep your original backup and do not clear this browser’s data. Save a recovery copy before trying again.'));
    this.append(button('Retry recovery',()=>void this.recoverBeforeOpening()),button('Save recovery copy…',async()=>{
      try{const destination=await choosePrivateBackupDestination({suggestedName:'launchpad-recovery.json',id:'launchpad-recovery'});if(!destination)return;const result=await destination.write(JSON.stringify(await readLaunchpadRecovery(workStorage()),null,2));this.append(element('p',result.saved?'Recovery copy saved.':'Recovery download requested. Check that the file saved.'));}
      catch(problem){this.append(element('p',problem.message,{role:'alert'}));}
    }));
  }
  startWorkspace() {
    if(this.started)return;this.started=true;
    getBackupFolder('launchpad'); // Load the preference before a backup button is clicked.
    this.openCards=new Set();this.view='ready';this.expanded=false;this.legacyRaw=null;this.blocked=false;this.raw=null;
    this.workstream=Object.hasOwn(WORKSTREAMS,this.dataset.workstream)?this.dataset.workstream:'all';
    this.draftInputs=new Map();this.captureDraft=event=>{const field=event.target;if(field.matches?.('textarea:not([readonly]),input:not([type="file"]):not([type="checkbox"]),[contenteditable="true"]')){this.draftInputs.delete(field);this.draftInputs.set(field,field.getAttribute('aria-label')||field.closest('label')?.childNodes[0]?.textContent||field.id||'Draft text');}};this.addEventListener('input',this.captureDraft);
    try {this.raw=workStorage().getItem(INBOX_KEY);this.inbox=validateInbox(this.raw);if(!this.scope)this.legacyRaw=workStorage().getItem(LEGACY_PLAN_KEY);} catch {this.blocked=true;this.inbox=validateInbox(null);}
    this.build();this.resizeNotes=()=>this.querySelectorAll('.import-working-note textarea').forEach(fitNoteText);window.addEventListener('resize',this.resizeNotes);
    this.onStorage=event=>{if(event.key===INBOX_KEY||event.key===null){this.blocked=true;this.updateCount();this.reloadButton.hidden=false;this.say('Your task list changed in another tab. Reload saved work before saving here. Your draft is still on this page.',true);}};
    window.addEventListener('storage',this.onStorage);
    this.openToday=()=>{this.showCalendar(true);this.calendar.openDate(todaySydney(),'day');this.calendar.scrollIntoView({behavior:'smooth',block:'start'});};window.addEventListener('launchpad:open-today',this.openToday);
    this.openCalendarChoice=()=>this.showCalendar(true);window.addEventListener('launchpad:open-calendar',this.openCalendarChoice);if(location.hash==='#calendar')this.showCalendar(true);
    this.syncPlans();this.renderItems();this.displayDate=todaySydney();this.dayTimer=setInterval(()=>{const date=todaySydney();if(date!==this.displayDate&&!this.blocked&&!this.contains(document.activeElement)){this.displayDate=date;this.renderItems();}},30000);
    if(this.blocked)this.say('Your saved task list could not be opened. It has not changed. Save a backup before trying to recover it.',true);
  }
  disconnectedCallback(){this.removeEventListener('input',this.captureDraft);window.removeEventListener('resize',this.resizeNotes);window.removeEventListener('launchpad:open-calendar',this.openCalendarChoice);window.removeEventListener('launchpad:open-today',this.openToday);clearInterval(this.dayTimer);window.removeEventListener('storage',this.onStorage);this.started=false;}
  persist(next) {
    try {
      if(window.WWHS_TEAM_SESSION&&!window.WWHS_TEAM_SESSION.allowWrite(INBOX_KEY,next))throw new Error(window.WWHS_TEAM_SESSION.reason());
      if(this.blocked||workStorage().getItem(INBOX_KEY)!==this.raw){this.blocked=true;this.reloadButton.hidden=false;throw new Error('Your task list changed in another tab. Reload saved work before saving.');}
      const checked=validateInbox(JSON.stringify(next));const raw=JSON.stringify(checked);workStorage().setItem(INBOX_KEY,raw);this.raw=raw;this.inbox=checked;this.calendar?.setTasks(checked.items);window.dispatchEvent(new CustomEvent('wwhs:work-saved',{detail:{key:INBOX_KEY}}));return true;
    } catch(error){this.say(`Could not save: ${error.message} Your saved list has not changed.`,true);return false;}
  }
  async exportTaskBackup({downloadOnly=false}={}){
    if(this.hasNoteDraft()||this.calendar?.hasDraft()){this.say('Save or cancel the open note or calendar event before saving a backup. Your draft is still here.',true);return;}
    try{
      const destination=downloadOnly?downloadDestination('launchpad-backup.json'):await choosePrivateBackupDestination({suggestedName:'launchpad-backup.json',id:'launchpad-private-backup'});
      if(!destination){this.say('Save cancelled. Your notes are unchanged.');return;}
      if(this.hasNoteDraft()||this.calendar?.hasDraft())throw new Error('A draft changed while Save was open. Save the note or event, then save a fresh backup.');
      if(workStorage().getItem(RESTORE_KEY)!==null)throw new Error('Finish Launchpad recovery before saving a regular backup.');
      const raw=JSON.stringify(createLaunchpadBackup(workStorage()));
      const result=await destination.write(raw);
      window.dispatchEvent(new CustomEvent('launchpad:task-backup-requested',{detail:{raw,...result}}));
      this.say(result.saved?'Launchpad backup saved: notes, completed tasks, calendar, older plans and saved links.':'Download requested. Check that the Launchpad backup saved on your device, then confirm below.');
    }catch(error){this.say(error.message,true);}
  }
  async trackWork(descriptor,{silent=false}={}) {
    const candidate=await createTrackedWork(descriptor);
    if(!this.started)throw new Error('Your task list is still opening.');
    if(this.blocked)throw new Error('Reload saved work before adding a workboard task.');
    let item=this.inbox.items.find(x=>x.taskKey===candidate.taskKey||(x.origin?.wing===candidate.origin.wing&&x.origin.recordKey===candidate.origin.recordKey));
    if(!item&&this.inbox.items.length>=300)throw new Error('Your list has 300 items. Save a backup, then remove tasks you no longer need before adding more. Your VET and TAS records stay unchanged.');
    const identity=`${candidate.origin.wing}:${candidate.origin.recordKey}`;
    const imports=this.inbox.workboardImports||[];
    const refreshHelp=item&&candidate.taskHelp&&JSON.stringify(item.taskHelp)!==JSON.stringify(candidate.taskHelp);
    if(!item||!imports.includes(identity)||refreshHelp){
      const items=item?this.inbox.items.map(existing=>refreshHelp&&existing.id===item.id?{...existing,taskHelp:candidate.taskHelp}:existing):[...this.inbox.items,candidate];
      const workboardImports=mergeWorkboardImports(imports,[identity]);
      if(!this.persist({...this.inbox,items,workboardImports}))throw new Error('Your task list could not be saved.');
      item=this.inbox.items.find(x=>x.id===(item?.id||candidate.id));
    }
    if(!silent){this.showCalendar(false);this.workstream=item.workstream;this.view=taskSection(item);this.expanded=true;this.openCards.add(item.id);this.searchInput.value='';this.renderItems();this.say(`“${item.title}” is in your task list. Your edits and progress stay with this card.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});}
    else if(!this.contains(document.activeElement))this.renderItems();
    return item;
  }
  async syncForecast(snapshot){
    if(!this.started)throw new Error('Your task list is still opening.');
    if(this.blocked)throw new Error('Reload saved work before refreshing the schedule.');
    const sourceChanged=()=>{
      const guard=snapshot.sourceGuard;if(!guard)return false;
      const expected={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2'}[snapshot.context?.wing];
      if(guard.key!==expected||(guard.raw!==null&&typeof guard.raw!=='string'))throw new Error('The task schedule could not be checked. Reload the page before trying again.');
      const checkReview=Object.hasOwn(guard,'reviewRaw');
      if(checkReview&&(snapshot.context?.wing!=='vet'||(guard.reviewRaw!==null&&typeof guard.reviewRaw!=='string')))throw new Error('The task review could not be checked. Reload the page before trying again.');
      try{return workStorage().getItem(guard.key)!==guard.raw||(checkReview&&workStorage().getItem('wwhs-task-register-review:v1')!==guard.reviewRaw);}catch{return true;}
    };
    if(sourceChanged())return {changed:false,deferred:true,sourceChanged:true,added:0,updated:0,retired:0,suppressed:0};
    if(this.contains(document.activeElement))return {changed:false,deferred:true,added:0,updated:0,retired:0,suppressed:0};
    const originalRaw=this.raw,availabilityRevision=this.forecastAvailabilityRevision||0;
    const result=await reconcileForecast(this.inbox,snapshot);
    if(sourceChanged())return {...result,inbox:this.inbox,changed:false,deferred:true,sourceChanged:true,added:0,updated:0,retired:0};
    if(this.raw!==originalRaw||this.contains(document.activeElement))return {...result,inbox:this.inbox,changed:false,deferred:true};
    if(result.changed&&!this.persist(result.inbox))throw new Error('The task schedule could not be saved. Your saved work has not changed.');
    if(result.skipped)this.setForecastAvailability(result.context);
    else if(availabilityRevision===(this.forecastAvailabilityRevision||0))this.forecastAvailability?.delete(result.context.wing);
    if(result.changed)this.renderItems();else this.refreshForecastNotices(result.context.wing);
    return result;
  }
  setForecastAvailability(input){
    const context=normaliseForecastContext(input);
    this.forecastAvailability??=new Map();this.forecastAvailabilityRevision=(this.forecastAvailabilityRevision||0)+1;
    if(context.mode!=='current')this.forecastAvailability.set(context.wing,context);
    // A current source proposal is not a completed refresh. syncForecast clears
    // the warning only after validating and safely saving that exact snapshot.
    this.refreshForecastNotices(context.wing);return context;
  }
  refreshForecastNotices(wing){
    for(const notice of this.querySelectorAll('.import-forecast[data-forecast-task]')){
      const item=this.inbox.items.find(entry=>entry.id===notice.dataset.forecastTask);
      if(item?.forecast&&item.origin?.wing===wing)notice.replaceWith(this.forecastNotice(item));
    }
  }
  setWorkstream(key){
    if(this.scope && key!==this.scope)return false;
    if(key!=='all'&&!Object.hasOwn(WORKSTREAMS,key))throw new Error('This work area could not be opened.');
    if(!this.started){this.dataset.workstream=key;return false;}
    if(this.blocked){this.say('Reload saved work before changing views. Your draft text is still here.',true);return false;}
    this.workstream=key;this.expanded=false;this.renderItems();return true;
  }
  reloadSavedWork(){
    const drafts=[...this.draftInputs].filter(([field])=>field.isConnected).map(([field,label])=>({label,text:field.isContentEditable?field.innerText:field.value,...(field.isContentEditable?{html:field.innerHTML}:{})})).filter(field=>field.text);
    if(drafts.length&&!window.confirm('Reload the saved list? Text you entered on this page will be kept below under “Text kept before reload”, so you can copy any unsaved changes back.'))return;
    let raw,inbox;try{raw=workStorage().getItem(INBOX_KEY);inbox=validateInbox(raw);}catch{this.say('Your saved task list could not be opened. Your draft is still on this page. Save a backup before trying to recover it.',true);return;}
    if(drafts.length){const saved=element('details',undefined,{class:'import-draft-recovery'});saved.append(element('summary','Text kept before reload'),element('p','Copy any unsaved changes back into the current cards. This copy stays on this page until you leave.',{class:'import-help'}),element('pre',drafts.map(field=>`${field.label}\n${field.text}`).join('\n\n'),{class:'import-source'}),button('Save this draft text',()=>download(JSON.stringify(drafts,null,2),'launchpad-draft-text.json')));this.message.after(saved);}
    this.raw=raw;this.inbox=inbox;this.blocked=false;this.draftInputs.clear();this.reloadButton.hidden=true;this.renderItems();this.say(drafts.length?'Saved work reloaded. Your kept draft text is above.':'Saved work reloaded.');window.dispatchEvent(new CustomEvent('wwhs:work-reloaded'));
  }
  say(message,error=false){this.message.textContent=message;this.message.classList.toggle('import-error',error);this.message.setAttribute('role',error?'alert':'status');this.fileMessage.textContent=message;this.fileMessage.classList.toggle('import-error',error);if(this.backupDialog?.open){this.backupMessage.textContent=message;this.backupMessage.setAttribute('role',error?'alert':'status');this.showBackupStorageDetails(error&&/storage.*full|quota/i.test(message));}else if(error)this.inputDetails.open=true;}
  syncPlans(){
    if(this.blocked||this.scope)return;
    const migration=migrateToPins(this.inbox,this.legacyRaw);
    const result=consolidateDuplicates(migration.inbox.items);
    if((migration.changed||result.changed)&&this.persist({...migration.inbox,items:result.items})){this.renderItems();if(migration.warning)this.say(migration.warning);}
  }
  build() {
    this.replaceChildren();this.setAttribute('aria-label','Your tasks and notes');
    const heading=element('div',undefined,{class:'import-heading'});const copy=element('div');
    const scheduledWing=['vet','tas'].includes(this.dataset.workstream);
    copy.append(element('p',scheduledWing?'YOUR SCHEDULED TASKS AND NOTES':'YOUR TASKS AND NOTES',{class:'eyebrow'}),element('h2','Your tasks and notes'),element('p',scheduledWing?'Scheduled duties appear automatically. Pin your priorities and keep notes with each task.':'Pin today’s priorities. Keep everything else here.',{class:'import-intro'}));
    this.calendarToggle=button('Calendar',()=>{if(!this.calendar.hidden)this.showCalendar(false);else window.dispatchEvent(new Event('launchpad:choose-calendar'));});
    const toolbar=element('div',undefined,{class:'import-heading-actions','aria-label':'Add and organise work'});toolbar.append(this.calendarToggle,button('Paste email',()=>{this.showCalendar(false);this.emailCapture.open();},'import-primary'),button('Add my note',()=>this.editPersonal()),button('Import email summary',()=>{this.showCalendar(false);this.inputDetails.open=true;this.file.focus();},'import-primary'));heading.append(copy,toolbar);this.append(heading);
    this.message=element('p','',{role:'status','aria-live':'polite',class:'import-message'});this.reloadButton=button('Reload saved work',()=>this.reloadSavedWork(),'import-reload');this.reloadButton.hidden=!this.blocked;this.append(this.message,this.reloadButton);this.buildNoteEditor();
    this.emailCapture=element('email-capture');this.emailCapture.addEventListener('email:save',event=>{try{const data=validateInbox(JSON.stringify({version:2,items:[event.detail.item]}));const merged=mergeInbox(this.inbox.items,data.items);if(!this.persist({...this.inbox,items:merged.items}))return;event.detail.ok=true;const saved=merged.items.find(x=>x.taskKey===data.items[0].taskKey)||data.items[0];this.workstream=saved.workstream;this.view=taskSection(saved);this.expanded=true;this.renderItems();this.say(merged.added?`Saved “${saved.title}”. Confirmed dates appear in Calendar.`:`This email already exists. Your saved edits and progress were kept.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});}catch(error){event.detail.error=error.message;}});this.append(this.emailCapture);
    this.inputDetails=element('details',undefined,{class:'import-input'});this.inputDetails.append(element('summary','Import an AI task file or an Evernote export'));
    this.inputDetails.append(element('p','For a task list with priorities and dates, give ChatGPT your Evernote export (.html) and the instructions below. Import the Launchpad task file (.json) it creates. You can also import the Evernote file directly to make a simpler list to review.'));
    const instructions=element('a','Download the ChatGPT instructions',{href:new URL('../launchpad-ai-prompt.md?v=plain-language-1',import.meta.url).href,download:'launchpad-ai-prompt.md'});this.inputDetails.append(instructions,element('p','These instructions keep the full email text, add a short summary and suggest where ChatGPT can help.',{class:'import-help'}),element('a','Download the Evernote instructions',{href:new URL('../email-note-master-prompt.md?v=email-source-1',import.meta.url).href,download:'email-note-master-prompt.md'}));
    const label=element('label','Paste a summary or task file text',{for:'summary-paste'});this.paste=element('textarea','',{id:'summary-paste',rows:'5',maxlength:String(LIMIT),placeholder:'Choose the AI task file below, or paste a summary with exact note titles.'});
    const actions=element('div',undefined,{class:'import-actions'});
    this.importButton=button('Review actions',()=>{if(this.paste.value.trim())this.importText(this.paste.value);else if(this.file.files[0])this.importFile(this.file.files[0]);else this.say('Choose a file or paste a summary first.',true);},'import-primary');
    this.file=element('input',undefined,{id:'summary-file',type:'file',accept:'.json,.txt,.md,.html,.htm,application/json,text/plain,text/html'});
    this.file.addEventListener('change',()=>{if(this.file.files[0])this.importFile(this.file.files[0]);});
    actions.append(this.importButton,element('label','Or choose a file',{for:'summary-file'}),this.file);
    this.fileMessage=element('p','',{role:'status','aria-live':'polite',class:'import-message import-file-message',tabindex:'-1'});
    this.inputDetails.append(label,this.paste,actions,this.fileMessage);this.append(this.inputDetails);
    this.brief=element('details',undefined,{class:'import-other'});this.brief.append(element('summary','Read the email summary'));
    this.briefDate=element('p','',{class:'import-help'});this.briefText=element('pre','',{class:'import-briefing'});
    this.brief.append(this.briefDate,button('Download email summary',()=>download(this.inbox.briefing||'','launchpad-briefing.md','text/markdown')),this.briefText);this.append(this.brief);
    const searchArea=element('div',undefined,{class:'note-search'});
    const searchLabel=element('label','Search notes',{for:'note-search-input'});
    this.searchInput=element('input',undefined,{id:'note-search-input',type:'search',placeholder:'Search tasks, notes and email text…',autocomplete:'off'});
    this.searchInput.addEventListener('input',()=>this.renderItems());
    this.clearSearch=button('Clear search',()=>{this.searchInput.value='';this.renderItems();this.searchInput.focus();});
    searchArea.append(searchLabel,this.searchInput,this.clearSearch);this.append(searchArea);
    this.streamNav=element('nav',undefined,{'aria-label':'Work area',class:'import-workstreams'});this.streamButtons={};
    for(const[key,label]of Object.entries({all:'All work',...WORKSTREAMS})){const control=button(label,()=>this.setWorkstream(key));this.streamButtons[key]=control;this.streamNav.append(control);}this.append(this.streamNav);
    this.nav=element('nav',undefined,{'aria-label':'Task views',class:'import-tabs'});this.tabs={};
    for(const [key,label]of [['ready','Today'],['upcoming','Soon'],['waiting','Waiting'],['notes','My Notes'],['done','Done']]){const b=button(label,()=>{this.searchInput.value='';this.view=key;this.expanded=false;this.renderItems();});this.tabs[key]={button:b,label};this.nav.append(b);}this.append(this.nav);
    this.viewHelp=element('p','',{class:'import-help',role:'status','aria-live':'polite'});this.list=element('div',undefined,{class:'import-list'});this.append(this.viewHelp,this.list);
    this.earlier=element('details',undefined,{class:'import-other'});this.earlierHeading=element('summary');this.earlierList=element('div',undefined,{class:'import-list'});this.earlier.append(this.earlierHeading,element('p','The new task file replaces these earlier notes. Their text and edits are kept here. Restore one only if it has work missing from the new task.',{class:'import-help'}),this.earlierList);this.append(this.earlier);
    const footer=element('div',undefined,{class:'import-footer'});footer.append(element('p','Saved in this browser. Use Open backup or Save backup at the top. Email and Evernote are not changed.',{class:'import-help'}),button('Open backup…',()=>this.openTaskBackupImport()),button('Save backup…',()=>void this.exportTaskBackup()));if(this.legacyRaw!==null)footer.append(button('Save older daily plans',()=>download(this.legacyRaw,'launchpad-older-daily-plans.json')));this.clearNotesButton=button('Clear unfinished email notes',()=>this.openClearNotes(),'import-danger');footer.append(this.clearNotesButton);this.append(footer);
    this.taskArea=element('div',undefined,{class:'task-area'});for(const child of [...this.children])if(child!==heading&&child!==this.message&&child!==this.reloadButton)this.taskArea.append(child);this.append(this.taskArea);
    this.calendar=element('launchpad-calendar');this.calendar.hidden=true;
    this.calendar.addEventListener('calendar:minimise',()=>{this.showCalendar(false);this.calendarToggle.focus({preventScroll:true});this.calendarToggle.scrollIntoView({behavior:'smooth',block:'nearest'});});
    this.calendar.addEventListener('calendar:open-task',event=>this.openCalendarTask(event.detail.id));
    this.calendar.addEventListener('calendar:change-task-date',event=>{const d=event.detail;if(['dueDate','eventDate','followUpDate'].includes(d.key)&&this.inbox.items.some(x=>x.id===d.id))d.ok=this.updateItem(d.id,{[d.key]:d.date},true);});this.append(this.calendar);this.buildChatGPTChooser();this.buildClearNotesDialog();this.buildBackupImportDialog();this.taskHelpDialog=createTaskHelpDialog(this);

    this.headingCopy=copy;this.headingToolbar=toolbar;this.globalFooter=footer;
    this.scopedNoteButton=button('Add a note',()=>this.editPersonal());this.scopedNoteButton.hidden=true;heading.append(this.scopedNoteButton);
    this.scopeNote=element('p','',{class:'import-help'});this.scopeNote.hidden=true;this.taskArea.append(this.scopeNote);

  }
  setScope(scope){
    this.scope=['vet','tas'].includes(scope)?scope:null;
    if(this.scope){this.dataset.scope=this.scope;this.workstream=this.scope;}else delete this.dataset.scope;
    this.headingToolbar.hidden=!!this.scope;this.scopedNoteButton.hidden=!this.scope;
    this.streamNav.hidden=!!this.scope;this.inputDetails.hidden=!!this.scope;this.globalFooter.hidden=!!this.scope;
    this.scopeNote.hidden=!this.scope;
    this.scopeNote.textContent=this.scope?'These tasks also appear in Launchpad on this browser. They use the dates and progress saved in this workboard.':'';
    this.headingCopy.querySelector('h2').textContent=this.scope?`${WORKSTREAMS[this.scope]} task list`:'Your tasks and notes';
    this.headingCopy.querySelector('.import-intro').textContent=this.scope?`Your ${WORKSTREAMS[this.scope]} duties, follow-ups and notes. Completed tasks stay in Done.`:'Scheduled duties appear automatically. Pin your priorities and keep notes with each task.';
    this.setAttribute('aria-label',this.scope?`${WORKSTREAMS[this.scope]} tasks and notes`:'Your tasks and notes');
    this.noteEditor.hidden=!!(this.scope&&this.editingNote&&this.inbox.items.find(x=>x.id===this.editingNote)?.workstream!==this.scope);
    this.showCalendar(false);this.renderItems();
  }
  hasNoteDraft(){
    if(this.querySelector('[data-note-unsaved="true"]'))return true;
    const old=this.inbox.items.find(item=>item.id===this.editingNote);
    return this.noteEditor?.open&&Object.entries(this.noteInputs||{}).some(([key,input])=>input.value!==(old?.[key]||''));
  }
  openTaskBackupImport(){
    if(this.scope)return;
    this.resetBackupPreview?.();
    this.backupFile.value='';this.backupMessage.textContent='';this.backupStorageDetails.hidden=true;
    this.backupFileBrowser?.reset();this.backupDialog.showModal();this.backupDialog.querySelector('.backup-file-browser button:not([hidden])')?.focus();
  }
  buildBackupImportDialog(){
    installLaunchpadBackupDialog(this);
  }
  showBackupStorageDetails(show){
    this.backupStorageDetails.hidden=!show;if(!show)return;
    this.backupStorageDetails.replaceChildren(element('summary','Browser storage details'));
    try{
      const report=storageSizes(workStorage()),list=element('ul');
      for(const row of report.rows)if(row.saved)list.append(element('li',`${row.label}: ${row.saved.toLocaleString('en-AU')} characters saved`));
      this.backupStorageDetails.append(element('p','These counts describe this browser on this device, not your Google Drive allowance. No note contents are shown.'),list);
    }catch{this.backupStorageDetails.append(element('p','Storage details are unavailable. Your saved work has not been cleared.'));}
    this.backupStorageDetails.open=true;
  }
  buildClearNotesDialog(){
    this.clearDialog=element('dialog',undefined,{class:'chatgpt-chooser','aria-labelledby':'clear-notes-title'});
    this.clearDialog.append(element('h2','Clear unfinished email notes?',{id:'clear-notes-title'}));
    this.clearDescription=element('p');this.clearDialog.append(this.clearDescription,element('p','This clears unfinished email notes in Head Teacher, including their drafts, task dates and unfinished earlier imports. It also clears the old email summary.'),element('p','This keeps completed tasks in Done, items in My Notes, tasks put aside, your own notes, and all VET and TAS tasks and checklists. Lessons and diary events stay. Evernote and Outlook are not changed.'),element('p','Save a backup first. When asking ChatGPT to refresh your task file, include the backup with your Evernote notes so it can recognise completed tasks. You need the backup to restore anything cleared here.'));
    const actions=element('div',undefined,{class:'clear-notes-actions'});
    const cancel=button('Cancel',()=>this.clearDialog.close());cancel.setAttribute('autofocus','');
    actions.append(cancel,button('Save backup first…',()=>void this.exportTaskBackup()),button('Clear unfinished email notes',()=>{
      if(this.scope||!['personal','all'].includes(this.workstream)||this.blocked||this.raw!==this.clearSnapshot){this.clearDialog.close();this.say('The work area or notes changed while this confirmation was open. Review the list before clearing unfinished email notes.',true);return;}
      // Mark migration complete so old daily plans cannot repopulate the cleared list.
      const next=clearEmailImports(this.inbox);
      if(!this.persist(next)){this.clearDialog.close();return;}
      this.clearDialog.close();this.workstream='personal';this.view='ready';this.expanded=false;this.editingNote=null;this.noteForm.reset();this.noteEditor.open=false;this.paste.value='';this.inputDetails.open=false;this.searchInput.value='';this.renderItems();this.say('Unfinished Head Teacher email notes cleared. Completed items are kept in Done. Your own notes and all VET/TAS work are unchanged.');
    },'import-danger'));
    this.clearDialog.append(actions);this.append(this.clearDialog);
  }
  openClearNotes(){
    if(this.scope||!['personal','all'].includes(this.workstream)||this.blocked)return;
    this.clearSnapshot=this.raw;
    const count=this.inbox.items.filter(isUnfinishedEmailNote).length;
    if(!count)return;
    this.clearDescription.textContent=`You are about to remove ${count} unfinished ${count===1?'email note':'email notes'} from Head Teacher in this browser. Completed notes will stay in Done.`;
    this.clearDialog.showModal();
  }
  buildChatGPTChooser(){
    this.chatGPTChooser=element('dialog',undefined,{'aria-labelledby':'chatgpt-choice-title',class:'chatgpt-chooser'});
    const steps=element('ol',undefined,{class:'chatgpt-choice-steps'});
    steps.append(element('li','Copy the help request.'),element('li','Choose where to open ChatGPT below.'),element('li','Paste the request into the chat with Ctrl + V.'));
    this.chatGPTChooser.append(element('h2','Open ChatGPT',{id:'chatgpt-choice-title'}),steps);
    const choices=element('div',undefined,{class:'chatgpt-choice-links'});
    const desktop=element('a','Desktop app',{href:'chatgpt://'});
    const web=element('a','Web app',{href:'https://chatgpt.com/',target:'_blank',rel:'noopener noreferrer'});
    web.addEventListener('click',()=>this.chatGPTChooser.close());
    choices.append(desktop,web);this.chatGPTChooser.append(choices,element('p','If the desktop app does not open, choose Web app or open ChatGPT from your Start menu.',{class:'import-help'}),button('Cancel',()=>this.chatGPTChooser.close()));this.append(this.chatGPTChooser);
  }
  showCalendar(open){if(this.scope)open=false;this.taskArea.hidden=open;this.calendar.hidden=!open;this.calendarToggle.textContent=open?'Back to tasks':'Calendar';this.calendarToggle.setAttribute('aria-pressed',String(open));if(open)this.calendar.setTasks(this.inbox.items);}
  openCalendarTask(id){const item=this.inbox.items.find(x=>x.id===id);if(!item)return;this.openCards.add(item.id);this.showCalendar(false);this.workstream=item.workstream;this.searchInput.value='';this.view=taskSection(item);this.expanded=true;this.renderItems();const card=[...this.list.querySelectorAll('article')].find(x=>x.dataset.taskKey===(item.taskKey||item.id));card?.scrollIntoView({behavior:'smooth',block:'center'});}
  buildNoteEditor(){
    this.noteEditor=element('details',undefined,{class:'import-input'});this.noteEditor.append(element('summary','Write your own note'));
    this.noteForm=element('form');this.noteInputs={};
    for(const[key,label,type,max]of [['title','Note title','text',300],['source','My note','textarea',20000],['action','Next action (optional)','textarea',800],['dueDate','Due date (optional)','date',10]]){
      const wrapper=element('label',label);const input=element(type==='textarea'?'textarea':'input',undefined,{'aria-label':label,maxlength:String(max),...(type==='textarea'?{rows:key==='source'?'5':'2'}:{type})});
      if(key==='title')input.required=true;this.noteInputs[key]=input;wrapper.append(input);this.noteForm.append(wrapper);
    }
    this.noteForm.append(element('p','Add a next action to put this note in your task list. Leave it blank to keep it in My Notes. Save backup includes your notes.',{class:'import-help'}));
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
    const item=enrich({...old,...values,workstream:old?.workstream||(this.workstream==='all'?'personal':this.workstream),createdOn:old?old.createdOn:todaySydney(),lastActionOn:old?recordNoteAction(old,{...values,dueDate:values.dueDate||null}).lastActionOn:null,id,personal:true,taskKey:old?.taskKey||`personal:${id}`,dueDate:values.dueDate||null,status:values.action?'review':'note',reason:'Your own note',dirty:[...new Set([...(old?.dirty||[]),'title','source','action','dueDate'])]});
    const items=old?this.inbox.items.map(x=>x.id===id?item:x):[...this.inbox.items,item];
    if(!this.persist({...this.inbox,items}))return;
    this.view=taskSection(item);this.noteEditor.open=false;this.editingNote=null;this.noteForm.reset();this.renderItems();this.say(`Saved “${item.title}” in ${this.tabs[this.view].label}.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});
  }
  importText(text){try{if(text.trim().startsWith('{'))this.importData(validateInbox(text));else this.importData({items:parseSummary(text)});}catch(error){this.say(error.message,true);}}
  async importFile(file,{backupOnly=false}={}){
    if(this.reading)return;this.reading=true;this.updateCount();this.say(`Reading ${file.name}…`);let timeout;
    try {
      if(file.size>20*LIMIT)throw new Error('This file is over 20 MB. Export fewer notes or use an AI task file.');
      const text=await Promise.race([file.text(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('The browser could not finish reading this file.')),15000);})]);
      if(backupOnly){
        let data;try{data=validateInbox(text);}catch{throw new Error('Choose a Launchpad task backup (.json). Open Finance, calendar, VET and TAS files in their own area.');}
        if(this.hasNoteDraft())throw new Error('Save or cancel your open note before importing.');
        return this.importData(data);
      }
      if(/\.json$/i.test(file.name))return this.importData(validateInbox(text));else return this.importData({items:parseSummary(/\.html?$/i.test(file.name)?textFromHtml(text):text)});
    }catch(error){this.say(`Could not import ${file.name}. ${error.message}`,true);}finally{clearTimeout(timeout);this.reading=false;this.updateCount();}
  }
  importData(data){
    data={...data,items:data.items.map(x=>x.status==='added'?{...x,status:'review',pinnedDate:x.pinnedDate||todaySydney()}:x)};
    const merged=mergeInbox(this.inbox.items,data.items);
    const next={...this.inbox,version:2,items:merged.items,workboardImports:mergeWorkboardImports(this.inbox.workboardImports,data.workboardImports),forecastContexts:{...(data.forecastContexts||{}),...(this.inbox.forecastContexts||{})},importedAt:new Date().toISOString()};
    for(const key of ['briefing','reviewDate','generatedAt'])if(data[key]!==undefined)next[key]=data[key];
    if(!this.persist(next))return;
    this.paste.value='';this.inputDetails.open=false;this.workstream='all';this.syncPlans();this.renderItems();
    this.say(`${merged.added} tasks added; ${merged.updated} existing tasks updated. Your edits and progress are kept.${merged.archived?` ${merged.archived} earlier notes kept under Earlier imports.`:''}`);
    this.nav.scrollIntoView({behavior:'smooth',block:'start'});return true;
  }
  updateItem(id,changes,rerender=false){
    if(Object.hasOwn(changes,'status'))changes={...changes,progressOverride:true};
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
    input.dataset.helpField=key;
    input.addEventListener('change',()=>{const value=type==='date'?(input.value||null):input.value.trim();this.updateItem(item.id,{[key]:value},true);});wrapper.append(input);return wrapper;
  }
  deleteNote(item){
    if(this.blocked)return;
    const dependents=this.inbox.items.filter(x=>x.dependsOn.includes(item.taskKey));
    const warning=dependents.length?`\n\n${dependents.length} other task(s) need this item first and will show that it is missing.`:'';
    if(!window.confirm(`Delete “${item.title}” from Daily Launchpad?\n\nThis removes this card and its calendar dates. It does not delete anything in Evernote or Outlook. Save a backup first if you need a copy. Importing the original file again can bring this task back.${warning}`))return;
    if(!this.persist({...this.inbox,items:this.inbox.items.filter(x=>x.id!==item.id)}))return;
    this.openCards.delete(item.id);
    if(this.editingNote===item.id){this.editingNote=null;this.noteForm.reset();this.noteEditor.open=false;}
    this.renderItems();this.say(`Deleted “${item.title}” from Daily Launchpad.`);
  }
  setProgress(item,status){
    if(this.updateItem(item.id,{status:status==='review'&&!item.action?'note':status,pinnedDate:null,preserveDoneOnce:false},true)){if(status!=='done'){this.view=taskSection(this.inbox.items.find(x=>x.id===item.id));this.renderItems();this.nav.scrollIntoView({behavior:'smooth',block:'start'});}this.say(status==='done'?`Marked done: ${item.title}. Saved in Done; you’re still in this section.`:`Restored: ${item.title}.`);}
  }
  togglePin(item){
    const pinned=isPinned(item);
    if(!pinned&&item.forecast?.asOf===todaySydney()&&(item.forecast.blocked||(item.forecast.active&&item.forecast.section==='waiting'))){this.say(item.forecast.blockerReason||'Another task needs to be done first. Open the workboard task before pinning it.');return;}
    if(!pinned&&item.dependsOn.some(key=>!this.inbox.items.some(x=>x.taskKey===key&&x.status==='done'))){this.say('Complete the task it depends on before pinning this one.');return;}
    if(this.updateItem(item.id,{pinnedDate:pinned?null:todaySydney(),status:'review',sectionOverride:''},true)){
      if(!pinned)this.view='ready';this.renderItems();this.say(pinned?`Unpinned: ${item.title}. The task is still in your list.`:`Pinned for today: ${item.title}. Saved at the top of Today.`);this.nav.scrollIntoView({behavior:'smooth',block:'start'});
      const card=[...this.list.querySelectorAll('article')].find(x=>x.dataset.taskKey===(item.taskKey||item.id));card?.querySelector('.import-pin')?.focus({preventScroll:true});
    }
  }
  card(item){
    const article=element('article',undefined,{class:`import-card${isPinned(item)?' is-pinned':''}`,'data-task-key':item.taskKey||item.id});
    const active=['review','added'].includes(item.status)&&!sourceCompleted(item);const dependencies=item.dependsOn.map(key=>this.inbox.items.find(x=>x.taskKey===key));
    const blockedBy=dependencies.some(x=>!x||x.status!=='done')||(item.forecast?.asOf===todaySydney()&&(item.forecast.blocked||(item.forecast.active&&item.forecast.section==='waiting')));
    const head=element('div',undefined,{class:'import-card-top'});head.append(element('strong',item.title));
    if(active){const pin=button(isPinned(item)?'Unpin':'Pin for today',()=>this.togglePin(this.inbox.items.find(x=>x.id===item.id)||item),'import-pin');pin.setAttribute('aria-label',`${isPinned(item)?'Unpin':'Pin for today'}: ${item.title}`);pin.setAttribute('aria-pressed',String(isPinned(item)));pin.disabled=this.blocked||(!isPinned(item)&&blockedBy);head.append(pin);}article.append(head);article.append(element('p',this.actionDateLabel(item),{class:'import-last-action',title:'Latest saved edit or status change; otherwise the date added to Launchpad. Older notes may not have a recorded date.'}));
    const chips=element('div',undefined,{class:'import-chips'});
    chips.append(element('span',WORKSTREAMS[item.workstream],{class:`import-chip workstream-${item.workstream}`}));
    if(this.searchInput.value.trim())chips.append(element('span',this.tabs[taskSection(item)]?.label||'Earlier imports',{class:'import-chip'}));
    if(item.personal)chips.append(element('span','My note',{class:'import-chip'}));if(item.status==='superseded')chips.append(element('span','Earlier import — inactive',{class:'import-chip'}));if(item.status==='dismissed')chips.append(element('span','Put aside',{class:'import-chip'}));
    chips.append(element('span',PRIORITIES[item.priority],{class:`import-chip priority-${item.priority||'unknown'}`}));if(item.nextAction)chips.append(element('span',NEXT_ACTIONS[item.nextAction],{class:'import-chip'}));
    for(const[key,label]of [['dueDate','Due'],['eventDate','Event'],['followUpDate','Follow up']])if(item[key])chips.append(element('span',`${label}: ${dateLabel(item[key])}`,{class:'import-chip'}));
    if(isPinned(item))chips.append(element('span','📌 Pinned for today',{class:'import-chip'}));if(item.duplicateOf)chips.append(element('span','Duplicate kept for reference',{class:'import-chip'}));if(item.status==='done'||sourceCompleted(item))chips.append(element('span',sourceCompleted(item)?(item.forecast?.sourceStatus==='completed-externally'?'✓ Completed outside this app':'✓ Complete in workboard'):'✓ Done',{class:'import-chip'}));article.append(chips);
    article.append(element('p',item.reason,{class:'import-reason'}));
    if(item.dateNote)article.append(element('p',item.dateNote,{class:'import-uncertain'}));
    if(item.waitingOn)article.append(element('p',`Waiting on: ${item.waitingOn}`,{class:'import-help'}));
    if(item.instruction){const tasks=element('section',undefined,{class:'import-instruction','aria-label':'Tasks'});tasks.append(element('h3','Tasks'),element('p',item.instruction));article.append(tasks);}
    const action=element('textarea',item.action,{class:'import-action',rows:'3',maxlength:'800','aria-label':`Action for ${item.title}`});action.disabled=this.blocked||!active;
    action.dataset.helpField='action';
    action.addEventListener('change',()=>{if(!action.value.trim()){action.value=item.action;this.say('Keep a short action, or put the task aside.',true);return;}if(this.updateItem(item.id,{action:action.value.trim()}))article.querySelector('.import-card-summary-text').value=action.value.trim();});if(item.personal&&item.source)article.append(element('pre',item.source,{class:'import-source'}));
    if(item.origin){
      const sourceLink=new URL(item.origin.wing==='tas'?'head-teacher-tas/':'./',repositoryRoot);sourceLink.hash=item.origin.route;
      article.append(element('a',`Open ${WORKSTREAMS[item.origin.wing]} task`,{href:sourceLink.href,class:'import-origin-link'}),element('p','Mark done here to record your part. Complete the checklist in the VET or TAS task.',{class:'import-help'}));
    }
    if(!item.personal&&!item.origin){
      const search=element('details',undefined,{class:'import-email-search'});
      search.append(element('summary','Email search text'));
      const query=element('input',undefined,{type:'text',value:emailSearchText(item),'aria-label':`Email search text for ${item.title}`,maxlength:'300'});
      search.append(query,element('p','Uses the email subject when available, otherwise the note title. Adjust it if needed, then paste into Outlook Search.',{class:'import-help'}));
      const actions=element('div',undefined,{class:'help-request-actions'});
      const copy=button('Copy email search',async()=>{const text=query.value.trim();if(!text){search.open=true;query.focus();return;}try{await navigator.clipboard.writeText(text);copyFeedback(copy);this.say('Email search copied. Open Outlook, paste into Search and press Enter.');}catch{copyFeedback(copy,false);search.open=true;query.focus();query.select();this.say('Automatic copy was blocked. The search text is selected—press Ctrl + C, then paste into Outlook Search.');}});
      actions.append(copy,element('a','Open Outlook ↗',{href:'https://outlook.cloud.microsoft/mail/',target:'_blank',rel:'noopener noreferrer',class:'import-email-link'}));
      article.append(actions,search);
    }
    if(item.originalEmailUrl)article.append(element('a','Open original email ↗',{href:item.originalEmailUrl,target:'_blank',rel:'noopener noreferrer',class:'import-email-link',title:'Open the original email and its attachments in Outlook'}));
    if(item.url)article.append(element('a','Open linked work ↗',{href:item.url,target:'_blank',rel:'noopener noreferrer',class:'import-work-link'}));
    if(item.dependsOn.length)article.append(element('p',`Depends on: ${dependencies.map((x,i)=>x?`${this.scope&&x.workstream!==this.scope?'Task in another work area':x.action}${x.status==='done'?' ✓':''}`:`Required task is missing`).join('; ')}${blockedBy?' — finish this work first.':''}`,{class:'import-help'}));
    if(active){
      const edit=element('details');edit.append(element('summary','Edit priority, dates and tasks'));const grid=element('div',undefined,{class:'import-fields'});
      grid.append(this.field(item,'priority','Priority','text',PRIORITIES),this.field(item,'nextAction','Next step','text',NEXT_ACTIONS),this.field(item,'dueDate','Deadline','date'),this.field(item,'eventDate','Event date','date'),this.field(item,'followUpDate','Follow-up date','date'),this.field(item,'owner','Responsible person'),this.field(item,'waitingOn','Waiting on'),this.field(item,'instruction','Tasks'),this.field(item,'dateNote','Date or progress to check'));
      if(item.action){const actionLabel=element('label','Action');actionLabel.append(action);edit.append(actionLabel);}edit.append(grid);article.append(edit);
    }
    article.append(createNoteEditor(item,{disabled:this.blocked,save:changes=>article.isConnected&&this.inbox.items.some(x=>x.id===item.id)&&this.updateItem(item.id,changes)}));
    const source=element('details');source.append(element('summary','Source and links'),element('p',item.origin?'Original workboard task:':item.personal?'Your note title:':'Search Evernote using this note title:'),element('p',item.title,{class:'import-source-title'}));
    for(const title of item.relatedTitles)source.append(element('p',`Also: ${title}`,{class:'import-source-title'}));
    if(item.sourceSummary){const summary=element('div',undefined,{class:'import-source-summary'});summary.append(element('strong','At a glance · AI summary'),element('p',item.sourceSummary));source.append(summary);}
    if(item.source)source.append(element('p','Original email or note',{class:'import-source-heading'}),element('div',item.source,{class:'import-source',tabindex:'0',role:'region','aria-label':'Original email or note'}));
    for(const url of item.links)source.append(element('a',url,{href:url,target:'_blank',rel:'noopener noreferrer',class:'import-source-link'}));
    if(active){const linkLabel=element('label','Work link');const url=element('input',undefined,{type:'url',value:item.url,placeholder:'https://… (optional)','aria-label':`Work link for ${item.title}`,maxlength:'2048'});url.disabled=this.blocked;url.addEventListener('change',()=>{if(url.value&&!safeUrl(url.value)){url.value=item.url;this.say('Use a full https:// link.',true);return;}this.updateItem(item.id,{url:url.value.trim()});});linkLabel.append(url);source.append(linkLabel);}const emailLabel=element('label','Original email link (optional)');const emailUrl=element('input',undefined,{type:'url',value:item.originalEmailUrl,placeholder:'https://…','aria-label':`Original email link for ${item.title}`,maxlength:'2048'});emailUrl.disabled=this.blocked;emailUrl.addEventListener('change',()=>{const value=emailUrl.value.trim();if(value&&!safeUrl(value)){emailUrl.value=item.originalEmailUrl;this.say('Use a full https:// link for the original email.',true);return;}this.updateItem(item.id,{originalEmailUrl:value},true);});emailLabel.append(emailUrl);source.append(emailLabel);article.append(source);
    if(item.help){const help=element('details');help.append(element('summary','ChatGPT can help with this'),element('p',item.help),button('Prepare help request',()=>this.taskHelpDialog.open(item.id)));article.append(help);}
    const controls=element('div',undefined,{class:'import-card-controls'});
    const quickControls=element('div',undefined,{class:'import-card-controls import-card-quick-controls','aria-label':`Quick actions for ${item.title}`});
    if(item.origin||item.help){const ai=button('Prepare with AI',()=>this.taskHelpDialog.open(item.id),'import-ai-help');ai.setAttribute('aria-label',`Prepare with AI: ${item.title}`);ai.addEventListener('pointerdown',event=>event.preventDefault());quickControls.append(ai);}
    if(!this.scope){const stream=element('select',undefined,{'aria-label':`Work area for ${item.title}`});for(const[value,label]of Object.entries(WORKSTREAMS))stream.append(element('option',label,{value}));stream.value=item.workstream;stream.disabled=this.blocked;stream.addEventListener('change',()=>{if(this.updateItem(item.id,{workstream:stream.value},true))this.say(`“${item.title}” is in ${WORKSTREAMS[stream.value]}. Its source task and progress are unchanged.`);});quickControls.append(stream);}
    if(!item.duplicateOf&&item.status!=='superseded'){
      const group=element('select',undefined,{'aria-label':`Move to section for ${item.title}`});
      const options=[['ready','Today'],['upcoming','Soon'],['waiting','Waiting'],['notes','My Notes'],['done','Done']];
      for(const[value,label]of options)group.append(element('option',label,{value}));
      const current=taskSection(item);
      group.value=current;group.disabled=this.blocked;
      group.addEventListener('change',()=>{
        const target=group.value;
        if(!item.action&& !['notes','done','dismissed'].includes(target)){group.value=current;this.say('Choose Edit my note and add a next action before moving this note into a task section.',true);return;}
        const changes={status:['done','dismissed'].includes(target)?target:target==='notes'&&!item.action?'note':'review',sectionOverride:['done','dismissed'].includes(target)?item.sectionOverride:target,pinnedDate:null,preserveDoneOnce:false};
        if(['ready','later','waiting'].includes(target))changes.group=target;
        if(this.updateItem(item.id,changes,true))this.say(`Moved “${item.title}” to ${options.find(x=>x[0]===target)[1]}.`);
      });quickControls.append(group);
    }
    if(item.personal&&['note','review'].includes(item.status))controls.append(button('Edit my note',()=>this.editPersonal(item)));
    if(active){

      const done=button('Mark done',()=>this.setProgress(item,'done'));done.disabled=this.blocked;quickControls.append(done);

    }else if(!item.duplicateOf&&item.status!=='note'){const restore=button('Review again',()=>this.setProgress(item,'review'));restore.disabled=this.blocked;controls.append(restore);}

    const remove=button('Delete note',()=>this.deleteNote(item),'import-danger');remove.disabled=this.blocked;quickControls.append(remove);
    if(controls.childElementCount)article.append(controls);
    const disclosure=element('details',undefined,{class:'import-card-disclosure'});
    disclosure.open=this.openCards.has(item.id);
    const summary=element('summary',undefined,{class:'import-card-summary'});
    const frontText=element('textarea',item.action||item.instruction||item.title,{class:'import-card-summary-text',rows:'2',maxlength:item.action?'800':'2000','aria-label':`Edit card text for ${item.title}`});
    frontText.dataset.helpField=item.action?'action':'instruction';
    frontText.disabled=this.blocked;
    const saveStatus=element('span','',{class:'card-save-status',role:'status','aria-live':'polite'});
    let saveTimer, savedText=frontText.value.trim();
    const resizeText=()=>{frontText.style.height='auto';frontText.style.height=`${frontText.scrollHeight}px`;};
    const saveText=()=>{
      clearTimeout(saveTimer);if(!frontText.isConnected)return;const value=frontText.value.trim();if(value===savedText){if(saveStatus.textContent)saveStatus.textContent='Saved';return;}
      if(!value){saveStatus.textContent='Enter text — empty text is not saved.';return;}
      const current=this.inbox.items.find(x=>x.id===item.id);if(!current)return;
      const key=item.action?'action':'instruction';
      if(current[key]===value){saveStatus.textContent='Saved';return;}
      if(this.updateItem(item.id,{[key]:value})){savedText=value;saveStatus.textContent='Saved';if(key==='action')action.value=value;}
      else saveStatus.textContent='Not saved — see the message above.';
    };
    frontText.addEventListener('input',()=>{resizeText();saveStatus.textContent='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(saveText,500);});
    frontText.addEventListener('blur',saveText);
    frontText.addEventListener('click',event=>event.stopPropagation());
    frontText.addEventListener('keydown',event=>event.stopPropagation());
    summary.setAttribute('aria-label',`Expand or collapse ${item.title}`);
    summary.append(frontText,element('span','',{class:'import-card-chevron','aria-hidden':'true'}));
    quickControls.prepend(saveStatus);
    requestAnimationFrame(()=>{if(frontText.isConnected){resizeText();}});
    const body=element('div',undefined,{class:'import-card-body'});
    body.append(...article.childNodes);disclosure.append(summary,body);article.append(disclosure);if(item.forecast)article.append(this.forecastNotice(item));if(quickControls.childElementCount)article.append(quickControls);
    disclosure.addEventListener('toggle',()=>{if(!disclosure.isConnected)return;if(disclosure.open)this.openCards.add(item.id);else this.openCards.delete(item.id);});
    return article;
  }
  forecastNotice(item){
    const forecast=item.forecast,availability=this.forecastAvailability?.get(item.origin.wing);const stale=forecast.asOf!==todaySydney()||!!availability;
    const section=element('section',undefined,{class:`import-forecast${stale?' is-stale':''}${!forecast.active?' is-history':''}`,'aria-label':`Schedule for ${item.title}`,'data-forecast-task':item.id});
    const state=availability?'Saved schedule · could not update':stale?'Saved schedule':!forecast.active?'Saved task · not in the current schedule':forecast.blocked||forecast.section==='waiting'?'Waiting in the saved schedule':'From the saved schedule';
    section.append(element('strong',state),element('p',forecast.reason));
    const details=[forecast.period,forecast.scheduledDate?`Scheduled ${dateLabel(forecast.scheduledDate)}`:'',forecast.windowStart||forecast.windowEnd?`Date range: ${forecast.windowStart?dateLabel(forecast.windowStart):'not supplied'} – ${forecast.windowEnd?dateLabel(forecast.windowEnd):'not supplied'}`:'',`Workboard progress: ${forecast.sourceStatus.replace(/-/g,' ')}`,`As at ${dateLabel(forecast.asOf)}`].filter(Boolean);
    section.append(element('p',details.join(' · '),{class:'import-forecast-meta'}));
    if(forecast.blockerReason)section.append(element('p',`Waiting on: ${forecast.blockerReason}`,{class:'import-forecast-blocker'}));
    if(availability)section.append(element('p',availability.note||availability.title||'The latest schedule could not be checked. These tasks show the last saved information.',{class:'import-forecast-stale'}));
    else if(stale)section.append(element('p',`Open ${WORKSTREAMS[item.origin.wing]} to update the schedule. This shows the last saved information.`,{class:'import-forecast-stale'}));
    return section;
  }
  renderItems(){
    if(this.scope)this.workstream=this.scope;
    const query=this.searchInput.value.trim();this.clearSearch.hidden=!query;
    const today=todaySydney();const visible=this.inbox.items.filter(x=>this.workstream==='all'||x.workstream===this.workstream);
    for(const[key,control]of Object.entries(this.streamButtons)){control.setAttribute('aria-pressed',String(this.workstream===key));control.textContent=`${key==='all'?'All work':WORKSTREAMS[key]} (${this.inbox.items.filter(x=>(key==='all'||x.workstream===key)&&taskSection(x,today)!=='done').length})`;}
    const inView=(x,key)=>taskSection(x,today)===key;
    for(const[key,{button:b,label}]of Object.entries(this.tabs)){b.textContent=`${label} (${visible.filter(x=>inView(x,key)).length})`;b.setAttribute('aria-pressed',String(!query&&this.view===key));}
    const sorted=visible.filter(x=>query?matchesNoteSearch(x,query):inView(x,this.view)).sort((a,b)=>Number(isPinned(b,today))-Number(isPinned(a,today))||(this.view==='upcoming'?(nextDate(a)||'9999-12-31').localeCompare(nextDate(b)||'9999-12-31')||rank(b,today)-rank(a,today):rank(b,today)-rank(a,today)));
    this.list.replaceChildren();this.nav.hidden=false;
    this.viewHelp.textContent={ready:'Pin for today saves a task at the top immediately. Pins reset each day; the tasks stay in your list.',upcoming:'Upcoming and later work. Dated tasks appear first; add a date when it is known.',waiting:'Tasks waiting on a reply or other work. Add a follow-up date to bring a task back to Today.',later:'Useful work you have chosen to leave for later.',notes:'Your own notes, useful information and tasks put aside.',done:'Completed tasks are saved here. Review again returns a task to your active work.',dismissed:'Tasks you put aside are saved here. Review again restores them.'}[this.view];
    if(query)this.viewHelp.textContent=`${sorted.length} matching ${sorted.length===1?'card':'cards'} in ${this.workstream==='all'?'all work':WORKSTREAMS[this.workstream]}, across all sections including Done and Earlier imports. Clear search or choose a section to return.`;
    if(!sorted.length)this.list.append(element('p',query?'No notes match these keywords.':this.inbox.items.length?'Nothing in this view.':'Add a note, paste an email or bring a task here from VET or TAS.',{class:'import-empty'}));
    const shown=!query&&this.view==='ready'&&!this.expanded?sorted.slice(0,Math.max(5,sorted.filter(x=>isPinned(x,today)).length)):sorted;shown.forEach(x=>this.list.append(this.card(x)));
    if(shown.length<sorted.length)this.list.append(button(`Show ${sorted.length-shown.length} more actions`,()=>{this.expanded=true;this.renderItems();}));
    const earlier=visible.filter(x=>x.status==='superseded');
    this.earlierList.replaceChildren(...earlier.map(x=>this.card(x)));this.earlierHeading.textContent=`Earlier imports (${earlier.length})`;this.earlier.hidden=!!query||!earlier.length;
    this.brief.hidden=!!this.scope||!this.inbox.briefing;this.briefText.textContent=this.scope?'':this.inbox.briefing||'';this.briefDate.textContent=!this.scope&&this.inbox.reviewDate?`Prepared ${dateLabel(this.inbox.reviewDate)}. This summary shows what was imported. Later edits stay on the task cards.`:'';
    this.calendar?.setTasks(this.scope?visible:this.inbox.items);this.updateCount();
  }
  updateCount(){
    this.clearNotesButton.hidden=!!this.scope||!['personal','all'].includes(this.workstream);
    this.clearNotesButton.disabled=this.blocked||this.reading||!this.inbox.items.some(isUnfinishedEmailNote);
    this.importButton.disabled=this.blocked||this.reading;this.file.disabled=this.blocked||this.reading;
    this.searchInput.disabled=this.blocked;this.clearSearch.disabled=this.blocked;
    for(const {button:control}of Object.values(this.tabs))control.disabled=this.blocked;
    for(const control of Object.values(this.streamButtons))control.disabled=this.blocked;
  }
}
customElements.define('summary-import',SummaryImport);
