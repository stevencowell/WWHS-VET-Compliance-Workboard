const workStorage=()=>globalThis.WWHS_STORAGE||globalThis.localStorage;
// One planning surface. Specialist records remain owned by their existing workboards.
import '../../morning-launchpad/assets/summary-import.mjs?v=vet-admin-audit-20260924';
import {installWorkspaceBackup} from './workspace-backup-ui.mjs?v=vet-admin-audit-20260924';
import {INBOX_KEY, validateInbox, taskSection, todaySydney} from '../../morning-launchpad/assets/summary-core.mjs?v=vet-admin-audit-20260924';
import {createTaskRegister} from './task-register.mjs?v=vet-admin-audit-20260924';

const base = new URL('../../', import.meta.url);
const wing = document.body.dataset.workboard || 'launchpad';
const label = wing === 'launchpad' ? 'Launchpad' : wing.toUpperCase();
const staffTitle = document.title;
const el = (tag, text, attrs = {}) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

document.body.classList.add('shared-workspace');
const shell = el('header', undefined, {class: 'workspace-header'});
const home = el('a', undefined, {class: 'workspace-brand', href: new URL(wing === 'launchpad' ? 'morning-launchpad/' : './#home', base).href});
home.append(el('span', '◒', {'aria-hidden': 'true', class: 'workspace-mark'}), el('span', wing === 'launchpad' ? 'Daily Launchpad' : 'WWHS workboards'));
const nav = el('nav', undefined, {'aria-label': 'Workspace areas', class: 'workspace-areas'});
for (const [key, text, path] of [['home', 'Home', './#home'], ['launchpad', 'Launchpad', 'morning-launchpad/'], ['vet', 'VET', './#vet-home'], ['tas', 'TAS', 'head-teacher-tas/#home']]) {
  const link = el('a', text, {href: new URL(path, base).href, 'data-area': key});
  nav.append(link);
}
if (wing === 'launchpad') {
  nav.append(el('a', 'Finance', {href: new URL('finance/', base).href, 'data-area': 'finance'}));
}
function updateAreaNavigation() {
  const current = wing === 'vet' && (!location.hash || location.hash === '#home') ? 'home' : wing;
  for (const link of nav.querySelectorAll('a')) {
    if (link.dataset.area === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
updateAreaNavigation();
const theme = el('button', 'Dark appearance', {type: 'button', class: 'workspace-theme'});
function updateTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  theme.textContent = dark ? 'Light appearance' : 'Dark appearance';
  theme.setAttribute('aria-pressed', String(dark));
}
try { if (workStorage().getItem('morning-launchpad-theme') === 'dark') document.documentElement.dataset.theme = 'dark'; } catch {}
theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { workStorage().setItem('morning-launchpad-theme', next); window.dispatchEvent(new Event('launchpad:preferences-saved')); } catch {}
  updateTheme();
});
updateTheme(); shell.append(home, nav, theme); document.body.prepend(shell);

installWorkspaceBackup({header:shell});

let board, host, specialist, specialistSummary, forecastPanel, forecastHeading, forecastNote, forecastCount, fullRegister;
let requestedSection = null, sectionScrollFrame = 0;
const flow = () => {
  const strip = el('ol', undefined, {class: 'workspace-flow', 'aria-label': 'Your daily workflow'});
  for (const [heading, copy] of [['Review', 'Today, Soon or Waiting'], ['Choose', 'Pin what matters today'], ['Work & note', 'Open the task, then record your next step']]) {
    const item = el('li'); item.append(el('strong', heading), el('span', copy)); strip.append(item);
  }
  return strip;
};

