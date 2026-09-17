import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {getTasTaskHelp} from '../assets/js/tas-task-help.mjs';

const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(new URL('../head-teacher-tas/assets/js/data.js', import.meta.url), 'utf8'), sandbox);
const tasks = sandbox.window.HT_TAS_WORKBOARD.tasks;
const actionable = tasks.filter(task => !task.historyOnly && !task.procedureOnly);
const help = id => getTasTaskHelp(tasks.find(task => task.id === id));
const text = profile => JSON.stringify(profile);

test('every native actionable TAS task has a complete explicit preparation brief', () => {
  assert.equal(actionable.length, 41);
  for (const task of actionable) {
    const result = getTasTaskHelp(task);
    assert.ok(result, task.id);
    assert.deepEqual(Object.keys(result).sort(), ['profileId', 'label', 'summary', 'deliverable', 'instructions', 'requiredInputs', 'reviewChecks'].sort());
    for (const field of ['profileId', 'label', 'summary', 'deliverable']) assert.ok(typeof result[field] === 'string' && result[field].length > 5, `${task.id}: ${field}`);
    for (const field of ['instructions', 'requiredInputs', 'reviewChecks']) assert.ok(Array.isArray(result[field]) && result[field].length >= 2 && result[field].every(value => typeof value === 'string' && value.trim()), `${task.id}: ${field}`);
    assert.match(text(result), /authorised sources/);
    assert.match(text(result), /To confirm/);
    assert.match(text(result), /Do not send, publish/);
    assert.match(text(result), /teacher to review/);
    assert.doesNotMatch(text(result), /\b20\d{2}-\d{2}-\d{2}\b/);
  }
});

test('history, procedure-only, malformed and unknown tasks cannot obtain a generic brief', () => {
  for (const task of tasks.filter(task => task.historyOnly || task.procedureOnly)) assert.equal(getTasTaskHelp(task), null, task.id);
  for (const task of [null, undefined, {}, {id: 12}, {id: 'unknown'}, {id: '__proto__'}, {id: 'constructor'}, {id: 'faculty-meeting-control', historyOnly: true}, {id: 'faculty-meeting-control', procedureOnly: true}]) assert.equal(getTasTaskHelp(task), null);
});

test('weekly, term, annual and event work receive useful distinct outputs', () => {
  const weekly = help('faculty-meeting-control');
  assert.equal(weekly.profileId, 'tas-coordination');
  assert.match(weekly.deliverable, /agenda.*action table/);
  assert.match(text(weekly), /closure, carry-forward or escalation/);
  const term = help('senior-monitoring');
  assert.equal(term.profileId, 'tas-monitoring');
  assert.match(term.deliverable, /monitoring QA matrix/);
  assert.match(text(term), /Principal\/delegate/);
  const annual = help('annual-calendar-control');
  assert.equal(annual.profileId, 'tas-calendar');
  assert.match(text(annual), /previous year forward/);
  const event = help('excursion-workflow');
  assert.equal(event.profileId, 'tas-excursion');
  assert.match(text(event), /actual excursion proposal/);
  assert.match(text(event), /Do not book/);
});

test('related reporting tasks retain their distinct controlled hand-offs', () => {
  assert.match(text(help('t4-year11-report-chain')), /grade\/Life Skills hand-off/);
  assert.match(text(help('t4-year10-report-chain')), /NESA grade hand-off/);
  assert.match(text(help('t4-report-release')), /aggregate reporting-chain status/);
  assert.match(text(help('reporting-assurance')), /early sampling plan/);
  for (const id of ['t3-year12-report-chain', 't4-year9-report-chain', 't4-year7-report-chain', 't4-year8-report-chain']) {
    assert.match(text(help(id)), /Do not generate student reports, marks or judgements/);
    assert.match(text(help(id)), /no report extracts/);
  }
});

test('resource and safety work prepares administrative checks without fabricating authority or safe-operation decisions', () => {
  assert.match(text(help('budget-procurement')), /no amounts, claims, supplier details/);
  assert.match(text(help('stocktake-disposal')), /movement\/disposal approvals/);
  assert.match(text(help('machinery-assets')), /Do not supply engineering instructions/);
  assert.match(text(help('chemical-controls')), /without copying an inventory/);
  assert.match(text(help('workshop-routine')), /every-lesson check/);
  assert.match(text(help('term-workshop-close')), /cut-off date needs local confirmation/);
  assert.match(text(help('ag-farm-audit')), /Do not assume a current Agriculture\/farm operation/);
});

test('sensitive event help remains generic preparation in the authorised workflow', () => {
  assert.match(text(help('n-warning-response')), /Do not draft an individual warning/);
  assert.match(text(help('n-warning-response')), /Learning and Support referral/);
  assert.match(text(help('absence-cover')), /non-practical alternative/);
  assert.match(text(help('new-staff-induction')), /current university agreement/);
  assert.match(text(help('student-review-cycle')), /no learner, wellbeing, attendance or roster records/);
  assert.match(text(help('source-sharing-review')), /Do not enumerate private permissions, change sharing/);
  assert.match(text(help('vet-handoff')), /rather than reproducing controlled instructions/);
});

test('program planning and public communication stay source-bound and await review', () => {
  assert.match(text(help('program-currency')), /exact nominated current syllabus/);
  assert.match(text(help('assessment-governance')), /accessibility, authenticity/);
  assert.match(text(help('faculty-publications')), /rendered-output review checklist/);
  assert.match(text(help('hsc-analysis-cycle')), /Do not claim causation/);
  assert.match(text(help('t4-enrichment')), /Establish the approved TAS contribution first/);
  assert.match(text(help('t3-nesa-submission-check')), /whether TAS supplies a contribution/);
});

test('briefs neither echo dynamic/private task records nor mutate the source or another returned brief', () => {
  const task = Object.freeze({...tasks.find(task => task.id === 'faculty-meeting-control'), notes: 'Synthetic private content must stay out', status: 'verified', dueDate: '2099-01-01'});
  const before = JSON.stringify(task);
  const first = getTasTaskHelp(task);
  assert.doesNotMatch(text(first), /Synthetic private content|2099-01-01/);
  assert.equal(JSON.stringify(task), before);
  const original = help(task.id);
  first.instructions.push('Changed by caller');
  first.requiredInputs[0] = 'Changed input';
  first.reviewChecks.splice(0);
  assert.deepEqual(help(task.id), original);
});
