import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normaliseTaskHelpContext} from '../assets/js/task-help.mjs';

const dataScript = fs.readFileSync(new URL('../head-teacher-tas/assets/js/data.js', import.meta.url), 'utf8');
const appScript = fs.readFileSync(new URL('../head-teacher-tas/assets/js/app.js', import.meta.url), 'utf8');
const key = 'wwhs-head-teacher-tas-workboard:v2';
const reviewKey = 'wwhs-task-register-review:v1';
const reviewStore = (recordKey, completed = true, reviewedOn = '2026-09-17', year = 2026) => JSON.stringify({version:1,records:{[`tas:${year}:${encodeURIComponent(recordKey)}`]:{completed,reviewedOn}}});
const earlyReviewStore = (recordKey, completed = true, reviewedOn = '2026-09-17', year = 2026) => JSON.stringify({version:1,records:{[`tas:${year}:${encodeURIComponent(recordKey)}`]:{completed,reviewedOn,completedEarly:true}}});
const json = value => JSON.parse(JSON.stringify(value));
const sampleData = { window: {} };
vm.runInNewContext(dataScript, sampleData);
const tasks = sampleData.window.HT_TAS_WORKBOARD.tasks;
const completeRecord = task => ({
  status: 'completed', steps: Object.fromEntries(task.steps.map((_, i) => [i, true])),
  milestones: Object.fromEntries((task.milestones || []).map((_, i) => [i, true])),
  sourceChecked: true, doneConfirmed: true, updatedAt: '2026-09-16T01:00:00Z'
});
const saved = (records = {}, extra = {}) => JSON.stringify({ schemaVersion: 2, linkDefaultsVersion: 2, records, weekly: {}, links: {}, ...extra });

