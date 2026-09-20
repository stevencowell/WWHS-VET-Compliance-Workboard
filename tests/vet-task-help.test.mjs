import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {getVetTaskHelp} from '../assets/js/vet-task-help.mjs';

const root = new URL('../', import.meta.url);
const sandbox = {window: {}};
for (const file of ['assets/js/data/tasks.js', 'assets/js/data/term1-2027.js']) {
  vm.runInNewContext(fs.readFileSync(new URL(file, root), 'utf8'), sandbox);
}
const data = sandbox.window.VET_WORKBOARD;
const originals = data.taskRegister.tasks;
const scheduled = data.operatingCycle2027.tasks;
const templates = data.operatingCycle2027.eventTemplates;
const all = [...originals, ...scheduled, ...templates];
const actionable = all.filter(task => !task.historyOnly && !task.procedureOnly);
const find = id => all.find(task => task.id === id);
const text = help => [help.deliverable, ...help.instructions, ...help.requiredInputs, ...help.reviewChecks].join('\n');

test('all actual VET catalogue tasks and event templates have bounded, explicit preparation profiles', () => {
  assert.ok(originals.length >= 59 && scheduled.length >= 176 && templates.length >= 9);
  const missing = actionable.filter(task => !getVetTaskHelp(task)).map(task => task.id);
  assert.deepEqual(missing, [], 'Every actionable native task needs an explicit help profile');
  const families = new Set();
  for (const task of actionable) {
    const help = getVetTaskHelp(task);
    families.add(help.profileId);
    assert.deepEqual(Object.keys(help).sort(), ['profileId', 'label', 'summary', 'deliverable', 'instructions', 'requiredInputs', 'reviewChecks'].sort());
    for (const field of ['profileId', 'label', 'summary', 'deliverable']) assert.ok(typeof help[field] === 'string' && help[field].trim(), task.id + ': ' + field);
    for (const field of ['instructions', 'requiredInputs', 'reviewChecks']) {
      assert.ok(Array.isArray(help[field]) && help[field].length >= 2 && help[field].length <= 10, task.id + ': ' + field);
      assert.ok(help[field].every(line => typeof line === 'string' && line.length > 12 && line.length < 650));
    }
    assert.ok(JSON.stringify(help).length < 7000, task.id + ' remains a usable brief');
    assert.match(text(help), /full title, steps, done-when criteria, owner roles, systems and source references/);
  }
  assert.ok(families.size >= 30, 'Coverage must not collapse to a blanket generic prompt');
});

test('2027 scheduled tasks retain their canonical family even when their titles and dates differ', () => {
  const inherited = scheduled.filter(task => task.canonicalTaskId);
  assert.ok(inherited.length > 100);
  for (const task of inherited) {
    const canonical = getVetTaskHelp(find(task.canonicalTaskId));
    assert.equal(getVetTaskHelp(task).profileId, canonical.profileId, task.id);
    assert.equal(getVetTaskHelp({taskId:task.id, canonicalTaskId:task.canonicalTaskId}).profileId, canonical.profileId, 'Adapter context resolves ' + task.id);
  }
});

test('all recurring weekly control points get closure preparation, never authority to release a gate', () => {
  const closures = scheduled.filter(task => /^2027-(?:t[234]-)?w\d\d-close$/.test(task.id));
  assert.equal(closures.length, 41);
  for (const task of closures) {
    const help = getVetTaskHelp(task);
    assert.equal(help.profileId, 'weekly-closure');
    assert.match(text(help), /do not reuse another week/);
    assert.match(text(help), /no AI output unlocks the next gate/);
  }
  assert.equal(getVetTaskHelp({taskId:'2027-t4-w99-close'}), null);
  assert.equal(getVetTaskHelp({taskId:'2027-t2-w11-close'}), null);
  assert.equal(getVetTaskHelp({taskId:'2028-w01-close'}), null, 'A future catalogue needs explicit coverage');
});

test('event occurrences use canonical identity and keep their event evidence separate', () => {
  for (const template of templates) {
    const help = getVetTaskHelp(template);
    assert.match(text(help), /do not assume that an event occurred/);
    const occurrence = {...template, id:'2027-event-synthetic-' + template.canonicalTaskId, occurrenceTemplate:false, occurrenceOf:template.id};
    const occurrenceHelp = getVetTaskHelp(occurrence);
    assert.equal(occurrenceHelp.profileId, help.profileId);
    assert.match(text(occurrenceHelp), /Keep this event occurrence, its actual dates and its evidence references separate/);
    assert.doesNotMatch(text(occurrenceHelp), /This is an event template/);
  }
});

test('activation and hard prerequisites are prepared for a human decision rather than bypassed', () => {
  const help = getVetTaskHelp(find('2027-g10-activate'));
  assert.equal(help.profileId, 'cycle-authorisation');
  assert.match(help.deliverable, /each required check, official verification reference/);
  assert.match(text(help), /Do not release the gate/);
  const dependent = scheduled.find(task => task.hardDependencies?.length && task.independentVerificationRequired);
  assert.ok(dependent);
  const dependentHelp = getVetTaskHelp(dependent);
  assert.match(text(dependentHelp), /supplied hard prerequisites/);
  assert.match(text(dependentHelp), /separate authorised verifier/);
});