if (wing !== 'launchpad') {
  const main = document.getElementById('main-content');
  host = el('section', undefined, {class: 'workspace-home', 'aria-label': `${label} assigned work and notes`});
  const welcome = el('div', undefined, {class: 'workspace-welcome'});
  welcome.append(el('p', `YOUR WORKSPACE · ${label}`, {class: 'eyebrow'}), el('h1', `${label}, with your day in view.`), el('p', 'Your tasks and follow-ups, with a place for notes.'));
  forecastPanel = el('section', undefined, {class: 'workspace-forecast', 'aria-label': 'Scheduled work', 'aria-live': 'polite'});
  forecastHeading = el('h2', 'Checking the work schedule…');
  forecastNote = el('p', 'Checking your task dates and saved progress.');
  forecastCount = el('p', '', {class: 'workspace-forecast-count'});
  const refreshForecast = el('button', 'Refresh schedule', {type: 'button', class: 'workspace-setup'});
  refreshForecast.addEventListener('click', () => enqueue(refreshScheduledWork));
  forecastPanel.append(forecastHeading, forecastNote, forecastCount, refreshForecast);
  board = el('summary-import', undefined, {'data-workstream': wing, 'data-scope': wing, id: 'shared-work'});
  fullRegister = createTaskRegister({wing,label,getAdapter:()=>window.WWHS_WORKBOARD_ADAPTER,getSavedItems:()=>board.inbox?.items||[]});
  const scopeNote = el('p',`This is your current task list. Open All ${label} tasks to see the full year.`,{class:'workspace-focus-note'});
  const sourceAccess = el('p',undefined,{class:'workspace-source-access'});
  sourceAccess.append(el('a','Task sources & 2027 checks →',{href:new URL(`task-sources/?wing=${wing}`,base).href}),el('span',' Source documents for the tasks and what to check for 2027.'));
  host.append(welcome, flow(), scopeNote, fullRegister.element, sourceAccess, forecastPanel);
  specialist = el('details', undefined, {class: 'workspace-specialist'});
  specialistSummary = el('summary', `${label} tools, dates and recorded progress`);
  specialist.append(specialistSummary);
  const dashboard = document.getElementById('dashboard-access');
  const route = document.getElementById('route-content');
  specialist.append(route); main.append(dashboard, host, specialist);
  const routeNav = document.querySelector('.route-nav');
  const workLink = el('a', 'My work (personal)', {href: '#my-work', class: 'workspace-my-work'});
  routeNav.append(workLink);
  const taskLink = el('a', `${label} tasks`, {href: wing === 'vet' ? '#vet-home' : '#home', class: 'workspace-task-link'});
  routeNav.append(taskLink);
  const registerLink = el('button', `All ${label} tasks`, {type:'button',class:'workspace-register-link'});
  registerLink.addEventListener('click',()=>{location.hash=wing==='vet'?'#vet-home':'#home';routeChanged();fullRegister.open('all');});
  routeNav.append(registerLink);
  const topbar = document.querySelector('.topbar');
  if (wing === 'vet') topbar.append(el('button', 'Workspace setup', {type: 'button', 'data-action': 'open-settings', class: 'workspace-setup'}));
  // Keep staff destinations separate from the optional personal workspace.
  for (const link of routeNav.querySelectorAll('a')) {
    if (link.getAttribute('href') === '#today') link.textContent = `${label} follow-ups`;
    if (wing === 'tas' && link.getAttribute('href') === '#home') link.textContent = 'TAS wing';
  }
  const everyday=el('div',undefined,{class:'workspace-nav-group',role:'group','aria-label':'Everyday work'});
  const reference=el('div',undefined,{class:'workspace-nav-group',role:'group','aria-label':'Planning and reference'});
  everyday.append(el('span','Everyday work',{class:'workspace-nav-label','aria-hidden':'true'}));
  reference.append(el('span','Planning & reference',{class:'workspace-nav-label','aria-hidden':'true'}));
  const homeLink=routeNav.querySelector(wing==='vet'?'[data-view="vet-home"]':'[data-route="home"]');
  for(const link of [homeLink,taskLink,registerLink,routeNav.querySelector('a[href="#today"]'),workLink])if(link)everyday.append(link);
  for(const link of [...routeNav.children]){
    const daily=['#workflows','#issues','#teaching','#faculty','#people'].includes(link.getAttribute('href'));
    (daily?everyday:reference).append(link);
  }
  routeNav.append(everyday,reference);
} else {
  await customElements.whenDefined('summary-import');
  board = document.querySelector('summary-import');
  if (!board) {
    board = await new Promise(resolve => {
      const observer = new MutationObserver(() => {
        const found = document.querySelector('summary-import');
        if (found) { observer.disconnect(); resolve(found); }
      });
      observer.observe(document.getElementById('root'), {childList: true, subtree: true});
    });
  }
  board.before(flow());
  // Personal planning stays the Launchpad default; All work still exposes every area.
  board.setWorkstream('personal');
}