function harness(raw = null, options = {}) {
  let now = options.now || '2026-09-17T03:00:00Z';
  const storage = new Map(raw === null ? [] : [[key, raw]]);
  if (options.reviewRaw !== undefined) storage.set(reviewKey,options.reviewRaw);
  const documentHandlers = new Map(), windowHandlers = new Map(), nodes = new Map(), events = [];
  function element() {
    const handlers = new Map();
    return {
      innerHTML: '', textContent: '', hidden: false, open: false, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, removeAttribute() {}, focus() {}, remove() {}, scrollIntoView() {},
      appendChild(child) { this.children.push(child); },
      addEventListener(name, fn) { handlers.set(name, fn); },
      querySelector() { return null; }, querySelectorAll() { return []; },
      showModal() { this.open = true; },
      close() { this.open = false; handlers.get('close')?.(); }
    };
  }
  const getNode = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  const document = {
    body: element(), activeElement: null,
    getElementById(id) { return id === 'task-record-form' ? null : getNode(id); },
    querySelector(selector) { return getNode(selector); }, querySelectorAll() { return []; },
    createElement() { return element(); },
    addEventListener(name, fn) { documentHandlers.set(name, fn); }
  };
  const window = {
    addEventListener(name, fn) { windowHandlers.set(name, fn); },
    dispatchEvent(event) { events.push(event); windowHandlers.get(event.type)?.(event); },
    setTimeout() {}, scrollTo() {}, confirm() { return true; }, open() {}
  };
  const context = {
    window, document, location: new URL('https://example.edu/workboard/head-teacher-tas/'+(options.hash || '#my-work')), history: { replaceState() {} },
    URL, URLSearchParams, CSS: { escape: value => value },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    localStorage: {
      getItem(name) { if (options.readError) throw new Error('Unavailable'); return storage.get(name) ?? null; },
      setItem(name, value) { if (options.writeError) throw new Error('Full'); storage.set(name, value); },
      removeItem(name) { storage.delete(name); }
    },
    FileReader: class { readAsText(file) { this.result = file.text; this.onload(); } },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  };
  vm.createContext(context);
  vm.runInContext(dataScript, context);
  for(const file of ['../assets/js/data/task-source-links.js','../assets/js/task-sources.js']) {
    vm.runInContext(fs.readFileSync(new URL(file,import.meta.url),'utf8'),context);
  }
  vm.runInContext(fs.readFileSync(new URL('../assets/js/task-review.js', import.meta.url), 'utf8'), context);
  vm.runInContext(fs.readFileSync(new URL('../assets/js/task-navigation.js', import.meta.url), 'utf8'), context);
  vm.runInContext(appScript, context);
  function click(action, taskId) {
    const target = { dataset: { action, taskId }, closest(selector) { return selector === '[data-action]' ? this : null; } };
    documentHandlers.get('click')({ target });
  }
  return {
    adapter: window.WWHS_WORKBOARD_ADAPTER, storage, events, nodes, click, context,
    clickLink(href) {
      const link={href,target:'',dataset:{},focused:false,
        matches:selector=>selector==='a[href]',hasAttribute:()=>false,
        closest:selector=>selector==='a[href]'?link:null,
        focus(){this.focused=true;}};
      const event={target:link,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
      documentHandlers.get('click')(event);return {link,event};
    },
    advance(value) { now = value; window.dispatchEvent({ type: 'focus' }); },
    storageEvent() { window.dispatchEvent({ type: 'storage', key }); },
    reviewEvent() { window.dispatchEvent({ type: 'storage', key:reviewKey }); },
    toast: () => getNode('toast-region').children.map(item => item.textContent).join('\n'),
    restore(payload) { documentHandlers.get('change')({ target: { id: 'backup-file', matches: () => false, files: [{ text: JSON.stringify(payload) }] } }); }
  };
}

test('a clean TAS browser exposes no catalogue tasks; track actions do not change specialist records', () => {
  const h = harness();
  assert.deepEqual(json(h.adapter.getEntries()), []);
  const descriptor = h.adapter.describeTask('class-readiness');
  assert.equal(descriptor.recordKey, 'class-readiness::2026');
  assert.equal(descriptor.status, 'review');
  assert.equal(descriptor.route, '#task/class-readiness');
  h.click('track-task', 'class-readiness');
  assert.equal(h.events.at(-1).type, 'wwhs:track-task');
  assert.deepEqual(json(h.events.at(-1).detail), json(descriptor));
  assert.equal(h.storage.has(key), false);
  assert.deepEqual(json(h.adapter.getEntries()), []);
  assert.equal(h.nodes.get('route-content').innerHTML, '');
});

test('real source helper keeps every actionable TAS AI context bounded and excludes private overrides and evidence', () => {
  const links=Object.fromEntries(sampleData.window.HT_TAS_WORKBOARD.systems.map(system=>[system.id,`https://private.example.invalid/TAS-PRIVATE-${system.id}`]));
  const h=harness(saved({'annual-plan-alignment::2026':{status:'in-progress',exceptionReason:'TAS-PRIVATE-NOTE',evidenceRef:'TAS-PRIVATE-EVIDENCE',verifier:'TAS-PRIVATE-VERIFIER'}},{links}));
  const before=h.storage.get(key);
  for(const task of tasks){
    const descriptor=h.adapter.describeTask(task.id);
    if(task.historyOnly||task.procedureOnly){assert.equal(descriptor,null);continue;}
    const context=descriptor.taskHelp;
    assert.doesNotThrow(()=>normaliseTaskHelpContext(context),task.id);
    assert.equal(new Set(context.links.map(link=>link.url)).size,context.links.length,task.id+' deduplicates links');
    assert.doesNotMatch(JSON.stringify(context),/private\.example\.invalid|TAS-PRIVATE/);
  }
  assert.ok(h.adapter.describeTask('workshop-routine').taskHelp.links.some(link=>link.url.includes('/1r4TfBMm8cwgsqUtTRkCX25ofazCstjphwLLFr42foQ0/')),'Exact maintenance schedule reaches AI context');
  assert.equal(h.storage.get(key),before);
});

test('TAS task links open and close over the personal list without changing saved progress', () => {
  const raw=saved({'class-readiness::2026':{status:'in-progress',steps:{0:true}}}), h=harness(raw);
  const task=tasks.find(item=>item.id==='class-readiness'), underlying=h.nodes.get('route-content');
  underlying.innerHTML='Existing filtered list';
  const {event,link}=h.clickLink('#task/'+task.id);
  assert.equal(event.defaultPrevented,true);
  assert.equal(h.context.location.hash,'#my-work');
  assert.equal(h.nodes.get('task-dialog').open,true);
  assert.ok(h.nodes.get('task-dialog-content').innerHTML.includes(task.title));
  assert.equal(underlying.innerHTML,'Existing filtered list');
  h.click('close-task');
  assert.equal(h.nodes.get('task-dialog').open,false);
  assert.equal(h.context.location.hash,'#my-work');
  assert.equal(link.focused,true);
  assert.equal(h.storage.get(key),raw);
});

test('TAS saved occurrence links remain read-only and return to the same list', () => {
  const recordKey='class-readiness::2025', raw=saved({[recordKey]:completeRecord(tasks.find(item=>item.id==='class-readiness'))}), h=harness(raw);
  const {event}=h.clickLink('#task/class-readiness?record='+encodeURIComponent(recordKey));
  assert.equal(event.defaultPrevented,true);
  const html=h.nodes.get('task-dialog-content').innerHTML;
  assert.match(html,/Saved task record · read only/);
  assert.match(html,/<strong>Period:<\/strong> 2025/);
  assert.match(html,/<strong>Saved status:<\/strong> Task complete/);
  assert.doesNotMatch(html,/id="task-record-form"|data-task-step=/);
  h.click('close-task');
  assert.equal(h.context.location.hash,'#my-work');
  assert.equal(h.storage.get(key),raw);
});

test('saved occurrence identities and specialist status survive adapter conversion', () => {
  const annual = tasks.find(task => task.id === 'class-readiness');
  const h = harness(saved({
    'class-readiness::2025': completeRecord(annual),
    'class-readiness::2026': { status: 'in-progress', steps: { 0: true } },
    'workshop-routine::2026-09-07': { status: 'waiting', steps: {}, exceptionReason: 'Awaiting the owner response' },
    'workshop-routine::2026-09-14': { status: 'in-progress', steps: {} },
    'senior-monitoring::2026-t2': { status: 'in-progress', steps: {} },
    't1-year-opening-readiness::2026': { status: 'in-progress', steps: {} },
    'incident-response::current-event': { status: 'in-progress', steps: {} }
  }));
  const entries = h.adapter.getEntries();
  assert.equal(entries.length, 5);
  assert.equal(entries.find(e => e.recordKey === 'class-readiness::2025').status, 'done');
  assert.equal(entries.find(e => e.recordKey === 'class-readiness::2025').sourceStatus, 'completed');
  assert.equal(entries.find(e => e.recordKey === 'class-readiness::2026').action, annual.steps[1]);
  const waiting = entries.find(e => e.recordKey === 'workshop-routine::2026-09-07');
  assert.equal(waiting.status, 'waiting');
  assert.equal(waiting.notes, 'Awaiting the owner response');
  assert.equal(waiting.waitingOn, waiting.notes);
  assert.ok(entries.some(e => e.recordKey === 'senior-monitoring::2026-t2'));
});

test('next event retains the previous occurrence and persists a distinct current identity', () => {
  const task = tasks.find(task => task.id === 'excursion-workflow');
  const originalKey = `${task.id}::current-event`;
  const h = harness(saved({ [originalKey]: completeRecord(task) }));
  h.click('reset-occurrence', task.id);
  const next = h.adapter.describeTask(task.id);
  assert.match(next.recordKey, /^excursion-workflow::event-/);
  assert.equal(next.status, 'review');
  assert.equal(h.adapter.getEntries().find(e => e.recordKey === originalKey).status, 'done');
  assert.equal(h.adapter.getEntries().length, 2);
  assert.ok(h.events.some(e => e.type === 'wwhs:records-updated'));
  const reloaded = harness(h.storage.get(key));
  assert.equal(reloaded.adapter.describeTask(task.id).recordKey, next.recordKey);
  assert.equal(reloaded.adapter.getEntries().length, 2);
});

test('planning is absent for historical and protected procedures, including direct event requests', () => {
  const h = harness();
  for (const id of ['t1-year-opening-readiness', 'incident-response', 'mandatory-reporting-response', 'media-enquiry']) {
    assert.equal(h.adapter.describeTask(id), null);
    h.adapter.openTask(id);
    assert.doesNotMatch(h.nodes.get('task-dialog-content').innerHTML, /data-action="track-task"/);
    h.click('track-task', id);
  }
  assert.equal(h.events.filter(e => e.type === 'wwhs:track-task').length, 0);
  h.adapter.openTask('class-readiness');
  assert.match(h.nodes.get('task-dialog-content').innerHTML, /type="button" data-action="track-task"/);
});

test('another tab cannot be overwritten and failed saves do not manufacture source records', () => {
  const h = harness(saved());
  const newer = saved({ 'class-readiness::2026': { status: 'waiting', steps: {} } });
  h.storage.set(key, newer);
  h.click('complete-task', 'class-readiness');
  assert.equal(h.storage.get(key), newer);
  assert.deepEqual(json(h.adapter.getEntries()), []);
  assert.match(h.toast(), /changed in another tab/);
  assert.equal(h.events.filter(e => e.type === 'wwhs:records-updated').length, 0);
});

test('malformed, unreadable and quota-failed storage remains unchanged', () => {
  for (const [raw, options] of [['broken-json', {}], [saved(), { readError: true }], [saved(), { writeError: true }]]) {
    const h = harness(raw, options);
    h.click('complete-task', 'class-readiness');
    assert.equal(h.storage.get(key), raw);
    assert.deepEqual(json(h.adapter.getEntries()), []);
    assert.equal(h.events.filter(e => e.type === 'wwhs:records-updated').length, 0);
  }
});

test('native save emits the source update and keeps completion separate from verification', () => {
  const h = harness(saved());
  h.click('complete-task', 'class-readiness');
  const record = JSON.parse(h.storage.get(key)).records['class-readiness::2026'];
  assert.equal(record.status, 'completed');
  assert.notEqual(record.status, 'verified');
  assert.equal(h.adapter.getEntries()[0].status, 'done');
  assert.deepEqual(json(h.events.find(e => e.type === 'wwhs:records-updated').detail), { wing: 'tas' });
});

test('legacy restore keeps local links and new event identities, and refuses a stale overwrite', () => {
  const task = tasks.find(task => task.id === 'excursion-workflow');
  const payload = {
    kind: 'WWHS-HEAD-TEACHER-TAS-WORKBOARD-BACKUP', schemaVersion: 2,
    state: JSON.parse(saved({ [`${task.id}::event-example`]: completeRecord(task) }, { eventOccurrences: { [task.id]: 'event-example' } }))
  };
  const h = harness(saved({}, { links: { 'tas-drive': 'https://example.org/staff' } }));
  h.restore(payload);
  assert.equal(h.adapter.describeTask(task.id).recordKey, `${task.id}::event-example`);
  assert.equal(JSON.parse(h.storage.get(key)).links['tas-drive'], 'https://example.org/staff');
  assert.ok(h.events.some(e => e.type === 'wwhs:records-updated'));
  const blocked = harness(saved());
  const newer = saved({}, { guidance: false });
  blocked.storage.set(key, newer);
  blocked.restore(payload);
  assert.equal(blocked.storage.get(key), newer);
  assert.deepEqual(json(blocked.adapter.getEntries()), []);
});

test('fresh TAS forecast selects current assigned routines and nearby dates without writing records or importing the catalogue', () => {
  const h = harness();
  const forecast = h.adapter.getForecast();
  const ids = forecast.entries.map(entry => entry.taskId);
  assert.equal(forecast.context.mode, 'current');
  assert.equal(forecast.context.horizonDays, 21);
  assert.equal(forecast.context.termKey, '2026-t3');
  assert.equal(forecast.context.weekBeginning, '2026-09-14');
  assert.equal(forecast.context.schoolWeek, null);
  assert.equal(forecast.context.sourceAsAt, '2026-08-26');
  assert.equal(forecast.context.roleLabel, 'Head Teacher TAS');
  assert.match(forecast.context.note, /not configured/);
  for (const id of ['faculty-meeting-control', 'senior-monitoring', 'workshop-routine', 'subject-selection-cycle', 't3-year12-report-chain']) assert.ok(ids.includes(id), id);
  for (const id of ['class-readiness', 'excursion-workflow', 'incident-response', 't1-year-opening-readiness', 'vet-handoff', 't4-showcase', 't4-year11-report-chain', 'faculty-publications']) assert.ok(!ids.includes(id), id);
  assert.ok(ids.length < tasks.filter(task => !task.historyOnly && !task.procedureOnly).length / 2);
  assert.deepEqual(json(h.adapter.getForecast()), json(forecast));
  assert.deepEqual(json(h.adapter.getEntries()), []);
  assert.equal(h.storage.has(key), false);
});

test('forecast dates distinguish untouched past work, recorded overdue work and next milestones', () => {
  const fresh = harness().adapter.getForecast().entries;
  const past = fresh.find(entry => entry.taskId === 't3-info-evening');
  assert.equal(past.forecast.kind, 'past-date-review');
  assert.equal(past.forecast.section, 'ready');
  assert.equal(past.forecast.requiresConfirmation, true);
  assert.match(past.forecast.reason, /status not confirmed/);
  const report = fresh.find(entry => entry.taskId === 't3-year12-report-chain');
  assert.equal(report.forecast.scheduledDate, '2026-09-18');
  assert.equal(report.forecast.section, 'upcoming');
  assert.equal(report.dueDate, report.forecast.scheduledDate);
  const h = harness(saved({
    't3-info-evening::2026': { status: 'in-progress', steps: {} },
    't3-year12-report-chain::2026': { status: 'in-progress', steps: {}, milestones: { 0: true, 1: true, 2: true } }
  }));
  const entries = h.adapter.getForecast().entries;
  assert.equal(entries.find(entry => entry.taskId === 't3-info-evening').forecast.kind, 'overdue');
  const closure = entries.find(entry => entry.taskId === 't3-year12-report-chain');
  assert.equal(closure.forecast.kind, 'recorded-follow-up');
  assert.equal(closure.forecast.scheduledDate, '');
});

test('the forecast horizon is 21 days inclusive and does not manufacture dates for current routines', () => {
  const before = harness(null, { now: '2026-09-24T12:00:00' }).adapter.getForecast();
  const edge = harness(null, { now: '2026-09-25T12:00:00' }).adapter.getForecast();
  assert.ok(!before.entries.some(entry => entry.taskId === 't4-year11-report-chain'));
  assert.ok(edge.entries.some(entry => entry.taskId === 't4-year11-report-chain' && entry.forecast.scheduledDate === '2026-10-16'));
  const weekly = edge.entries.find(entry => entry.taskId === 'faculty-meeting-control');
  assert.equal(weekly.recordKey, 'faculty-meeting-control::2026-09-21');
  assert.equal(weekly.forecast.windowStart, '2026-09-21');
  assert.equal(weekly.forecast.windowEnd, '2026-09-27');
  assert.equal(weekly.forecast.scheduledDate, '');
  assert.equal(weekly.forecast.dateConfidence, 'undated');
  const closeDown = edge.entries.find(entry => entry.taskId === 'term-workshop-close');
  assert.equal(closeDown.forecast.section, 'upcoming');
  assert.equal(closeDown.forecast.scheduledDate, '');
  assert.match(closeDown.forecast.reason, /not configured/);
});

test('completed source occurrences leave the forecast while saved statuses remain resolvable', () => {
  const task = tasks.find(task => task.id === 'faculty-meeting-control');
  const h = harness(saved({ 'faculty-meeting-control::2026-09-14': completeRecord(task) }));
  assert.ok(!h.adapter.getForecast().entries.some(entry => entry.taskId === task.id));
  assert.equal(h.adapter.describeRecord('faculty-meeting-control::2026-09-14').status, 'done');
  assert.equal(h.adapter.describeRecord('faculty-meeting-control::2026-09-07'), null);
  assert.equal(h.adapter.describeRecord('__proto__'), null);
  h.advance('2026-09-21T12:00:00');
  assert.ok(h.adapter.getForecast().entries.some(entry => entry.recordKey === 'faculty-meeting-control::2026-09-21'));
  assert.equal(h.adapter.describeRecord('faculty-meeting-control::2026-09-14').status, 'done');
  assert.ok(h.events.some(event => event.type === 'wwhs:forecast-updated'));
});

test('unfinished historical occurrences and explicitly started events retain their own identities', () => {
  const h = harness(saved({
    'faculty-meeting-control::2026-09-07': { status: 'waiting', exceptionReason: 'Awaiting faculty response', steps: {} },
    'senior-monitoring::2026-t2': { status: 'in-progress', steps: {} },
    'excursion-workflow::event-started': { status: 'in-progress', steps: {} },
    'vet-handoff::2026-t3': { status: 'in-progress', steps: {} }
  }, { eventOccurrences: { 'excursion-workflow': 'event-started' } }));
  const entries = h.adapter.getForecast().entries;
  const waiting = entries.find(entry => entry.recordKey === 'faculty-meeting-control::2026-09-07');
  assert.equal(waiting.forecast.section, 'waiting');
  assert.equal(waiting.forecast.blocked, true);
  assert.equal(waiting.forecast.blockerReason, 'Awaiting faculty response');
  assert.ok(entries.some(entry => entry.recordKey === 'faculty-meeting-control::2026-09-14'));
  assert.ok(entries.some(entry => entry.recordKey === 'senior-monitoring::2026-t2'));
  assert.ok(entries.some(entry => entry.recordKey === 'excursion-workflow::event-started'));
  assert.ok(entries.some(entry => entry.recordKey === 'vet-handoff::2026-t3'));
  assert.ok(!entries.some(entry => entry.taskId === 'absence-cover'));
  assert.equal(new Set(entries.map(entry => entry.recordKey)).size, entries.length);
});

test('phase selection keeps 2026 separate and uses explicitly provisional 2027 occurrences only in their year', () => {
  const opening = harness(null, { now: '2026-02-02T12:00:00' }).adapter.getForecast();
  assert.ok(opening.entries.some(entry => entry.taskId === 'class-readiness'));
  assert.ok(opening.entries.some(entry => entry.taskId === 'whs-inspection'));
  assert.ok(!opening.entries.some(entry => entry.taskId === 'subject-selection-cycle'));
  const later = harness(null, { now: '2026-10-12T12:00:00' }).adapter.getForecast();
  assert.equal(later.context.termKey, '2026-t4');
  assert.ok(later.entries.some(entry => entry.taskId === 'faculty-publications'));
  assert.ok(!later.entries.some(entry => entry.taskId === 'subject-selection-cycle'));
  const nextYear = harness(null, { now: '2027-02-02T12:00:00' }).adapter.getForecast();
  assert.equal(nextYear.context.mode, 'current');
  assert.equal(nextYear.context.year, 2027);
  assert.equal(nextYear.context.sourceYear, 2026);
  const planned = nextYear.entries.find(entry => entry.taskId === '2027-t1-year-opening-readiness');
  assert.equal(planned.dueDate, '2027-02-02');
  assert.equal(planned.recordKey, '2027-t1-year-opening-readiness::2027');
  assert.equal(planned.forecast.dateConfidence, 'provisional');
  assert.match(planned.forecast.reason, /Provisional planning date/);
  assert.ok(nextYear.entries.every(entry => !entry.dueDate || entry.dueDate.startsWith('2027-')));
  assert.ok(opening.entries.every(entry => !entry.taskId.startsWith('2027-')));
  const unsupported = harness(null, {now:'2028-02-02T12:00:00'}).adapter.getForecast();
  assert.equal(unsupported.context.mode, 'reference-only');
  assert.deepEqual(json(unsupported.entries), []);
});

test('unreadable, malformed and externally changed native storage never yields a fresh-looking forecast', () => {
  for (const [raw, options] of [['broken-json', {}], [saved(), { readError: true }]]) {
    const h = harness(raw, options);
    const forecast = h.adapter.getForecast();
    assert.equal(forecast.context.mode, 'unavailable');
    assert.deepEqual(json(forecast.entries), []);
    assert.equal(h.storage.get(key), raw);
  }
  const h = harness(saved({ 'class-readiness::2026': { status: 'in-progress', steps: {} } }));
  h.storage.set(key, saved());
  h.storageEvent();
  assert.equal(h.adapter.getForecast().context.mode, 'unavailable');
  assert.deepEqual(json(h.adapter.getForecast().entries), []);
  assert.equal(h.adapter.describeRecord('class-readiness::2026'), null);
  assert.ok(h.events.some(event => event.type === 'wwhs:forecast-updated'));
});

test('overall review completes every TAS step and restores earlier progress when unticked', () => {
  const recordKey='class-readiness::2026', original={status:'in-progress',steps:{0:true},exceptionReason:'Keep <my> notes',evidenceRef:'ref-123',verifier:'Existing initials'};
  const raw=saved({[recordKey]:original}), h=harness(raw,{reviewRaw:reviewStore(recordKey)});
  const task=tasks.find(item=>item.id==='class-readiness');
  assert.equal(h.adapter.describeTask(task.id).status,'done');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.recordKey===recordKey).complete,true);
  h.adapter.openTask(task.id);
  const html=h.nodes.get('task-dialog-content').innerHTML;
  assert.equal([...html.matchAll(/<input[^>]*data-task-step=[^>]*checked disabled/g)].length,task.steps.length);
  assert.match(html,/Keep &lt;my&gt; notes/);assert.match(html,/Reviewed complete for 2026 on 2026-09-17/);
  assert.equal(h.storage.get(key),raw);
  h.click('close-task');h.storage.set(reviewKey,reviewStore(recordKey,false));h.reviewEvent();h.adapter.openTask(task.id);
  const reopened=h.nodes.get('task-dialog-content').innerHTML;
  assert.equal([...reopened.matchAll(/<input[^>]*data-task-step=[^>]*checked/g)].length,1);
  assert.doesNotMatch(reopened,/Reviewed complete for 2026/);
  assert.equal(h.storage.get(key),raw);
  assert.equal(h.adapter.describeTask(task.id).sourceStatus,'in-progress');
});

