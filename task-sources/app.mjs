import { orderTasks, taskGroup } from './model.mjs?v=wing-numbering-1';

const byId = id => document.getElementById(id);
const views = ['tasks', 'sources', 'watch', 'findings'];
const labels = {
  'specific-citation': 'Specific source found',
  'broad-source-only': 'Exact source needed',
  'inferred-local-control': 'School checklist',
};
const sourceAliases = {
  'PUBLIC-NESA-TOA': 'NESA-TOA-2026-MAY',
  'PUBLIC-NESA-BEC-APPLICATION': 'NESA-BEC-APPLICATION',
  'PUBLIC-ACE-14-2': 'NESA-VET-ENTRIES',
};
let data, rows, sources, findingsByTask;
let activeView = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'tasks';
let selectedTask = null;
let focusedTaskId = new URL(location.href).searchParams.get('task') || '';

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${text(item)}`).join('\n');
  return String(value);
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content != null) node.textContent = text(content);
  return node;
}

function sourceLink(url, title) {
  let safe = false;
  try { const parsed = new URL(url); safe = parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { /* Show the title without a link. */ }
  const node = element(safe ? 'a' : 'span', '', title || 'Source location to confirm');
  if (safe) { node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
}

function addField(parent, heading, content) {
  if (!text(content)) return;
  parent.append(element('dt', '', heading), element('dd', '', content));
}

function matchesQuery(value) {
  const query = byId('search').value.trim().toLocaleLowerCase('en-AU');
  return !query || text(value).toLocaleLowerCase('en-AU').includes(query);
}

function taskKey(row) { return row.rowKey || `${row.wing}:${row.id}`; }
function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function taskFindings(row) { return findingsByTask.get(taskKey(row)) || []; }
function selectedWingRows() { return rows.filter(row => !byId('wing').value || row.wing === byId('wing').value); }
function sourceIdsForWing() { return new Set(selectedWingRows().flatMap(row => row.sourceIds || [])); }
function wingMatchesFinding(finding) {
  const wing = byId('wing').value;
  return !wing || !finding.wing || String(finding.wing).toUpperCase().includes(wing) || (finding.taskIds || []).some(id => selectedWingRows().some(row => row.id === id || taskKey(row) === id));
}

function countMessage(count, noun, suffix = '') {
  byId('result-count').textContent = `${count} ${noun}${suffix}`;
}

function empty(container, message = 'No matches. Try another keyword or reset the filters.') {
  if (!container.childElementCount) container.append(element('p', 'empty', message));
}

function reviewButton(row, count) {
  const note = element('div', 'review-action');
  note.append(element('strong', '', `Review needed · ${count} ${count === 1 ? 'finding' : 'findings'}`));
  const button = element('button', 'small-button', 'See what needs checking');
  button.type = 'button';
  button.setAttribute('aria-label', `See what needs checking for ${row.title}`);
  button.addEventListener('click', () => {
    selectedTask = row;
    byId('search').value = '';
    setView('findings');
    byId('tab-findings').focus();
  });
  note.append(button);
  return note;
}

function taskCard(row, position) {
  const clarity=window.WWHS_TASK_CLARITY?.describe(row.wing,row);
  const related = taskFindings(row);
  const card = element('article', `card${related.length ? ' review-needed' : ''}`);
  const tags = element('div', 'tags');
  tags.append(element('span', 'tag', row.wing), element('span', `tag${row.provenanceStatus === 'specific-citation' ? '' : ' review'}`, labels[row.provenanceStatus] || row.provenanceStatus));
  card.append(tags, element('h3', '', `${position}. ${clarity?.title||row.title}`));
  if(clarity?.purpose)card.append(element('p','task-clarity-purpose',clarity.purpose));
  const timing = element('p', 'task-timing');
  timing.append(element('span', 'date-label', 'When: '), document.createTextNode(row.timing2026 || 'Timing to confirm'));
  card.append(timing);
  if (row.due2026) {
    card.append(element('p', 'task-timing', `Recorded due date: ${formatDate(row.due2026)}`));
  }
  if (related.length) card.append(reviewButton(row, related.length));
  const details = element('details', 'details');
  if (focusedTaskId === row.id) details.open = true;
  details.append(element('summary', '', 'Source and 2027 check'));
  if(clarity?.title&&clarity.title!==row.title)details.append(element('p','muted',`Recorded title: ${row.title}`));
  const grid = element('div', 'detail-grid');
  for (const fields of [
    [['Why it appears', row.sourceBasis], ['Gap or correction', row.sourceGap || 'No other gap noted.']],
    [['What to check for 2027', row.nextYearCheck], ['When to check', row.checkWhen]],
  ]) {
    const column = element('div');
    fields.forEach(([heading, content]) => column.append(element('h4', '', heading), element('p', '', content || 'Check the current source first.')));
    grid.append(column);
  }
  details.append(grid);
  if (Array.isArray(row.milestones2026) && row.milestones2026.length) {
    const milestones = element('div', 'source-evidence');
    milestones.append(element('h4', '', '2026 key dates'));
    const list = element('ul', 'milestone-list');
    for (const milestone of row.milestones2026) {
      const item = element('li');
      item.append(element('strong', '', formatDate(milestone.date)), document.createTextNode(` · ${milestone.label || 'Milestone'}`));
      list.append(item);
    }
    milestones.append(list);
    details.append(milestones);
  }
  for (const reference of row.evidenceRefs || []) {
    const block = element('div', 'source-evidence');
    const heading = element('h4');
    heading.append(sourceLink(reference.url, reference.linkTitle || reference.title || reference.id));
    block.append(heading, element('p', 'source-id', reference.id), element('p', '', reference.relationship || 'Supporting source'), element('p', '', reference.locator || 'Exact source section still needed.'), element('p', 'muted', reference.verification || 'Check that this is the latest version.'));
    if (reference.statusNote) block.append(element('p', 'muted', reference.statusNote));
    details.append(block);
  }
  if (!(row.evidenceRefs || []).length) details.append(element('p', 'muted', 'The exact source for this task is still needed.'));
  details.append(element('p', 'source-id', `Task reference: ${row.id}`));
  card.append(details);
  return card;
}

function renderTasks() {
  const period = byId('period').value;
  const status = byId('status').value;
  const filtered = selectedWingRows().filter(row => (!focusedTaskId || row.id === focusedTaskId) && (!period || row.phaseLabel === period)
    && (!status || (status === 'review-needed' ? taskFindings(row).length : row.provenanceStatus === status))
    && matchesQuery([row.title, window.WWHS_TASK_CLARITY?.describe(row.wing,row).title, row.timing2026, row.sourceIds, row.sourceBasis, row.sourceGap, row.nextYearCheck, row.evidenceRefs]));
  const container = byId('task-list');
  container.replaceChildren();
  const groups = new Map();
  for (const row of filtered) {
    const name = `${row.wing} · ${taskGroup(row)}`;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  for (const [name, groupRows] of groups) {
    const section = element('section', 'task-group');
    const heading = element('div', 'group-heading');
    heading.append(element('h2', '', name), element('span', '', `${groupRows.length} ${groupRows.length === 1 ? 'entry' : 'entries'}`));
    const cards = element('div', 'card-list');
    groupRows.forEach(row => cards.append(taskCard(row, row.order)));
    section.append(heading, cards);
    container.append(section);
  }
  countMessage(filtered.length, 'of '+rows.length+' loaded entries', byId('wing').value ? ` · ${byId('wing').value}` : ' · VET and TAS');
  empty(container);
}

function sourceCard(source) {
  const card = element('article', 'card');
  const tags = element('div', 'tags');
  tags.append(element('span', 'tag', String(source.group || 'Source record').replace(/^\d+\s+/, '')));
  const title = element('h3'); title.append(sourceLink(source.url, source.linkTitle || source.title));
  card.append(tags, title, element('p', 'muted', `${source.taskCount || 0} tasks use this source.`));
  const more = element('details', 'details');
  more.append(element('summary', '', 'Checks and source details'));
  const details = element('dl', 'source-details');
  addField(details, 'Record type', source.countingUnit);
  addField(details, 'What was checked', source.verification || 'Check the original document and its current version.');
  if (source.liveVerification && source.liveVerification !== source.verification) addField(details, 'Latest public check', source.liveVerification);
  addField(details, 'Current edition', source.currentEdition);
  addField(details, '2027 availability', source.status2027);
  addField(details, 'Next check', source.nextYearCheck || 'Find the current approved version before use.');
  addField(details, 'Check when', source.checkWhen || 'Before affected work and whenever the source changes.');
  more.append(details, element('p', 'source-id', source.id));card.append(more);
  return card;
}

function renderSources() {
  const ids = sourceIdsForWing();
  const filtered = data.sources.filter(source => (!byId('wing').value || ids.has(source.id)) && matchesQuery([source.title, source.id, source.group, source.verification, source.nextYearCheck, source.status2027]));
  const container = byId('source-list'); container.replaceChildren();
  filtered.forEach(source => container.append(sourceCard(source)));
  const totals = new Map();
  filtered.forEach(source => totals.set(source.countingUnit || 'Other source record', (totals.get(source.countingUnit || 'Other source record') || 0) + 1));
  byId('source-totals').replaceChildren();
  for (const [label, count] of totals) {
    const item = element('div', 'source-total');
    item.append(element('strong', '', count), document.createTextNode(label));
    byId('source-totals').append(item);
  }
  countMessage(filtered.length, `of ${data.sources.length} source records`, byId('wing').value ? ` · linked to ${byId('wing').value} tasks` : ' · both sections and additional checking sources');
  empty(container);
}

function renderWatch() {
  const ids = sourceIdsForWing();
  const filtered = data.watch.filter(item => (!byId('wing').value || (item.sourceIds || []).some(id => ids.has(id))) && matchesQuery([item.group, item.checkWhen, item.action, (item.sourceIds || []).map(id => sources.get(id)?.title || id)]));
  const container = byId('watch-list'); container.replaceChildren();
  for (const item of filtered) {
    const card = element('article', 'card');
    card.append(element('h3', '', item.group.replace(/^\d+\s+/, '')));
    const details = element('dl', 'source-details');
    addField(details, 'Check when', item.checkWhen);
    addField(details, 'What to do', item.action);
    addField(details, 'About these dates', item.scheduleBasis);
    card.append(details);
    const sourceDetails = element('details', 'details');
    sourceDetails.append(element('summary', '', 'Source locations and 2027 availability'));
    const list = element('ul', 'source-links');
    for (const id of item.sourceIds || []) {
      const source = sources.get(id);
      const listItem = element('li');
      listItem.append(sourceLink(source?.url, source?.title || id));
      if (source?.status2027) listItem.append(element('p', 'muted', source.status2027));
      list.append(listItem);
    }
    sourceDetails.append(list); card.append(sourceDetails); container.append(card);
  }
  countMessage(filtered.length, `of ${data.watch.length} checking areas`, byId('wing').value ? ` · includes sources linked to ${byId('wing').value}` : ' · recommended checking plan');
  empty(container);
  const published = byId('published-list'); published.replaceChildren();
  for (const item of data.published2027 || []) {
    if (!matchesQuery([item.topic, item.applicability, item.pinpoint, item.status])) continue;
    const card = element('article', 'card');
    card.append(element('h3', '', item.topic));
    const details = element('dl', 'source-details');
    addField(details, 'Dates / availability', item.dateStart ? `${formatDate(item.dateStart)} to ${formatDate(item.dateEnd)}` : formatDate(item.date) || item.status);
    addField(details, 'Applies to', item.applicability || 'Check the current source and your school’s responsibilities before acting.');
    addField(details, 'Exact location', item.pinpoint);
    card.append(details);
    const source = sources.get(sourceAliases[item.sourceId] || item.sourceId);
    const paragraph = element('p'); paragraph.append(sourceLink(source?.url, source?.title || item.sourceId)); card.append(paragraph);
    published.append(card);
  }
  empty(published, 'No published information matches that search. Clear the search to see all 2027 notices recorded in the audit.');
}

function renderFindings() {
  const selectedFindings = selectedTask ? new Set(taskFindings(selectedTask)) : null;
  const filtered = data.findings.filter(finding => wingMatchesFinding(finding) && (!selectedFindings || selectedFindings.has(finding)) && matchesQuery([finding.title, finding.issue, finding.action, finding.evidence, finding.taskIds]));
  const selection = byId('finding-selection');
  selection.replaceChildren(); selection.hidden = !selectedTask;
  if (selectedTask) {
    selection.append(element('span', '', `Findings for: ${selectedTask.title}`));
    const button = element('button', 'small-button', 'Show all findings'); button.type = 'button';
    button.addEventListener('click', () => { selectedTask = null; render(); });
    selection.append(button);
  }
  const container = byId('finding-list'); container.replaceChildren();
  for (const finding of filtered) {
    const card = element('article', 'card review-needed');
    const tags = element('div', 'tags');
    tags.append(element('span', 'tag', finding.wing || 'VET / TAS'), element('span', 'tag review', finding.certainty || 'Review finding'));
    card.append(tags, element('h3', '', finding.title || finding.issue || 'Source review needed'));
    const details = element('dl', 'source-details');
    if (finding.title && finding.issue !== finding.title) addField(details, 'What needs checking', finding.issue);
    addField(details, 'Next step', finding.action);
    card.append(details);
    const evidence = element('details', 'details'), evidenceFields = element('dl', 'source-details');
    evidence.append(element('summary', '', 'Sources and affected tasks'));
    addField(evidenceFields, 'Source evidence', finding.evidence);
    addField(evidenceFields, 'Affected tasks', finding.taskIds);
    evidence.append(evidenceFields);card.append(evidence);
    if (finding.sourceUrl) { const paragraph = element('p'); paragraph.append(sourceLink(finding.sourceUrl, 'Open supporting source')); card.append(paragraph); }
    if (finding.id) evidence.append(element('p', 'source-id', `Finding reference: ${finding.id}`));
    container.append(card);
  }
  countMessage(filtered.length, `of ${data.findings.length} review findings`, ' · check current sources and remaining follow-ups');
  empty(container);
}

function render() {
  if (!data) return;
  document.documentElement.dataset.wing = byId('wing').value.toLowerCase() || 'both';
  ({ tasks: renderTasks, sources: renderSources, watch: renderWatch, findings: renderFindings })[activeView]();
}

function setView(view, updateLocation = true) {
  activeView = views.includes(view) ? view : 'tasks';
  for (const name of views) {
    const selected = name === activeView;
    byId(`tab-${name}`).setAttribute('aria-selected', String(selected));
    byId(`tab-${name}`).tabIndex = selected ? 0 : -1;
    byId(`panel-${name}`).hidden = !selected;
  }
  document.querySelectorAll('[data-task-filter]').forEach(node => { node.hidden = activeView !== 'tasks'; });
  if (updateLocation) {
    const url = new URL(location.href); url.hash = activeView;
    history.replaceState(null, '', url);
  }
  render();
}

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => { selectedTask = null; setView(button.dataset.view); });
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = views.indexOf(activeView);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
    selectedTask = null; setView(views[next]); byId(`tab-${views[next]}`).focus();
  });
});
document.querySelectorAll('[data-view-link]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); selectedTask = null; setView(link.dataset.viewLink); byId(`tab-${activeView}`).focus(); }));
byId('wing').addEventListener('change', () => {
  selectedTask = null;
  focusedTaskId = '';
  const url = new URL(location.href);
  url.searchParams.delete('task');
  if (byId('wing').value) url.searchParams.set('wing', byId('wing').value.toLowerCase()); else url.searchParams.delete('wing');
  history.replaceState(null, '', url);
  render();
});
for (const id of ['period', 'status']) byId(id).addEventListener('change', render);
byId('search').addEventListener('input', render);
byId('reset').addEventListener('click', () => {
  for (const id of ['period', 'status', 'search']) byId(id).value = '';
  selectedTask = null; focusedTaskId = '';
  const url=new URL(location.href);url.searchParams.delete('task');history.replaceState(null,'',url);
  render();
});
window.addEventListener('hashchange', () => setView(location.hash.slice(1), false));

async function initialise() {
  try {
    const response = await fetch('./data.json?v=vet-admin-audit-20260924');
    if (!response.ok) throw new Error('Source register unavailable');
    data = await response.json();
    if (![data.rows, data.sources, data.watch, data.findings].every(Array.isArray)) throw new Error('Source register incomplete');
    rows = orderTasks(data.rows);
    sources = new Map(data.sources.map(source => [source.id, source]));
    findingsByTask = new Map();
    for (const row of rows) {
      const related = data.findings.filter(finding => {
        const ids = finding.taskIds || [];
        const sameWing = !finding.wing || String(finding.wing).toUpperCase().includes(row.wing);
        return ids.includes(taskKey(row)) || (sameWing && ids.includes(row.id));
      });
      if (related.length) findingsByTask.set(taskKey(row), related);
    }
    const wing = (new URL(location.href).searchParams.get('wing') || '').toUpperCase();
    byId('wing').value = ['VET', 'TAS'].includes(wing) ? wing : '';
    for (const period of [...new Set(rows.map(row => row.phaseLabel).filter(Boolean))]) byId('period').append(new Option(period, period));
    for (const [number, label] of [[data.counts.vet2026, 'VET tasks'], [data.counts.tas2026, 'TAS entries'], [data.counts.sourceRecords, 'Source records'], [data.counts.sourceFamilies, 'Checking areas']]) {
      const metric = element('div', 'metric'); metric.append(element('strong', '', number), document.createTextNode(label)); byId('metrics').append(metric);
    }
    setView(activeView, false);
  } catch {
    byId('error').hidden = false;
    byId('error').textContent = 'Could not load the sources. Refresh this page and try again.';
    byId('result-count').textContent = 'Source register unavailable';
  }
}

initialise();
