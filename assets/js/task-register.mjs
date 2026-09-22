// Full source register and year-specific overall task sign-off.
import './task-review.js?v=early-completion-1';
export const REVIEW_KEY = 'wwhs-task-register-review:v1';
const browserStorage = () => window.WWHS_STORAGE || localStorage;
export function readReview(raw) {
  return (typeof window === 'object' ? window : globalThis).WWHS_TASK_REVIEW.parse(raw);
}
export function reviewKey(wing, item, year) { return `${wing}:${year}:${encodeURIComponent(item.recordKey || item.id)}`; }
export function registerDate(item) { return item.schedule?.endDate || item.schedule?.startDate || ''; }
export function registerEntryKind(item) {
  if (item.procedureOnly) return 'procedure';
  return ['core','scheduled','event'].includes(item.entryKind) ? item.entryKind : 'core';
}
export function registerEntryCounts(items) {
  return items.reduce((counts,item) => { counts[registerEntryKind(item)]++; return counts; }, {core:0,scheduled:0,procedure:0,event:0});
}
const entryLabels = {core:['main duty','main duties'],scheduled:['scheduled task','scheduled tasks'],procedure:['how-to guide','how-to guides'],event:['saved event','saved events']};
export function registerEntrySummary(items) {
  return Object.entries(registerEntryCounts(items)).filter(([,count])=>count).map(([kind,count])=>`${count} ${entryLabels[kind][count===1?0:1]}`).join(' · ');
}
export function registerReviewStatus(item) {
  if(item.reviewComplete || item.complete || item.procedureOnly || item.historyOnly || item.statusAppliesToYear===false || item.progressAvailable===false)return '';
  const status=String(item.status||'').trim().toLowerCase().replace(/\s+/g,'-');
  return {'in-progress':'In progress',waiting:'Waiting',exception:'Exception',performed:'Performed',recorded:'Recorded'}[status] || '';
}
export function matchesRegisterView(item, view, today) {
  const date = registerDate(item), kind = item.schedule?.kind;
  if (['core','scheduled','event'].includes(view)) return registerEntryKind(item) === view;
  if (view === 'open') return !item.reviewComplete && !item.procedureOnly;
  if (view === 'past') return !item.reviewComplete && !item.procedureOnly && ((date && date < today) || item.historyOnly || /^\d{4}$/.test(item.year) && Number(item.year) < Number(today.slice(0, 4)));
  if (view === 'focus') return item.inFocus && !item.reviewComplete;
  if (view === 'later') return !item.reviewComplete && date > today && !item.inFocus;
  if (view === 'recurring') return kind === 'recurring';
  if (view === 'trigger') return kind === 'trigger' || kind === 'undated';
  if (view === 'gaps') return !item.reviewComplete && !!item.gaps?.length;
  if (view === 'complete') return item.reviewComplete;
  if (view === 'reference') return item.procedureOnly;
  return true;
}
const node = (tag, text, attrs = {}) => {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  for (const [key, value] of Object.entries(attrs)) result.setAttribute(key, value);
  return result;
};
const sydneyToday = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Australia/Sydney'}).format(new Date());
const button = (text, action) => { const result = node('button', text, {type:'button'}); result.addEventListener('click', action); return result; };
const views = {all:'All entries',core:'Main duties',scheduled:'Scheduled tasks',event:'Saved events',reference:'How-to guides',open:'Not yet complete',past:'Past dates to check',focus:'Current task list',later:'Later dates',recurring:'Repeating duties',trigger:'As needed / no date set',gaps:'Needs checking',complete:'Completed'};