test('TAS reviews stay with their occurrence and year, including historical records and weekly scans', () => {
  const h=harness(null,{reviewRaw:reviewStore('faculty-meeting-control::2026-09-14')});
  assert.equal(h.adapter.describeTask('faculty-meeting-control').status,'done');
  h.advance('2026-09-21T03:00:00Z');
  assert.notEqual(h.adapter.describeTask('faculty-meeting-control').status,'done');
  const old=h.adapter.getTaskRegister().items.find(item=>item.recordKey==='faculty-meeting-control::2026-09-14');
  assert.equal(old.complete,true);h.clickLink(old.route);
  assert.match(h.nodes.get('task-dialog-content').innerHTML,/Reviewed complete for 2026/);
  const yearly=harness(null,{now:'2027-02-02T03:00:00Z',reviewRaw:reviewStore('class-readiness::2026')});
  assert.notEqual(yearly.adapter.describeTask('class-readiness').status,'done');
  const weekly=harness(null,{hash:'#today',reviewRaw:reviewStore('weekly-scan-0::2026-09-14')});
  assert.match(weekly.nodes.get('route-content').innerHTML,/data-weekly-check="0" checked/);
  assert.equal(weekly.adapter.getTaskRegister().items.find(item=>item.id==='weekly-scan-0').complete,true);
  weekly.advance('2026-09-21T03:00:00Z');
  assert.equal(weekly.adapter.getTaskRegister().items.find(item=>item.id==='weekly-scan-0').complete,false);
  assert.equal(weekly.adapter.getTaskRegister().items.find(item=>item.recordKey==='weekly-scan-0::2026-09-14').complete,true);
  assert.equal(weekly.storage.get(key),undefined);
});

