import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scripts = ['data', 'step-guidance', 'app'].map(name => fs.readFileSync(new URL(`../head-teacher-tas/assets/js/${name}.js`, import.meta.url), 'utf8'));
scripts[0] += '\n' + fs.readFileSync(new URL('../head-teacher-tas/assets/js/guidance-destinations.js', import.meta.url), 'utf8');
scripts[0] += '\n' + fs.readFileSync(new URL('../assets/js/task-review.js', import.meta.url), 'utf8');
const fixture = { window: {} };
vm.runInNewContext(scripts[0], fixture);
vm.runInNewContext(scripts[1], fixture);
const data = fixture.window.HT_TAS_WORKBOARD;
const guidance = fixture.window.TAS_STEP_GUIDANCE;
const copy = value => JSON.parse(JSON.stringify(value));
const task = id => data.tasks.find(item => item.id === id);
const ids = (id, step) => copy(guidance.forStep(task(id), step)).map(item => item.systemId).filter(Boolean);

test('every native TAS action, source and weekly scan has an explicit maintained route or in-person instruction', () => {
  const before = JSON.stringify(data);
  for (const item of data.tasks) {
    assert.ok(guidance.hasPlan(item.id), item.id);
    item.steps.forEach((step, index) => {
      assert.ok(guidance.hasPlan(item.id, index), `${item.id} step ${index + 1} needs explicit guidance`);
      const links = guidance.forStep(item, index);
      assert.ok(links.length, `${item.id} step ${index + 1}`);
      for (const link of links) {
        assert.ok(link.hint, `${item.id} step ${index + 1} needs useful wayfinding`);
        if (!link.systemId) continue;
        const system = data.systems.find(value => value.id === link.systemId);
        assert.ok(system, `${link.systemId} must be an existing destination`);
        assert.equal(new URL(system.url).protocol, 'https:');
        assert.ok(link.label);
        if (system.url.includes('/drive/search?')) {
          assert.match(link.label, /Find.*Drive/);
          assert.match(link.hint, /Drive search/);
        }
      }
    });
    assert.ok(guidance.forSource(item).length);
    if (item.milestones?.length) assert.ok(guidance.forMilestone(item).some(link => link.systemId === 'staff-calendar'));
  }
  data.weeklyChecks.forEach((_, index) => assert.ok(guidance.forWeekly(index).length));
  assert.equal(JSON.stringify(data), before, 'describing links must never mutate task text or progress');
});

test('source selection follows the step, including precise official rules and practical declarations', () => {
  assert.deepEqual(ids('annual-calendar-control', 0), ['staff-calendar', 'nesa-actions']);
  assert.deepEqual(ids('annual-calendar-control', 3), ['staff-calendar', 'sentral']);
  assert.deepEqual(ids('assessment-governance', 1), ['nesa-assessment-rules', 'nesa-curriculum']);
  assert.deepEqual(ids('program-currency', 0), ['nesa-curriculum']);
  assert.deepEqual(ids('program-currency', 1), ['program-register']);
  assert.ok(ids('hsc-practical-certification-handoff', 1).includes('schools-online'));
  assert.ok(guidance.forStep(task('hsc-practical-certification-handoff'), 1).some(item => /Memos and documents/.test(item.hint)));
  assert.ok(ids('n-warning-response', 0).includes('nesa-course-non-completion'));
  assert.deepEqual(ids('n-warning-response', 1), ['sentral']);
  assert.deepEqual(ids('workshop-routine', 1), ['onguard']);
  assert.ok(ids('workshop-routine', 2).includes('workshop-maintenance'));
  assert.match(guidance.forStep(task('excursion-workflow'), 0)[0].hint, /C18/);
  assert.deepEqual(ids('mandatory-reporting-response', 0), []);
  assert.match(guidance.forStep(task('mandatory-reporting-response'), 0)[0].hint, /Do not wait.*000/);
  assert.deepEqual(copy(guidance.forStep(task('annual-calendar-control'), -1)), []);
  assert.deepEqual(copy(guidance.forStep(task('annual-calendar-control'), 100)), []);
  assert.deepEqual(copy(guidance.forWeekly(100)), []);
});