export function createTaskRegister({wing, label, getAdapter, getSavedItems = () => []}) {
  const panel = node('details', undefined, {class:'workspace-register'});
  const summary = node('summary');
  const startHere = node('span', 'Start Here ', {class:'register-start-here'});
  startHere.append(node('span', '→', {'aria-hidden':'true'}));
  summary.append(startHere, node('span', `All ${label} tasks · all dates`, {class:'register-summary-label'}), node('span', '▸', {class:'register-disclosure-arrow','aria-hidden':'true'}));
  panel.append(summary);
  const body = node('section', undefined, {'aria-label':`All ${label} tasks`});
  body.append(node('h2', `All ${label} tasks`), node('p', 'Past, current and upcoming tasks. Check past dates against your records—the work may already be done.'));
  const sourceNote = node('p', '', {class:'register-source'});
  const coverage = node('details', undefined, {class:'register-coverage'});
  coverage.append(node('summary', 'What still needs checking'));
  const coverageList = node('ul'); coverage.append(coverageList);
  body.append(sourceNote, coverage);
  const filters = node('div', undefined, {class:'register-filters'});
  const year = node('select', undefined, {'aria-label':'Register year'});
  const area = node('select', undefined, {'aria-label':'Task area or term'});
  const view = node('select', undefined, {'aria-label':'Register view'});
  for (const [key, text] of Object.entries(views)) view.append(node('option', text, {value:key}));
  const search = node('input', undefined, {type:'search','aria-label':`Search full ${label} register`,placeholder:'Find a task, role or timing…'});
  for (const [text, control] of [['Year',year],['Term / area',area],['Show',view],['Search all listed tasks',search]]) { const wrapper = node('label', text); wrapper.append(control); filters.append(wrapper); }
  const counts = node('p','',{class:'register-counts',role:'status','aria-live':'polite'});
  const breakdown = node('p','',{class:'register-counts','aria-label':'Entry types in the selected year and area'});
  const countHelp = node('details',undefined,{class:'register-coverage'});
  countHelp.append(node('summary','How tasks are counted'),node('p',wing==='vet' ? '2026 counts each main duty once. In 2027, repeating duties have a task for each date, so the totals differ. How-to guides explain the steps; saved events are tasks you have added.' : 'Main duties are counted once. Scheduled tasks show each planned repeat. How-to guides explain the steps.',{class:'register-review-note'}));
  const message = node('p','',{class:'register-message',role:'status','aria-live':'polite'});
  const reviewNote = node('p','',{class:'register-review-note'});
  const list = node('div',undefined,{class:'register-list'});
  const reviewHelp = node('details',undefined,{class:'register-coverage'});
  reviewHelp.append(node('summary','More about completion ticks'));
  const reviewRules = node('ul');
  for(const text of ['Each tick covers this task and its checklist for the year shown, including work done elsewhere.','Your notes are kept. Unticking restores the earlier checklist.','The recorded date is when you ticked the task, not when you did the work.','Keep the required evidence and verifier details; the tick does not add them.','Repeating duties still need doing next time. Dates and next year’s tasks stay unchanged.'])reviewRules.append(node('li',text));
  reviewHelp.append(reviewRules);
  body.append(filters, counts, breakdown, countHelp, reviewNote, reviewHelp, message, list);
  const backup = node('details',undefined,{class:'register-backup'});
  backup.append(node('summary','Back up or restore review ticks'));
  const exportButton = button('Back up review ticks', () => {
    if (raw === null) { message.textContent = 'There are no saved review ticks yet.'; return; }
    const url = URL.createObjectURL(new Blob([raw],{type:'application/json'}));
    const link = node('a','Download',{href:url,download:'vet-tas-task-review.json'}); link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const file = node('input',undefined,{type:'file',accept:'.json,application/json','aria-label':'Restore review ticks'});
  file.addEventListener('change',async()=>{
    try {
      if (!file.files[0]) return;
      if (file.files[0].size > 2000000) throw new Error('This review backup is too large.');
      const restored = readReview(await file.files[0].text());
      if (blocked) {
        if (!window.confirm('The saved review ticks cannot be read. Replace them with this valid backup? Use Back up review ticks first if you need to retain the unreadable copy.')) return;
        if (save(restored,{recover:true})) {message.textContent='Review ticks recovered from the backup.';render();}
        return;
      }
      const merged = {...review.records};
      for (const [key,value] of Object.entries(restored.records)) if (!merged[key] || value.reviewedOn > merged[key].reviewedOn) merged[key] = value;
      if (save({version:1,records:merged})) { message.textContent='Ticks added from the backup. Newer or same-date ticks were kept.'; render(); }
    } catch (error) { message.textContent=`Could not restore: ${error.message} Saved review ticks are unchanged.`; }
    finally {file.value='';}
  });
  backup.append(node('p','This file backs up only VET and TAS completion ticks. Use Save backup at the top for the rest of your work.'),exportButton,file);
  body.append(backup); panel.append(body);
  let snapshot, review = {version:1,records:{}}, raw = null, blocked = false;
  function load() {
    try { raw = browserStorage().getItem(REVIEW_KEY); review = readReview(raw); blocked = false; }
    catch { blocked = true; message.textContent='Saved review ticks could not be read. They are unchanged. Back them up before recovering them.'; }
  }
  function save(next,{recover=false}={}) {
    try {
      if (window.WWHS_TEAM_SESSION && !window.WWHS_TEAM_SESSION.allowWrite(REVIEW_KEY,next)) throw new Error(window.WWHS_TEAM_SESSION.reason());
      if (blocked&&!recover || browserStorage().getItem(REVIEW_KEY) !== raw) { blocked = true; throw new Error('Review ticks changed in another tab. Reload review ticks before saving.'); }
      const nextRaw = JSON.stringify(next); readReview(nextRaw); browserStorage().setItem(REVIEW_KEY,nextRaw); raw=nextRaw;review=next;blocked=false;
      window.dispatchEvent(new CustomEvent('wwhs:review-updated',{detail:{wing}}));
      return true;
    } catch(error) { message.textContent=`Could not save: ${error.message}`; return false; }
  }
  const reload = button('Reload review ticks',()=>{load();render();if(!blocked)message.textContent='Review ticks reloaded.';}); backup.append(reload);
  function getItems() {
    const saved = getSavedItems();
    return snapshot.items.filter(item => (year.value === 'all' || item.year === year.value || item.year === 'ongoing') && (area.value === 'all' || item.area === area.value)).map(item => {
      const reviewYear = item.year === 'ongoing' ? (year.value === 'all' ? snapshot.currentYear : Number(year.value)) : Number(item.year);
      const key = reviewKey(wing,item,reviewYear), tick=review.records[key];
      const appliesToYear=item.year !== 'ongoing' || reviewYear === snapshot.currentYear;
      const personalDone=appliesToYear&&!!item.recordKey&&saved.some(task=>task.origin?.wing===wing&&task.origin.recordKey===item.recordKey&&task.status==='done');
      const schedule=appliesToYear?item.schedule:{kind:item.schedule?.kind||'undated',label:`Repeating duty — ${reviewYear} dates are not loaded. Open the task to check when it is needed.`};
      const signedOff = globalThis.WWHS_TASK_REVIEW.resolve(review.records,wing,item.recordKey || item.id,reviewYear,sydneyToday(),registerDate({schedule}));
      return {...item,schedule,statusAppliesToYear:appliesToYear,inFocus:appliesToYear&&item.inFocus,reviewYear,key,tick:signedOff?tick:undefined,sourceComplete:appliesToYear&&item.complete&&!item.externallyReviewed,personalDone,reviewComplete:!!signedOff || appliesToYear&&item.complete || personalDone};
    });
  }
  function render() {
    if (!snapshot) return;
    const today=sydneyToday(), items=getItems(), query=search.value.trim().toLocaleLowerCase('en-AU');
    const filtered=items.filter(item=>matchesRegisterView(item,view.value,today)&&(!query||[item.title,item.area,item.owner,item.schedule?.label,...(item.gaps||[])].join(' ').toLocaleLowerCase('en-AU').includes(query)));
    for (const option of view.options) option.textContent=`${views[option.value]} (${items.filter(item=>matchesRegisterView(item,option.value,today)).length})`;
    counts.textContent=`Showing ${filtered.length} of ${items.length} entries for ${year.value==='all'?'all listed years':year.value}. ${snapshot.roleLabel || ''}${snapshot.roleLabel?'.':''}`;
    breakdown.textContent=`This selection: ${registerEntrySummary(items) || 'no entries'}.`;
    const datedYearLoaded=snapshot.items.some(item=>item.year===year.value&&registerDate(item));
    reviewNote.textContent=`${year.value!=='all'&&!datedYearLoaded?'Dates are not loaded for this year; only the listed duties appear. ':''}Tick Reviewed complete when the task and its checklist are finished. You can tick future work off early. Untick to undo.`;
    list.replaceChildren();
    if (!filtered.length) list.append(node('p','No entries match these filters. Try All entries or All listed years.'));
    for (const item of filtered) {
      const row=node('article',undefined,{class:`register-row${item.reviewComplete?' is-reviewed':''}`,'data-register-id':item.id});
      const main=node('div',undefined,{class:'register-row-main'});
      const clarity=item.clarity||{}, disclosure=node('details',undefined,{class:'task-clarity-disclosure',name:`register-task-${wing}`});
      const front=node('summary');
      front.append(node('p',[item.year==='ongoing'?'Ongoing':item.year,item.area,clarity.kindLabel].filter(Boolean).join(' · '),{class:'task-clarity-meta'}),node('h3',clarity.title||item.title));
      if(clarity.purpose)front.append(node('p',clarity.purpose,{class:'task-clarity-purpose'}));
      const shortDate=value=>new Date(`${value}T12:00:00`).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
      const dates=[item.schedule?.startDate,item.schedule?.endDate].filter((value,index,all)=>value&&all.indexOf(value)===index);
      const timing=dates.length?dates.map(shortDate).join(' – '):item.schedule?.kind==='trigger'?'As needed':item.schedule?.kind==='recurring'?'Recurring duty':'Check timing in task';
      front.append(node('p',`When: ${timing}`,{class:'task-clarity-meta'}));
      const reveal=node('span',undefined,{class:'task-clarity-toggle'});
      reveal.append(node('span','View steps',{class:'when-closed'}),node('span','Hide steps',{class:'when-open'}));front.append(reveal);
      const body=node('div',undefined,{class:'task-clarity-body'});
      if(clarity.finished){const outcome=node('div',undefined,{class:'task-clarity-outcome'});outcome.append(node('strong','Finished when'),node('p',clarity.finished));body.append(outcome);}
      if(clarity.steps?.length){body.append(node('h4','What to do'));const steps=node('ol',undefined,{class:'task-clarity-steps'});clarity.steps.forEach(step=>steps.append(node('li',step)));body.append(steps);}
      body.append(node('a','Open task to work through the checks',{href:item.route,class:'task-clarity-task-link'}));
      const reference=node('details',undefined,{class:'task-clarity-reference'});reference.append(node('summary','Sources & responsibilities'));
      reference.append(node('p',[item.year==='ongoing'?`Ongoing duty · review ${item.reviewYear}`:item.year,entryLabels[registerEntryKind(item)][0],item.area,item.owner].filter(Boolean).join(' · '),{class:'register-meta'}));
      reference.append(node('p',item.schedule?.label || 'Timing needs checking',{class:'register-timing'}));
      body.append(reference);disclosure.append(front,body);main.append(disclosure);
      if(item.planningLabel)main.append(node('span',item.planningLabel,{class:'register-review-status'}));
      const reviewStatus=registerReviewStatus(item);
      if(reviewStatus)main.append(node('span',`Under review · ${reviewStatus}`,{class:'register-review-status'}));
      const date=registerDate(item), past=date&&date<today;
      const status=item.sourceComplete?`Workboard status: ${item.status}`:item.personalDone?'Done in your saved task list':item.tick?.completed?`Reviewed complete${item.tick.completedEarly?' early':''} for ${item.reviewYear} · ${item.tick.reviewedOn}`:past?'Past date — review the record':item.historyOnly?'Past task — check if it is done':item.inFocus?'In your current task list':item.procedureOnly?'Procedure guide':item.schedule?.kind==='trigger'?'Do this when needed':'Not in your current task list';
      main.append(node('p',status,{class:'register-status'}));
      if(!item.reviewComplete&&item.gaps?.length){const gaps=node('details',undefined,{class:'register-gap'});gaps.append(node('summary',`${item.gaps.length} ${item.gaps.length===1?'check':'checks'} needed`));const ul=node('ul');item.gaps.forEach(gap=>ul.append(node('li',gap)));gaps.append(ul);main.append(gaps);}
      const control=node('label',undefined,{class:'register-tick'});
      const checkbox=node('input',undefined,{type:'checkbox','aria-label':`Reviewed complete for ${item.reviewYear}: ${item.title}`});
      checkbox.checked=item.reviewComplete;
      const future=item.reviewYear>Number(today.slice(0,4))||!!date&&date>today;
      checkbox.disabled=blocked||item.procedureOnly||item.sourceComplete||item.personalDone;
      checkbox.addEventListener('change',()=>{
        const completed=checkbox.checked;
        if(save({version:1,records:{...review.records,[item.key]:{completed,reviewedOn:today,...(completed&&future?{completedEarly:true}:{})}}})) {message.textContent=completed?`Reviewed complete${future?' early':''} for ${item.reviewYear}: ${item.title}.${future?' Scheduled dates are unchanged.':''}`:`Review tick removed: ${item.title}.`;render();}
        else {checkbox.checked=!completed;checkbox.disabled=true;}
      });
      control.append(checkbox,node('span',item.procedureOnly?'Reference only':item.sourceComplete?'Complete in workboard':item.personalDone?'Done in task list':item.tick?.completedEarly?`Reviewed complete early · ${item.reviewYear}`:future?`Mark complete early · ${item.reviewYear}`:`Reviewed complete · ${item.reviewYear}`));
      if(item.tick?.completed&&(item.sourceComplete||item.personalDone)){
        const remove=node('button','Remove review tick',{type:'button','aria-label':`Remove review tick: ${item.title}`});
        remove.disabled=blocked;
        remove.addEventListener('click',()=>{
          if(save({version:1,records:{...review.records,[item.key]:{completed:false,reviewedOn:today}}})) {message.textContent=`Review tick removed: ${item.title}. Its other completion record is unchanged.`;render();}
        });
        main.append(remove);
      }
      row.append(main,control);list.append(row);
    }
  }
  function refresh() {
    try {
      const adapter=getAdapter();if(!adapter?.getTaskRegister)return;
      snapshot=adapter.getTaskRegister();
      const oldYear=year.value;
      const years=[...new Set([String(snapshot.currentYear),String(snapshot.currentYear+1),...snapshot.items.map(item=>item.year).filter(value=>/^\d{4}$/.test(value))])].sort();
      year.replaceChildren(...years.map(value=>node('option',value,{value})),node('option','All listed years',{value:'all'}));
      year.value=oldYear && (oldYear==='all'||years.includes(oldYear))?oldYear:String(snapshot.currentYear);
      const oldArea=area.value, areas=[...new Set(snapshot.items.map(item=>item.area).filter(Boolean))];
      area.replaceChildren(node('option','All terms / areas',{value:'all'}),...areas.map(value=>node('option',value,{value})));
      area.value=areas.includes(oldArea)?oldArea:'all';
      sourceNote.textContent=snapshot.sourceNote;
      coverageList.replaceChildren(...(snapshot.coverageNotes||[]).map(note=>node('li',note)));
      coverage.hidden=!coverageList.children.length;
      render();
    } catch(error) {message.textContent='The full register could not be refreshed. Your review ticks are unchanged.';}
  }
  for(const control of [year,area,view])control.addEventListener('change',render);
  search.addEventListener('input',render);
  panel.addEventListener('toggle',()=>{if(panel.open)refresh();});
  window.addEventListener('storage',event=>{if(event.key===REVIEW_KEY||event.key===null){load();render();}});
  load();refresh();
  return {element:panel,refresh,open(viewName){panel.open=true;if(Object.hasOwn(views,viewName))view.value=viewName;refresh();panel.scrollIntoView({behavior:'smooth',block:'start'});}};
}
