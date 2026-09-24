import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const context = vm.createContext({window:{}});
for (const path of ['data/config.js','data/tasks.js','data/term1-2027.js','data/reference.js','vet-step-guidance.js']) {
  vm.runInContext(fs.readFileSync(new URL(`assets/js/${path}`, root), 'utf8'), context, {filename:path});
}
const data = context.window.VET_WORKBOARD;
const guidance = context.window.VET_STEP_GUIDANCE;
const tasks = [...data.taskRegister.tasks, ...data.operatingCycle2027.tasks, ...data.operatingCycle2027.eventTemplates];
const find = id => tasks.find(task => task.id === id);
const links = (id, index) => {
  const task = typeof id === 'string' ? find(id) : id;
  assert.ok(task, `Task exists: ${id}`);
  return guidance.forStep(task, task.actionSteps[index], index);
};
const keys = (id, index) => Array.from(links(id,index), link => link.systemId || link.sourceId || link.route);
const has = (id,index,key) => assert.ok(keys(id,index).includes(key), `${id} step ${index + 1} links to ${key}`);

test('every catalogue step has a bounded, resolvable destination and an honest access hint', () => {
  assert.equal(data.taskRegister.tasks.length,67);
  assert.equal(data.operatingCycle2027.tasks.length,232);
  assert.equal(data.operatingCycle2027.eventTemplates.length,10);
  let count = 0;
  const routes = new Set(['#year?year=2026','#issues','#vet-home','#cycle-2027','#systems','./task-sources/?wing=vet']);
  for (const task of tasks) for (const [index,step] of task.actionSteps.entries()) {
    count++;
    const result = guidance.forStep(task,step,index);
    assert.ok(result.length >= 1 && result.length <= 4, `${task.id}:${index} has 1–4 useful routes`);
    const unique = new Set();
    for (const link of result) {
      if (!link.systemId && !link.sourceId && !link.route) {
        assert.equal(task.canonicalTaskId || task.id,'e-05-incident-response','only immediate protection uses a contextual hint without a link');
        assert.equal(index,0);
        assert.match(link.hint,/Do not delay urgent action/);
        continue;
      }
      assert.equal(['systemId','sourceId','route'].filter(key => Boolean(link[key])).length,1);
      assert.ok(link.label && link.hint, `${task.id}:${index} includes label and guidance`);
      const key = link.systemId || link.sourceId || link.route;
      assert.ok(!unique.has(key), `${task.id}:${index} has no duplicate destination`);
      unique.add(key);
      if (link.systemId) {
        const system = data.systems.find(item => item.id === link.systemId);
        assert.ok(system, `Known system ${link.systemId}`);
        assert.match(system.url,/^https:\/\//);
        if (/drive\.google\.com\/drive\/search/.test(system.url)) {
          assert.match(link.label,/search/i, `${task.id}:${index} labels a Drive search honestly`);
          assert.match(link.hint,/find|search/i);
        }
      }
      if (link.sourceId) {
        const source = data.sources.find(item => item.id === link.sourceId) || data.operatingCycle2027.sourceFamilies[link.sourceId];
        assert.ok(source, `Known source ${link.sourceId}`);
        assert.match(source.url,/^https:\/\//);
      }
      if (link.route) assert.ok(routes.has(link.route), `Supported internal route ${link.route}`);
      assert.equal(link.url,undefined,'URL ownership stays in the shared source/system resolver');
    }
  }
  assert.ok(count > 1106, "the audit extends the original 1106 guided steps");
});

test('annual calendar steps separate controlling dates, school constraints and the working record', () => {
  assert.deepEqual(keys('a-02-build-live-calendar',0),['nesa-toa','document-library']);
  assert.deepEqual(keys('a-02-build-live-calendar',1),['staff-calendar','placement-provider-portal','evidence-central']);
  assert.deepEqual(keys('a-02-build-live-calendar',2),['wwhs-drive']);
  assert.match(links('a-02-build-live-calendar',2)[0].label,/calendar/);
  assert.match(links('a-02-build-live-calendar',3)[0].label,/calendar/);
  assert.ok(!keys('a-02-build-live-calendar',3).includes('nesa-toa'),'a local meeting step is not routed back to NESA dates');
});

test('specific controls send staff to the system that owns each part of the work', () => {
  has('a-05-confirm-delivery',0,'tga');
  has('a-05-confirm-delivery',1,'vet-schools-hub');
  has('a-05-confirm-delivery',2,'my-vet-workplace');
  has('t1-01-usi-verification',0,'USI-PROVIDERS');
  assert.deepEqual(keys('t1-01-usi-verification',3),['document-library'],'USI upload responsibility must be checked before any Schools Online action');
  has('t1-05-tas-and-assessment-readiness',0,'course-library');
  has('t1-05-tas-and-assessment-readiness',3,'evidence-central');
  has('t2-03-enter-competencies',0,'evidence-central');
  has('t2-03-enter-competencies',2,'schools-online');
  has('t2-03-enter-competencies',3,'sentral');
  has('t3-05-hsc-estimates',0,'schools-online');
  has('t3-05-hsc-estimates',3,'nesa-toa');
  has('t4-09-support-fund-acquittal',0,'document-library');
  has('t4-09-support-fund-acquittal',1,'finance-system');
  has('e-02-new-course-authority',1,'NESA-BEC-APPLICATION');
  has('e-02-new-course-authority',2,'vet-schools-hub');
});

test('placement provider work, student readiness and formal incident guidance remain distinct', () => {
  has('t1-06-work-placement-plan',1,'placement-provider-portal');
  assert.ok(!keys('t1-06-work-placement-plan',1).includes('go2workplacement'));
  has('t1-06-work-placement-plan',3,'go2workplacement');
  has('t3-01-year11-work-placement',2,'DOE-WPL-PROCEDURE');
  assert.ok(!keys('t3-01-year11-work-placement',2).includes('go2workplacement'));
  has('e-05-incident-response',1,'DOE-PRIVACY');
  has('e-05-incident-response',1,'incident-reporting');
  has('e-05-incident-response',3,'incident-reporting');
  assert.match(links('e-05-incident-response',0)[0].hint,/emergency response first/);
  assert.match(links('e-05-incident-response',2).find(item=>item.systemId==='wwhs-drive').hint,/must not delay an urgent response/);
});

test('canonical occurrences inherit by exact step meaning, including reordered steps, without unrelated fallbacks', () => {
  const base = find('a-02-build-live-calendar');
  const scheduled = find('2027-g02-calendar');
  for (let index=0; index<base.actionSteps.length;index++) assert.deepEqual(keys(scheduled,index),keys(base,index));
  const reversed = {...scheduled,id:'2027-test-reordered',actionSteps:[...scheduled.actionSteps].reverse()};
  assert.deepEqual(keys(reversed,base.actionSteps.length-1),keys(base,0));
  const inserted = {...scheduled,id:'2027-test-added',actionSteps:['Confirm a newly introduced task-specific approval.',...scheduled.actionSteps]};
  assert.equal(links(inserted,0).length,0,'unrecognised new steps do not silently receive a wrong old destination');
  assert.deepEqual(keys(inserted,1),keys(base,0));
  assert.equal(guidance.forStep({id:'unknown',actionSteps:['Record something.']},'Record something.',0).length,0);
  assert.equal(guidance.forStep(base,'Different instruction',0).length,0);
  assert.equal(guidance.forStep(base,base.actionSteps[0],-1).length,0);
});

test('all event procedures retain useful step destinations when instantiated as saved events', () => {
  for (const template of data.operatingCycle2027.eventTemplates) {
    const occurrence = {...template,id:`2027-event-${template.id}-123`,occurrenceOf:template.id,occurrenceTemplate:false};
    for (let index=0;index<template.actionSteps.length;index++) assert.deepEqual(keys(occurrence,index),keys(template,index));
  }
  const placement = find('template-c-07-workplace-learning-control');
  assert.equal(placement.legacyRequirements.steps.length,5);
  assert.equal(placement.actionSteps.length,11);
  has(placement,1,'placement-provider-portal');
  assert.match(links(placement,1).find(item=>item.systemId==='placement-provider-portal').hint,/Day 1\/Day 2/);
  has(placement,4,'DOE-WPL-PROCEDURE');
  assert.match(links(placement,4).find(item=>item.systemId==='placement-provider-portal').hint,/post-placement review/);
});

test('new-year, term and weekly controls use their own sources and never fabricate a future cycle', () => {
  has('2027-g00-rollover',0,'#issues');
  has('2027-g00-rollover',1,'#year?year=2026');
  has('2027-g00-rollover',3,'#cycle-2027');
  has('2027-t2-w01-open',0,'staff-calendar');
  has('2027-t2-w01-open',0,'document-library');
  has('2027-t2-w09-entry-audit',0,'NESA-VET-ENTRIES');
  has('2027-t2-w10-entry-cutoff',3,'schools-online');
  has('2027-t4-w06-next-year-hub',2,'my-vet-workplace');
  assert.ok(!keys('2027-t4-w06-next-year-hub',2).includes('schools-online'),'trainer authorisation is not an NESA data-entry action');
  for (const task of data.operatingCycle2027.tasks.filter(item=>/w\d{2}-close$/.test(item.id))) {
    has(task,0,'#cycle-2027');
    has(task,1,'#vet-home');
    has(task,3,'DOE-PRIVACY');
    assert.ok(!keys(task,0).includes('evidence-central'),'weekly focus check opens the actual cycle rather than guessing an evidence record');
  }
  assert.deepEqual(keys('2027-t4-w11-year-close',4),['wwhs-drive']);
  assert.match(links('2027-t4-w11-year-close',4)[0].hint,/2028 carry-overs/);
  assert.match(links('2027-t4-w11-year-close',4)[0].hint,/currently supplies the 2027 cycle only/);
  for (const task of [...data.operatingCycle2027.tasks,...data.operatingCycle2027.eventTemplates]) {
    if (task.id === '2027-g00-rollover') continue;
    for (const item of guidance.forTask(task)) assert.doesNotMatch(`${item.label} ${item.hint} ${item.sourceId||''}`,/\b2026\b/,`${task.id} does not carry an old deadline or guide into its navigation`);
  }
});

test('returned descriptors cannot mutate the next task rendering', () => {
  const result = links('a-01-confirm-authority-set',0);
  result[0].label = 'Changed locally';
  assert.equal(links('a-01-confirm-authority-set',0)[0].label,'Check NESA live dates');
  const all = guidance.forTask(find('a-02-build-live-calendar'));
  const ids = Array.from(all,item=>item.systemId||item.sourceId||item.route);
  assert.equal(ids.length,new Set(ids).size,'task-level directory removes duplicate destinations');
});