test('TAS milestone sign-off covers the historical sequence without writing evidence or original dates', () => {
  const task=tasks.find(item=>item.milestones?.length && !item.procedureOnly);
  const h=harness(null,{now:'2026-12-30T03:00:00Z',reviewRaw:reviewStore(task.historyOnly ? task.id : task.id+'::2026',true,'2026-12-30')});
  const item=h.adapter.getTaskRegister().items.find(item=>item.id===task.id);
  assert.equal(item.complete,true);h.adapter.openTask(task.id);
  const html=h.nodes.get('task-dialog-content').innerHTML;
  assert.match(html,/Reviewed complete for 2026/);
  assert.equal(h.storage.get(key),undefined);
});

test('TAS rejects invalid, future and wrong-year reviews; native completion keeps its provenance', () => {
  for (const reviewRaw of ['bad',reviewStore('class-readiness::2026',true,'2026-02-30'),reviewStore('class-readiness::2026',true,'2026-09-18'),reviewStore('class-readiness::2026',true,'2026-09-17',2027)]) {
    const h=harness(null,{reviewRaw});
    assert.notEqual(h.adapter.describeTask('class-readiness').status,'done');
    assert.doesNotThrow(()=>h.adapter.getTaskRegister());
  }
  const h=harness(saved({'class-readiness::2026':completeRecord(tasks.find(item=>item.id==='class-readiness'))}),{reviewRaw:reviewStore('class-readiness::2026')});
  assert.equal(h.adapter.describeTask('class-readiness').sourceStatus,'completed');
});

