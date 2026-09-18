// Full source register and year-specific overall task sign-off.
import './task-review.js?v=overall-signoff-1';
export const REVIEW_KEY = 'wwhs-task-register-review:v1';
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
const entryLabels = {core:['core duty','core duties'],scheduled:['scheduled occurrence','scheduled occurrences'],procedure:['procedure guide','procedure guides'],event:['saved event','saved events']};
export function registerEntrySummary(items) {
  return Object.entries(registerEntryCounts(items)).filter(([,count])=>count).map(([kind,count])=>`${count} ${entryLabels[kind][count===1?0:1]}`).join(' · ');
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
const views = {all:'All entries',core:'Core duties',scheduled:'Scheduled occurrences',event:'Saved events',reference:'Procedure guides',open:'Not yet reviewed complete',past:'Past dates to review',focus:'Current focus',later:'Later dates',recurring:'Recurring duties',trigger:'Triggered or undated',gaps:'Needs checking',complete:'Completed / reviewed'};

export function createTaskRegister({wing, label, getAdapter, getSavedItems = () => []}) {
  const panel = node('details', undefined, {class:'workspace-register'});
  const summary = node('summary', `Full ${label} task register · all dates`);
  panel.append(summary);
  const body = node('section', undefined, {'aria-label':`Full ${label} task register`});
  body.append(node('h2', `Full ${label} task register`), node('p', 'See every task loaded in this workboard, including past dates, later work and duties triggered by an event. A past date means check the record; it does not prove the work was missed.'));
  const sourceNote = node('p', '', {class:'register-source'});
  const coverage = node('details', undefined, {class:'register-coverage'});
  coverage.append(node('summary', 'Coverage check — what still needs confirming'));
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
  const countNote = node('p',wing==='vet' ? '2026 lists core duties once, including duties that repeat. The 2027 plan expands repeat work into scheduled occurrences. Procedure guides are reference instructions; saved events are separate items started in this browser. The two annual totals are not a like-for-like count of responsibilities.' : 'Core duties are listed once, including duties that repeat. Scheduled occurrences are individual planned repetitions; procedure guides are reference instructions.',{class:'register-review-note'});
  const message = node('p','',{class:'register-message',role:'status','aria-live':'polite'});
  const reviewNote = node('p','',{class:'register-review-note'});
  const list = node('div',undefined,{class:'register-list'});
  body.append(filters, counts, breakdown, countNote, reviewNote, message, list);
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
      if (save({version:1,records:merged})) { message.textContent='Review backup merged. Existing ticks with the same or a later review date were kept.'; render(); }
    } catch (error) { message.textContent=`Could not restore: ${error.message} Saved review ticks are unchanged.`; }
    finally {file.value='';}
  });
  backup.append(node('p','These ticks stay in this browser. The backup contains VET and TAS review ticks only; existing task and workboard backups remain separate.'),exportButton,file);
  body.append(backup); panel.append(body);
  let snapshot, review = {version:1,records:{}}, raw = null, blocked = false;
  function load() {
    try { raw = localStorage.getItem(REVIEW_KEY); review = readReview(raw); blocked = false; }
    catch { blocked = true; message.textContent='Saved review ticks could not be read. They are unchanged. Back them up before recovering them.'; }
  }
  function save(next,{recover=false}={}) {
    try {
      if (blocked&&!recover || localStorage.getItem(REVIEW_KEY) !== raw) { blocked = true; throw new Error('Review ticks changed in another tab. Reload review ticks before saving.'); }
      const nextRaw = JSON.stringify(next); readReview(nextRaw); localStorage.setItem(REVIEW_KEY,nextRaw); raw=nextRaw;review=next;blocked=false;
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
      const schedule=appliesToYear?item.schedule:{kind:item.schedule?.kind||'undated',label:`Continuing duty — ${reviewYear} occurrence dates are not loaded. Open the source task for its timing rule.`};
      const signedOff = globalThis.WWHS_TASK_REVIEW.resolve(review.records,wing,item.recordKey || item.id,reviewYear,sydneyToday(),registerDate({schedule}));
      return {...item,schedule,inFocus:appliesToYear&&item.inFocus,reviewYear,key,tick:signedOff?tick:undefined,sourceComplete:appliesToYear&&item.complete&&!item.externallyReviewed,personalDone,reviewComplete:!!signedOff || appliesToYear&&item.complete || personalDone};
    });
  }
  function render() {
    if (!snapshot) return;
    const today=sydneyToday(), items=getItems(), query=search.value.trim().toLocaleLowerCase('en-AU');
    const filtered=items.filter(item=>matchesRegisterView(item,view.value,today)&&(!query||[item.title,item.area,item.owner,item.schedule?.label,...(item.gaps||[])].join(' ').toLocaleLowerCase('en-AU').includes(query)));
    for (const option of view.options) option.textContent=`${views[option.value]} (${items.filter(item=>matchesRegisterView(item,option.value,today)).length})`;
    summary.textContent=`Full ${label} task register · all dates`;
    counts.textContent=`Showing ${filtered.length} of ${items.length} entries for ${year.value==='all'?'all listed years':year.value}. ${snapshot.roleLabel || ''}${snapshot.roleLabel?'.':''}`;
    breakdown.textContent=`In the selected year / area: ${registerEntrySummary(items) || 'no entries'}.`;
    const datedYearLoaded=snapshot.items.some(item=>item.year===year.value&&registerDate(item));
    reviewNote.textContent=`${year.value!=='all'&&!datedYearLoaded?'No dated calendar is loaded for this year. Only continuing duties and other explicitly listed controls are shown. ':''}Reviewed complete signs off this task and all its applicable checklist steps, whether you used the card or completed the work elsewhere. The card shows a dated completion note and retains your existing notes. Untick to restore the earlier checklist. The date records your review, not when the work happened; evidence and verifier details are not invented. Each tick belongs to its labelled year and occurrence; 2026 ticks do not complete 2027 work. Ongoing duties still repeat.`;
    list.replaceChildren();
    if (!filtered.length) list.append(node('p','No entries match these filters. Try All entries or All listed years.'));
    for (const item of filtered) {
      const row=node('article',undefined,{class:`register-row${item.reviewComplete?' is-reviewed':''}`,'data-register-id':item.id});
      const main=node('div',undefined,{class:'register-row-main'});
      const title=node('a',item.title,{href:item.route});
      main.append(node('h3'));main.firstChild.append(title);
      main.append(node('p',[item.year==='ongoing'?`Ongoing duty · review ${item.reviewYear}`:item.year,entryLabels[registerEntryKind(item)][0],item.area,item.owner].filter(Boolean).join(' · '),{class:'register-meta'}));
      main.append(node('p',item.schedule?.label || 'Timing needs checking',{class:'register-timing'}));
      const date=registerDate(item), past=date&&date<today;
      const status=item.sourceComplete?`Workboard status: ${item.status}`:item.personalDone?'Done in your saved task list':item.tick?.completed?`Reviewed complete for ${item.reviewYear} · ${item.tick.reviewedOn}`:past?'Past date — review the record':item.historyOnly?'Historical record — review completion':item.inFocus?'Included in the current forecast':item.procedureOnly?'Procedure guide':item.schedule?.kind==='trigger'?'Bring forward when the trigger occurs':'Outside the current forecast';
      main.append(node('p',status,{class:'register-status'}));
      if(!item.reviewComplete&&item.gaps?.length){const gaps=node('details',undefined,{class:'register-gap'});gaps.append(node('summary',`${item.gaps.length} ${item.gaps.length===1?'check':'checks'} needed`));const ul=node('ul');item.gaps.forEach(gap=>ul.append(node('li',gap)));gaps.append(ul);main.append(gaps);}
      const control=node('label',undefined,{class:'register-tick'});
      const checkbox=node('input',undefined,{type:'checkbox','aria-label':`Reviewed complete for ${item.reviewYear}: ${item.title}`});
      checkbox.checked=item.reviewComplete;
      const future=item.reviewYear>Number(today.slice(0,4))||!!date&&date>today;
      checkbox.disabled=blocked||item.procedureOnly||item.sourceComplete||item.personalDone||future;
      checkbox.addEventListener('change',()=>{
        const completed=checkbox.checked;
        if(save({version:1,records:{...review.records,[item.key]:{completed,reviewedOn:today}}})) {message.textContent=completed?`Reviewed complete for ${item.reviewYear}: ${item.title}.`:`Review tick removed: ${item.title}.`;render();}
        else {checkbox.checked=!completed;checkbox.disabled=true;}
      });
      control.append(checkbox,node('span',item.procedureOnly?'Reference only':future?'Future work':item.sourceComplete?'Complete in workboard':item.personalDone?'Done in task list':`Reviewed complete · ${item.reviewYear}`));
      if(item.tick?.completed&&(item.sourceComplete||item.personalDone)){
        const remove=node('button','Remove review tick',{type:'button','aria-label':`Remove review tick: ${item.title}`});
        remove.disabled=blocked;
        remove.addEventListener('click',()=>{
          if(save({version:1,records:{...review.records,[item.key]:{completed:false,reviewedOn:today}}})) {message.textContent=`Review tick removed: ${item.title}. Its separately recorded completion is unchanged.`;render();}
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
