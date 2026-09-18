import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = vm.createContext({ window: {}, URL });
for (const path of ['head-teacher-tas/assets/js/data.js', 'assets/js/data/task-source-links.js', 'assets/js/task-sources.js']) {
  vm.runInContext(fs.readFileSync(new URL(path, root), 'utf8'), context);
}
const data = context.window.HT_TAS_WORKBOARD;
const sources = context.window.WWHS_TASK_SOURCES;
const original = data.tasks.filter(task => !task.provisionalSchedule);
const plans = data.tasks.filter(task => task.provisionalSchedule);
// These are the published 2026 calendar identities. Their dates and historical
// status must remain available independently of the new editable planning year.
const baseline = [
  ['t1-year-opening-readiness', '02-02', true],
  ['t1-student-review-cycle', '02-18', true],
  ['t1-vet-white-card-handoff', '03-10', true],
  ['t1-parent-teacher-evening', '03-18', true],
  ['t1-nesa-disability-provisions', '04-02', true],
  ['t2-year12-report-chain', '04-29', true],
  ['t2-student-review-cycle', '05-06', true],
  ['t2-vet-placement-handoff', '05-18', true],
  ['t2-year11-report-chain', '05-21', true],
  ['t2-year8-report-chain', '05-26', true],
  ['t2-year9-report-chain', '05-29', true],
  ['t2-year7-report-chain', '06-02', true],
  ['t2-year10-report-chain', '06-05', true],
  ['t3-info-evening', '08-26', false],
  ['t3-year12-report-chain', '08-28', false],
  ['t3-parent-teacher', '09-01', false],
  ['student-review-cycle', '09-02', false],
  ['t3-nesa-submission-check', '09-15', false],
  ['t4-year11-report-chain', '10-16', false],
  ['t4-year10-report-chain', '11-04', false],
  ['t4-year9-report-chain', '11-16', false],
  ['t4-year7-report-chain', '11-19', false],
  ['t4-showcase', '11-19', false],
  ['t4-year8-report-chain', '11-24', false],
  ['t4-report-release', '12-18', false],
  ['t4-enrichment', '11-23', false],
  ['hsc-analysis-cycle', '12-16', false],
  ['t2-hsc-practical-options-handoff', '05-22', true],
  ['t3-hsc-results-certification-handoff', '09-18', false]
];

test('2026 calendar identities, dates and historical status survive the planning addition', () => {
  assert.equal(original.length, 60);
  assert.equal(original.filter(task => !task.dueDate).length, 31);
  assert.equal(original.filter(task => task.dueDate).length, baseline.length);
  for (const [id, date, historical] of baseline) {
    const task = original.find(task => task.id === id);
    assert.ok(task, id);
    assert.equal(task.dueDate, `2026-${date}`, id);
    assert.equal(Boolean(task.historyOnly), historical, id);
    assert.ok(!task.baselineTaskId, id);
  }
  assert.equal(data.config.operatingYear, 2026);
  assert.equal(data.config.calendarChecked, '2026-08-26');
  assert.equal(data.config.storageKey, 'wwhs-head-teacher-tas-workboard:v2');
});

test('each selected annual duty has exactly one independent provisional 2027 occurrence', () => {
  assert.equal(plans.length, 29);
  assert.equal(new Set(data.tasks.map(task => task.id)).size, data.tasks.length);
  assert.ok(data.config.planningYears.includes(2027));
  for (const [id, date] of baseline) {
    const base = original.find(task => task.id === id);
    const task = plans.find(task => task.baselineTaskId === id);
    assert.ok(task, id);
    assert.equal(task.id, `2027-${id}`);
    assert.equal(task.canonicalTaskId, base.id);
    assert.equal(task.operatingYear, 2027);
    assert.equal(task.dueDate, `2027-${date}`);
    assert.equal(task.baselineDueDate, base.dueDate);
    assert.equal(task.historyOnly, false);
    assert.equal(task.cycle, 'year');
    assert.equal(task.sourceState, 'verify-live');
    assert.equal(task.provisionalSchedule, true);
    assert.ok(!task.scheduleConfirmed, id);
    assert.notEqual(task.steps, base.steps, id + ' checklist array must be independent');
    assert.equal(task.steps.length, base.steps.length, id);
    assert.equal(task.milestones?.length, base.milestones?.length, id);
    for (const [index, milestone] of (task.milestones || []).entries()) {
      assert.notEqual(milestone, base.milestones[index]);
      assert.equal(milestone.date, `2027-${base.milestones[index].date.slice(5)}`);
      assert.equal(milestone.label, base.milestones[index].label);
    }
  }
});

test('same-month/day planning retains weekend dates rather than silently moving them', () => {
  const weekend = plans.filter(task => [0, 6].includes(new Date(`${task.dueDate}T12:00:00Z`).getUTCDay()));
  assert.equal(weekend.length, 7);
  assert.ok(weekend.some(task => task.id === '2027-t4-report-release' && task.dueDate === '2027-12-18'));
  assert.match(data.sourceGroups.find(group => group.id === 'calendar').body, /provisional/);
  assert.match(data.sourceGroups.find(group => group.id === 'calendar').body, /different weekday/);
});

test('planning copy stays consistent when dates change and does not claim old deadlines as verified', () => {
  for (const task of plans) {
    const text = JSON.stringify(['title', 'summary', 'steps', 'why', 'trap', 'doneWhen'].map(key => task[key]));
    assert.doesNotMatch(text, /2026|2027|\b\d+[–-]?\d* (?:January|February|March|April|May|June|July|August|September|October|November|December)\b/, task.id);
    assert.doesNotMatch(text, /verified NESA deadline|past NESA options deadline|historical checkpoint/, task.id);
    assert.match(task.timing, /planning dates based on the 2026 schedule/);
    assert.match(task.timing, /confirm in the current source/);
  }
  assert.match(plans.find(task => task.id === '2027-t3-info-evening').title, /next year's courses/);
  assert.match(original.find(task => task.id === 't3-info-evening').title, /2027 information evening/);
});

test('clones retain their canonical direct source links while labelling 2026 as background', () => {
  for (const task of plans) {
    const base = original.find(item => item.id === task.baselineTaskId);
    assert.ok(task.source.includes(base.source), task.id);
    assert.match(task.source, /^2026 baseline for 2027 planning/);
    assert.equal(sources.rowFor('tas', task), sources.rowFor('tas', base), task.id);
    assert.ok(sources.rowFor('tas', task), task.id + ' needs canonical source mapping');
    const refs = sources.refsFor('tas', task);
    assert.ok(refs.some(ref => ref.url?.startsWith('https://')), task.id);
    for (const originalRef of sources.refsFor('tas', base).filter(ref => ref.url)) {
      assert.ok(refs.some(ref => ref.url === originalRef.url), task.id + ' lost source link');
    }
    const panel = sources.panel('tas', task);
    assert.match(panel, /2027 planning task/);
    assert.match(panel, /2026 documents are background only/);
    assert.doesNotMatch(panel, /Original source wording/);
  }
});