function ensureBoard() {
  if (wing !== 'launchpad' && !board.isConnected) host.append(board);
}
function updateVetTaskCount() {
  if (wing === 'launchpad') return;
  const link = document.querySelector('.workspace-task-link');
  if (!link) return;
  // Count unfinished saved cards, independently of the complete source register.
  try {
    const items = validateInbox(workStorage().getItem(INBOX_KEY)).items;
    const today = todaySydney();
    const count = items.filter(item => item.workstream === wing && taskSection(item, today) !== 'done').length;
    link.textContent = `${label} tasks (${count})`;
    link.title = `Unfinished ${label} tasks saved in this browser. Completed tasks remain in Done.`;
  } catch {
    link.textContent = `${label} tasks`;
    link.title = 'The saved task count is unavailable. Open your personal work list to review it.';
  }
}
function routeChanged() {
  updateAreaNavigation();
  updateVetTaskCount();
  if (wing === 'launchpad') return;
  const hash = location.hash || '#home';
  const planning = hash === '#my-work';
  const wingHome = hash === (wing === 'vet' ? '#vet-home' : '#home');
  if (planning || wingHome) {
    board.scope = wingHome ? wing : null;
    ensureBoard();
    board.setScope(wingHome ? wing : null);
  }
  host.hidden = !planning && !wingHome;
  host.classList.toggle('workspace-wing-list', wingHome);
  if (planning || wingHome) fullRegister.refresh();
  document.getElementById('dashboard-access').hidden = planning || document.body.classList.contains('is-title');
  specialist.hidden = planning;
  specialist.classList.toggle('is-route', !planning);
  specialist.open = !planning;
  document.body.classList.toggle('workspace-planning', planning);
  if (planning) document.title = `My work (personal) · ${label}`;
  else if (wing === 'tas') document.title = staffTitle;
  document.querySelector('.workspace-my-work').setAttribute('aria-current', planning ? 'page' : 'false');
}
function scrollToRequestedSection() {
  const request=requestedSection;
  requestedSection=null;
  if(!request)return;
  cancelAnimationFrame(sectionScrollFrame);
  // Native route handlers render first. Scroll only for a selected menu link,
  // preserving deep links, browser history and the position beneath task dialogs.
  sectionScrollFrame=requestAnimationFrame(()=>{
    if(request.event.defaultPrevented||location.hash!==request.hash)return;
    const homeHash=wing==='vet'?'#vet-home':'#home';
    const target=request.tasks?board:request.hash==='#my-work'?host:request.hash===homeHash?document.getElementById('dashboard-access'):document.getElementById('route-content');
    if(!target?.getClientRects().length||target.hidden)return;
    const heading=target.querySelector('h1,h2');
    if(heading){if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  });
}
if(wing!=='launchpad')document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest?.('.route-nav a[href]');
  if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const next=new URL(link.href,location.href),current=new URL(location.href);
  if(next.origin!==current.origin||next.pathname!==current.pathname||next.search!==current.search||!next.hash||next.hash.startsWith('#task/'))return;
  requestedSection={hash:next.hash,tasks:link.classList.contains('workspace-task-link'),event};
  if(next.hash===location.hash)scrollToRequestedSection();
});
window.addEventListener('hashchange', () => { routeChanged(); scrollToRequestedSection(); enqueue(refreshScheduledWork); });
routeChanged();