function renderHarness({ hash = '#today', records = {}, links = {} } = {}) {
  const nodes = new Map(), handlers = new Map(), writes = [];
  const element = () => ({
    innerHTML: '', textContent: '', hidden: false, open: false, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, removeAttribute() {}, focus() {}, remove() {}, scrollIntoView() {},
    appendChild(child) { this.children.push(child); }, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    showModal() { this.open = true; }, close() { this.open = false; }
  });
  const getNode = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  const raw = JSON.stringify({ schemaVersion: 2, linkDefaultsVersion: 2, records, weekly: {}, links });
  const context = {
    window: { addEventListener() {}, dispatchEvent() {}, setTimeout() {}, scrollTo() {} },
    document: { body: element(), activeElement: null, getElementById: id => id === 'task-record-form' ? null : getNode(id), querySelector: getNode, querySelectorAll() { return []; }, createElement: element, addEventListener: (name, fn) => handlers.set(name, fn) },
    location: { hash }, history: { replaceState() {} }, URL, URLSearchParams, CSS: { escape: value => value },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-18T03:00:00Z'])); } },
    localStorage: { getItem: key => key === data.config.storageKey ? raw : null, setItem: (...args) => writes.push(args) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  };
  vm.createContext(context);
  scripts.forEach(script => vm.runInContext(script, context));
  return {
    nodes, writes,
    open(id) {
      const target = { dataset: { action: 'open-task', taskId: id }, closest: selector => selector === '[data-action]' ? target : null };
      handlers.get('click')({ target });
      return getNode('task-dialog-content').innerHTML;
    },
    followLink() {
      handlers.get('click')({ target: { closest: () => null } });
    }
  };
}

test('rendered links preserve saved checkbox state and sit outside labels, including historical/procedure displays', () => {
  const h = renderHarness({ records: { 'annual-calendar-control::2026': { status: 'in-progress', steps: { 0: true } } } });
  const html = h.open('annual-calendar-control');
  assert.match(html, /data-task-step="0"[^>]+checked/);
  assert.match(html, /Open staff calendar/);
  assert.match(html, /Open NESA dates and actions/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  for (const label of html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)) assert.doesNotMatch(label[0], /<a\b/);
  const old = h.open('t1-year-opening-readiness');
  assert.match(old, /Open Sentral/);
  assert.match(old, /current sources, not historical copies/);
  assert.doesNotMatch(old, /data-task-step=/);
  const procedure = h.open('mandatory-reporting-response');
  assert.match(procedure, /Open Mandatory Reporter Guide/);
  assert.doesNotMatch(procedure, /data-task-step=/);
  h.followLink();
  assert.equal(h.writes.length, 0, 'rendering or following guidance cannot change native progress');
});

test('approved link replacements are used and labelled honestly rather than claiming a Drive search', () => {
  const h = renderHarness({ links: { 'assessment-schedules': 'https://docs.google.com/document/d/approved-current-document/edit?a=1&b=2' } });
  const html = h.open('assessment-governance');
  assert.match(html, /href="https:\/\/docs.google.com\/document\/d\/approved-current-document\/edit\?a=1&amp;b=2"/);
  assert.match(html, /Current TAS assessment schedules · Open document/);
  assert.match(html, /Uses your saved link from Settings/);
  assert.doesNotMatch(html, /Find assessment schedules in Drive/);
  const unsafe = renderHarness({ links: { 'assessment-schedules': 'javascript:alert(1)' } }).open('assessment-governance');
  assert.doesNotMatch(unsafe, /href="javascript:/);
  assert.match(unsafe, /Open 2026 assessment schedules/);
});

test('weekly guidance is rendered beside each scan without putting links inside its checkbox label', () => {
  const html = renderHarness().nodes.get('route-content').innerHTML;
  assert.equal((html.match(/data-weekly-check=/g) || []).length, data.weeklyChecks.length);
  assert.match(html, /Open NESA dates and actions/);
  assert.match(html, /Open chemical register and SDS folder/);
  for (const label of html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)) assert.doesNotMatch(label[0], /<a\b/);
});