test('placement and onboarding have different preparation outputs and no invented hours or acknowledgements', () => {
  const placement = getVetTaskHelp(find('t1-06-work-placement-plan'));
  const onboarding = getVetTaskHelp(find('t1-03-onboarding-induction-support'));
  assert.notEqual(placement.profileId, onboarding.profileId);
  assert.match(placement.deliverable, /placement contacts, attendance\/hours, original records and post-placement review/);
  assert.match(text(placement), /do not assume a generic hours total/);
  assert.match(text(placement), /must not delay that response/);
  assert.match(onboarding.deliverable, /enrolment\/induction readiness checklist/i);
  assert.match(text(onboarding), /induction delivered, acknowledgements recorded/);
});

test('reporting, competency outcomes and HSC estimates preserve distinct authorised judgements', () => {
  const reports = getVetTaskHelp(find('t2-06-finalise-semester-one-reports'));
  const outcomes = getVetTaskHelp(find('t3-03-progressive-outcomes'));
  const estimates = getVetTaskHelp(find('t3-05-hsc-estimates'));
  assert.equal(new Set([reports.profileId, outcomes.profileId, estimates.profileId]).size, 3);
  assert.match(text(reports), /do not generate learner results/);
  assert.match(text(outcomes), /existing authorised assessor decision/);
  assert.match(text(outcomes), /never infer competency, invent hours, generate marks or submit official data/);
  assert.match(text(estimates), /do not calculate or invent/);
  assert.match(text(estimates), /Only authorised staff submit/);
});

test('Principal certification has a distinct handover brief and historical reviews remain read-only', () => {
  const help = getVetTaskHelp(find('t3-10-principal-hsc-certification'));
  assert.equal(help.profileId, 'principal-hsc-certification');
  assert.notEqual(help.profileId, getVetTaskHelp(find('t3-05-hsc-estimates')).profileId);
  assert.match(text(help), /one does not prove the other is complete/);
  assert.match(text(help), /whether certification is already recorded/);
  assert.match(text(help), /Do not calculate marks, certify other faculty data, perform the Principal role or submit the certification/);
  assert.equal(getVetTaskHelp(find('t2-09-review-stage6-entry-cutoff')), null);
});

test('source and calendar preparation keep currency, missing authority and local dates explicit', () => {
  const source = getVetTaskHelp(find('a-01-confirm-authority-set'));
  const calendar = getVetTaskHelp(find('a-02-build-live-calendar'));
  assert.match(source.deliverable, /version\/date/);
  assert.match(text(source), /inaccessible masters/);
  assert.match(text(source), /file modification date/);
  assert.match(text(calendar), /Never roll last year’s deadlines forward/);
  assert.match(text(calendar), /firm external deadlines, school-approved dates and suggested preparation dates/);
});

test('incident help prioritises formal urgent response and minimises sensitive details', () => {
  const incident = getVetTaskHelp(find('e-05-incident-response'));
  assert.equal(incident.profileId, 'incident-response');
  assert.match(text(incident), /do not wait for an AI draft/);
  assert.match(text(incident), /observed facts, reported information and unknowns/);
  assert.match(text(incident), /do not investigate, contact affected people or submit a notification/);
  assert.match(incident.requiredInputs.join(' '), /exclude health details and identifiable case records/);
});

test('every profile retains draft, privacy, source and official-record boundaries', () => {
  for (const task of actionable) {
    const content = text(getVetTaskHelp(task));
    assert.match(content, /sources you can actually read/);
    assert.match(content, /An unrecorded task is not proof of unfinished work/);
    assert.match(content, /Do not request student names, USIs/);
    assert.match(content, /Do not send messages, change official records, make commitments, approve compliance or mark this task complete/);
  }
});

test('unknown and non-actionable inputs return null instead of a plausible generic brief', () => {
  for (const value of [null, undefined, 'a-01-confirm-authority-set', [], {}, {id:'new-task'}, {id:'__proto__'}, {id:'constructor'}, {id:'unknown', title:'Respond to a safety incident'}, {id:'a-01-confirm-authority-set', canonicalTaskId:'unknown'}, {id:'a-01-confirm-authority-set', historyOnly:true}, {id:'a-01-confirm-authority-set', procedureOnly:true}]) {
    assert.equal(getVetTaskHelp(value), null);
  }
  assert.equal(getVetTaskHelp({taskId:'a-01-confirm-authority-set'}).profileId, 'source-authority');
});

test('callers cannot mutate a shared profile or native task by editing the returned brief', () => {
  const task = Object.freeze({taskId:'a-01-confirm-authority-set'});
  const expected = getVetTaskHelp(task);
  const changed = getVetTaskHelp(task);
  changed.instructions.splice(0, changed.instructions.length, 'Changed');
  changed.requiredInputs.push('Changed');
  changed.reviewChecks.pop();
  changed.label = 'Changed';
  assert.deepEqual(getVetTaskHelp(task), expected);
  assert.deepEqual(task, {taskId:'a-01-confirm-authority-set'});
});