test('explicit early TAS review covers later milestones and reverses without replacing native progress', () => {
  const id='t4-year11-report-chain', recordKey=id+'::2026';
  const native={status:'in-progress',steps:{0:true},milestones:{0:true},exceptionReason:'Keep <existing> notes',sourceChecked:false,doneConfirmed:false};
  const raw=saved({[recordKey]:native}), h=harness(raw,{reviewRaw:earlyReviewStore(recordKey)});
  assert.ok(tasks.find(task=>task.id===id).dueDate>'2026-09-17');
  assert.equal(h.adapter.describeTask(id).status,'done');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.recordKey===recordKey).complete,true);
  h.adapter.openTask(id);
  assert.match(h.nodes.get('task-dialog-content').innerHTML,/Task complete · reviewed/);
  assert.match(h.nodes.get('task-dialog-content').innerHTML,/Keep &lt;existing&gt; notes/);
  assert.equal(h.storage.get(key),raw);
  assert.equal(harness(raw,{reviewRaw:h.storage.get(reviewKey)}).adapter.describeTask(id).status,'done');
  h.click('close-task');h.storage.set(reviewKey,earlyReviewStore(recordKey,false));h.reviewEvent();
  assert.equal(h.adapter.describeTask(id).sourceStatus,'in-progress');
  assert.equal(h.adapter.describeTask(id).notes,native.exceptionReason);
  assert.equal(h.storage.get(key),raw);
});

