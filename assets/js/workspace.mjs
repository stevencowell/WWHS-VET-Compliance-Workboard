// One planning surface. Specialist records remain owned by their existing workboards.
import '../../morning-launchpad/assets/summary-import.mjs?v=work-count-1';
import {taskSection} from '../../morning-launchpad/assets/summary-core.mjs?v=task-help-1';

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
try { if (localStorage.getItem('morning-launchpad-theme') === 'dark') document.documentElement.dataset.theme = 'dark'; } catch {}
theme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('morning-launchpad-theme', next); } catch {}
  updateTheme();
});
updateTheme(); shell.append(home, nav, theme); document.body.prepend(shell);

let board, host, specialist, specialistSummary, forecastPanel, forecastHeading, forecastNote, forecastCount;
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
  welcome.append(el('p', `YOUR WORKSPACE · ${label}`, {class: 'eyebrow'}), el('h1', `${label}, with your day in view.`), el('p', 'Your scheduled duties and follow-ups appear here automatically. Review the next step and keep your notes with the work.'));
  forecastPanel = el('section', undefined, {class: 'workspace-forecast', 'aria-label': 'Scheduled work', 'aria-live': 'polite'});
  forecastHeading = el('h2', 'Checking the work schedule…');
  forecastNote = el('p', 'Using the dates, duties and recorded progress already held in this workboard.');
  forecastCount = el('p', '', {class: 'workspace-forecast-count'});
  const refreshForecast = el('button', 'Refresh schedule', {type: 'button', class: 'workspace-setup'});
  refreshForecast.addEventListener('click', () => enqueue(refreshScheduledWork));
  forecastPanel.append(forecastHeading, forecastNote, forecastCount, refreshForecast);
  board = el('summary-import', undefined, {'data-workstream': wing, id: 'shared-work'});
  // Staff routes do not initialise or migrate the personal work list.
  host.append(welcome, flow(), forecastPanel);
  specialist = el('details', undefined, {class: 'workspace-specialist'});
  specialistSummary = el('summary', `${label} tools, dates and recorded progress`);
  specialist.append(specialistSummary);
  const dashboard = document.getElementById('dashboard-access');
  const route = document.getElementById('route-content');
  specialist.append(dashboard, route); main.append(host, specialist);
  const routeNav = document.querySelector('.route-nav');
  const workLink = el('a', 'My work (personal)', {href: '#my-work', class: 'workspace-my-work'});
  routeNav.append(workLink);
  const topbar = document.querySelector('.topbar');
  if (wing === 'vet') topbar.append(el('button', 'Workspace setup', {type: 'button', 'data-action': 'open-settings', class: 'workspace-setup'}));
  // Keep staff destinations separate from the optional personal workspace.
  for (const link of routeNav.querySelectorAll('a')) {
    if (link.getAttribute('href') === '#today') link.textContent = `${label} follow-ups`;
    if (wing === 'tas' && link.getAttribute('href') === '#home') link.textContent = 'TAS wing';
  }
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
function routeChanged() {
  updateAreaNavigation();
  if (wing === 'launchpad') return;
  const hash = location.hash || '#home';
  const planning = hash === '#my-work';
  if (planning) ensureBoard();
  host.hidden = !planning;
  specialist.hidden = planning;
  specialist.classList.toggle('is-route', !planning);
  specialist.open = !planning;
  document.body.classList.toggle('workspace-planning', planning);
  if (planning) document.title = `My work (personal) · ${label}`;
  else if (wing === 'tas') document.title = staffTitle;
  document.querySelector('.workspace-my-work').setAttribute('aria-current', planning ? 'page' : 'false');
}
window.addEventListener('hashchange', () => { routeChanged(); enqueue(refreshScheduledWork); });
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
  if (added) board.say(`${added} recorded ${label} ${added === 1 ? 'follow-up is' : 'follow-ups are'} now in My work. Your original checklists and records are kept.`);
}
let forecastDeferred = false;
async function refreshScheduledWork() {
  const adapter = window.WWHS_WORKBOARD_ADAPTER;
  if (!adapter || wing === 'launchpad' || location.hash !== '#my-work' || !board.started) return;
  if (board.blocked) {
    forecastHeading.textContent = 'Schedule refresh paused';
    forecastNote.textContent = 'Reload saved work below before refreshing. Any text you are editing stays on this page.';
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
  const sourceGuard = {key: context.sourceStateKey, raw: localStorage.getItem(context.sourceStateKey)};
  const resolved = board.inbox.items.filter(item => item.origin?.wing === wing)
    .map(item => {
      const descriptor = adapter.describeRecord?.(item.origin.recordKey);
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
  forecastCount.textContent = `${context.roleLabel ? context.roleLabel + ' · ' : ''}As at ${context.date} · ${counts.ready} to review now · ${counts.upcoming} coming up · ${counts.waiting} waiting. Cards you finish or remove stay out of your active list.`;
  forecastPanel.dataset.ready = 'true';
}
window.addEventListener('wwhs:records-updated', () => enqueue(refreshScheduledWork));
window.addEventListener('wwhs:forecast-updated', () => enqueue(refreshScheduledWork));
window.addEventListener('wwhs:work-reloaded', () => enqueue(refreshScheduledWork));
board.addEventListener('focusout', () => { if (forecastDeferred) setTimeout(() => enqueue(refreshScheduledWork), 0); });
window.addEventListener('focus', () => enqueue(refreshScheduledWork));
document.addEventListener('visibilitychange', () => { if (!document.hidden) enqueue(refreshScheduledWork); });
let scheduleDay = new Date().toLocaleDateString('en-CA', {timeZone: 'Australia/Sydney'});
if (wing !== 'launchpad') setInterval(() => {
  const next = new Date().toLocaleDateString('en-CA', {timeZone: 'Australia/Sydney'});
  if (next !== scheduleDay) { scheduleDay = next; enqueue(refreshScheduledWork); }
}, 30000);
window.addEventListener('launchpad:open-calendar', () => {
  if (wing !== 'launchpad') { location.hash = '#my-work'; routeChanged(); board.showCalendar(true); }
});
window.addEventListener('storage', event => {
  if (event.key === 'morning-launchpad-theme') { document.documentElement.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light'; updateTheme(); }
});
window.addEventListener('storage', event => {
  if (wing !== 'launchpad' && event.key !== 'morning-launchpad-theme') enqueue(refreshScheduledWork);
});
enqueue(refreshScheduledWork);