// Serialise imports and clicks, including the async stable identity calculation.
let pending = Promise.resolve();
function enqueue(operation) {
  pending = pending.then(operation).catch(error => {
    if (forecastPanel) { forecastPanel.dataset.state = 'paused'; forecastPanel.dataset.ready = 'false'; forecastHeading.textContent = 'Schedule refresh paused'; forecastNote.textContent = error.message; }
    if (board.started) board.say(error.message, true);
  });
  return pending;
}
function reveal(item) {
  if (wing !== 'launchpad') {
    document.getElementById('task-dialog')?.close();
    location.hash = '#my-work';
    routeChanged();
  }
  board.showCalendar(false);
  if (typeof board.setWorkstream === 'function') board.setWorkstream(item.workstream || 'all');
  board.view = taskSection(item);
  board.openCards.add(item.id); board.expanded = true; board.renderItems();
  board.scrollIntoView({behavior: 'smooth', block: 'start'});
}
window.addEventListener('wwhs:track-task', event => {
  const descriptor = event.detail;
  // Adding a task is an explicit request to open the personal workspace.
  if (wing !== 'launchpad') { location.hash = '#my-work'; routeChanged(); }
  enqueue(async () => {
    const item = await board.trackWork(descriptor);
    reveal(item);
  });
});