test('explicit early TAS review supports one 2027 task without completing another cycle', () => {
  const id='2027-t1-year-opening-readiness', recordKey=id+'::2027';
  const raw=earlyReviewStore(recordKey,true,'2026-09-17',2027), h=harness(null,{reviewRaw:raw});
  assert.equal(h.adapter.describeTask(id).status,'done');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.recordKey===recordKey).complete,true);
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.id==='t1-year-opening-readiness').complete,false);
  const other=tasks.find(task=>task.provisionalSchedule&&task.id!==id);
  assert.notEqual(h.adapter.describeTask(other.id).status,'done');
  for(const reviewRaw of [reviewStore(recordKey,true,'2026-09-17',2027),earlyReviewStore(recordKey,true,'2026-09-18',2027),earlyReviewStore(recordKey,true,'2026-09-17',2026),raw.replace('"completedEarly":true','"completedEarly":"true"')]) {
    assert.notEqual(harness(null,{reviewRaw}).adapter.describeTask(id).status,'done');
  }
  const native=saved({[recordKey]:{...completeRecord(tasks.find(task=>task.id===id)),exceptionReason:'Native completion'}});
  const completed=harness(native,{reviewRaw:raw});
  assert.equal(completed.adapter.describeTask(id).sourceStatus,'completed');
  assert.equal(completed.adapter.describeTask(id).notes,'Native completion');
  assert.equal(completed.storage.get(key),native);assert.equal(h.storage.get(key),undefined);
});

test('explicit early TAS weekly review remains attached to its occurrence when the week advances', () => {
  const recordKey='faculty-meeting-control::2026-09-21', h=harness(null,{reviewRaw:earlyReviewStore(recordKey)});
  assert.notEqual(h.adapter.describeTask('faculty-meeting-control').status,'done');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.recordKey===recordKey).complete,true);
  h.advance('2026-09-21T03:00:00Z');
  assert.equal(h.adapter.describeTask('faculty-meeting-control').status,'done');
  h.advance('2026-09-28T03:00:00Z');
  assert.notEqual(h.adapter.describeTask('faculty-meeting-control').status,'done');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.recordKey===recordKey).complete,true);
  assert.equal(h.storage.get(key),undefined);
});

test('native changes emit forecast updates only after a successful save', () => {
  const h = harness();
  assert.ok(h.adapter.getForecast().entries.some(entry => entry.taskId === 'faculty-meeting-control'));
  h.click('complete-task', 'faculty-meeting-control');
  assert.ok(h.events.some(event => event.type === 'wwhs:forecast-updated'));
  assert.ok(!h.adapter.getForecast().entries.some(entry => entry.taskId === 'faculty-meeting-control'));
  const blocked = harness(null, { writeError: true });
  blocked.click('complete-task', 'faculty-meeting-control');
  assert.ok(!blocked.events.some(event => event.type === 'wwhs:forecast-updated'));
  assert.ok(blocked.adapter.getForecast().entries.some(entry => entry.taskId === 'faculty-meeting-control'));
});