// Record which source occurrences have been brought across. Deleting a personal
// card (including Clear all notes) must not resurrect it on the next visit.
async function bringRecordedWork({closedOnly = false} = {}) {
  const adapter = window.WWHS_WORKBOARD_ADAPTER;
  if (!adapter || board.blocked) return;
  let added = 0;
  for (const descriptor of adapter.getEntries()) {
    if (closedOnly && descriptor.status !== 'done') continue;
    const key = `${descriptor.wing}:${descriptor.recordKey}`;
    if (board.inbox.workboardImports.includes(key)) continue;
    await board.trackWork(descriptor, {silent: true});
    added++;
  }
  if (added) board.say(`${added} recorded ${label} ${added === 1 ? 'follow-up is' : 'follow-ups are'} now in My work. Your original records are unchanged.`);
}
let forecastDeferred = false;
async function refreshScheduledWork() {
  const adapter = window.WWHS_WORKBOARD_ADAPTER;
  if (!adapter || wing === 'launchpad' || host.hidden || !board.started) return;
  if (window.WWHS_TEAM_SESSION && !window.WWHS_TEAM_SESSION.isEditing()) {
    forecastHeading.textContent='Viewing shared progress';
    forecastNote.textContent='You are viewing the last backup opened. Open the latest backup for editing to make changes.';
    forecastCount.textContent='Use Open backup at the top.';
    forecastPanel.dataset.state='paused';
    return;
  }
  if (board.blocked) {
    forecastHeading.textContent = 'Schedule refresh paused';
    forecastNote.textContent = 'Reload saved work below first. Your unfinished text stays here.';
    forecastPanel.dataset.state = 'paused';
    return;
  }
  // Do not replace a card while its notes or controls are being edited.
  if (board.contains(document.activeElement)) { forecastDeferred = true; return; }
  forecastDeferred = false;
  const snapshot = adapter.getForecast?.();
  if (!snapshot) { await bringRecordedWork(); return; }
  const {context, entries} = snapshot;
  forecastHeading.textContent = context.title || `${label} scheduled work`;
  forecastNote.textContent = context.note || '';
  forecastPanel.dataset.state = context.mode;
  if (context.mode !== 'current') {
    board.setForecastAvailability(context);
    forecastCount.textContent = 'Your saved cards are kept. No new scheduled tasks were added.';
    return;
  }
  const sourceGuard = {key: context.sourceStateKey, raw: workStorage().getItem(context.sourceStateKey)};
  if (wing === 'vet') sourceGuard.reviewRaw = workStorage().getItem('wwhs-task-register-review:v1');
  const resolved = board.inbox.items.filter(item => item.origin?.wing === wing)
    .map(item => {
      const descriptor = adapter.describeRecord?.(item.origin.recordKey) || adapter.describeTask?.(item.origin.recordKey);
      if (descriptor) return descriptor;
      // An older manually added card may have no saved native checklist yet.
      // Enrich that exact occurrence without inventing a native progress record.
      const taskHelp = adapter.getHelpContext?.(item.origin.recordKey);
      return taskHelp ? {...item.origin, taskHelp, sourceStatus: taskHelp.sourceStatus} : null;
    }).filter(Boolean);
  const result = await board.syncForecast({...snapshot, resolved, sourceGuard});
  if (result.sourceChanged) {
    const unavailable = {...context, mode: 'unavailable', note: 'The source workboard changed during this refresh. Your saved cards are kept; copy any unsaved text, then reload the page.'};
    board.setForecastAvailability(unavailable);
    forecastPanel.dataset.state = 'unavailable';
    forecastNote.textContent = unavailable.note;
    forecastCount.textContent = 'No new scheduled tasks were added.';
    return;
  }
  if (result.deferred) { forecastDeferred = true; return; }
  board.setForecastAvailability(context);
  // Open records are already selected by the forecast's role/date rules. Only
  // closed history is migrated separately, so other roles cannot leak into Today.
  await bringRecordedWork({closedOnly: true});
  const counts = {ready: 0, upcoming: 0, waiting: 0};
  for (const item of board.inbox.items.filter(item => item.origin?.wing === wing && item.forecast?.active)) {
    const section = taskSection(item, context.date);
    if (Object.hasOwn(counts, section)) counts[section]++;
  }
  forecastCount.textContent = `${context.roleLabel ? context.roleLabel + ' · ' : ''}As at ${context.date} · ${counts.ready} to review now · ${counts.upcoming} coming up · ${counts.waiting} waiting. Finished or removed tasks stay off this list.`;
  forecastPanel.dataset.ready = 'true';
}
window.addEventListener('wwhs:records-updated', () => enqueue(refreshScheduledWork));
window.addEventListener('wwhs:forecast-updated', () => enqueue(refreshScheduledWork));
window.addEventListener('wwhs:work-reloaded', () => enqueue(refreshScheduledWork));
window.addEventListener('wwhs:work-saved', updateVetTaskCount);
window.addEventListener('wwhs:work-reloaded', updateVetTaskCount);
for (const eventName of ['wwhs:records-updated','wwhs:forecast-updated','wwhs:work-saved','wwhs:work-reloaded']) window.addEventListener(eventName,()=>fullRegister?.refresh());
board.addEventListener('focusout', () => { if (forecastDeferred) setTimeout(() => enqueue(refreshScheduledWork), 0); });
window.addEventListener('focus', () => enqueue(refreshScheduledWork));
document.addEventListener('visibilitychange', () => { if (!document.hidden) enqueue(refreshScheduledWork); });
let scheduleDay = new Date().toLocaleDateString('en-CA', {timeZone: 'Australia/Sydney'});
if (wing !== 'launchpad') setInterval(() => {
  const next = new Date().toLocaleDateString('en-CA', {timeZone: 'Australia/Sydney'});
  if (next !== scheduleDay) { scheduleDay = next; updateVetTaskCount(); enqueue(refreshScheduledWork); }
}, 30000);
window.addEventListener('launchpad:open-calendar', () => {
  if (wing !== 'launchpad') { location.hash = '#my-work'; routeChanged(); board.showCalendar(true); }
});
window.addEventListener('storage', event => {
  if (event.key === 'morning-launchpad-theme') { document.documentElement.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light'; updateTheme(); }
});
window.addEventListener('storage', event => {
  if (event.key === INBOX_KEY || event.key === null) updateVetTaskCount();
  if (wing !== 'launchpad' && event.key !== 'morning-launchpad-theme') enqueue(refreshScheduledWork);
});
enqueue(refreshScheduledWork);
// Reveal the completed layout, including any existing saved-work recovery UI.
// Forecast refreshes continue independently; no extra loading delay is added.
window.WWHS_WORKSPACE_BOOT?.ready();