test('planning dates persist in their own year and drive the register, forecast and restored backup', () => {
  const id = '2027-t1-year-opening-readiness';
  const original = {'t3-parent-teacher::2026':{status:'waiting',exceptionReason:'Keep this 2026 note',steps:{0:true}}};
  const schedule = {dueDate:'2027-02-10',milestones:[],confirmed:true,sourceNote:'Staff calendar checked'};
  const raw = saved(original,{scheduleOverrides:{[id]:schedule}});
  const h = harness(raw,{now:'2027-02-01T12:00:00'});
  assert.equal(h.adapter.describeTask(id).recordKey,`${id}::2027`);
  assert.equal(h.adapter.describeTask(id).dueDate,'2027-02-10');
  const row = h.adapter.getTaskRegister().items.find(item=>item.id===id);
  assert.equal(row.schedule.startDate,'2027-02-10');
  assert.equal(row.planningLabel,'Dates confirmed by you');
  assert.equal(row.complete,false);
  const forecast = h.adapter.getForecast().entries.find(item=>item.taskId===id);
  assert.equal(forecast.dueDate,'2027-02-10');
  assert.equal(forecast.forecast.dateConfidence,'listed');
  assert.equal(h.storage.get(key),raw,'Reading dates never rewrites saved data');
  const recovered = harness();
  recovered.restore({kind:'WWHS-HEAD-TEACHER-TAS-WORKBOARD-BACKUP',schemaVersion:2,state:JSON.parse(raw)});
  assert.equal(recovered.adapter.describeTask(id).dueDate,'2027-02-10');
  assert.equal(JSON.parse(recovered.storage.get(key)).records['t3-parent-teacher::2026'].exceptionReason,'Keep this 2026 note');
  recovered.click('clear-workspace');
  assert.equal(recovered.adapter.describeTask(id).dueDate,'2027-02-02','Clearing restores the baseline without requiring reload');
});

test('malformed planning schedules cannot change date years, milestone order or historical dates', () => {
  const id='2027-t3-year12-report-chain';
  const invalid=[
    {dueDate:'2026-08-28',milestones:['2027-08-28','2027-09-04','2027-09-18']},
    {dueDate:'2027-02-30',milestones:['2027-02-30','2027-09-04','2027-09-18']},
    {dueDate:'2027-08-28',milestones:['2027-08-28','2027-09-18','2027-09-04']},
    {dueDate:'2027-08-29',milestones:['2027-08-28','2027-09-04','2027-09-18']}
  ];
  for(const schedule of invalid){
    const raw=saved({}, {scheduleOverrides:{[id]:schedule,'t3-parent-teacher':{dueDate:'2026-09-09',milestones:[]}}});
    const h=harness(raw);
    assert.equal(h.adapter.describeTask(id).dueDate,'2027-08-28');
    assert.equal(h.adapter.describeTask('t3-parent-teacher').dueDate,'2026-09-01');
    assert.equal(h.storage.get(key),raw);
  }
});

test('2026 completion cannot complete the carried-forward 2027 task and a date change alone creates no task progress', () => {
  const task=tasks.find(item=>item.id==='t3-parent-teacher');
  const id='2027-t3-parent-teacher';
  const h=harness(saved({'t3-parent-teacher::2026':completeRecord(task)}, {scheduleOverrides:{[id]:{dueDate:'2027-09-03',milestones:[],confirmed:false}}}));
  const rows=h.adapter.getTaskRegister().items;
  assert.equal(rows.find(item=>item.id===task.id).complete,true);
  assert.equal(rows.find(item=>item.id===id).complete,false);
  assert.ok(!h.adapter.getEntries().some(item=>item.taskId===id));
  assert.ok(!h.adapter.getForecast().entries.some(item=>item.taskId===id));
});
