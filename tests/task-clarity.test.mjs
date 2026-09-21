import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={window:{}};
for(const file of ['assets/js/data/tasks.js','assets/js/data/term1-2027.js','head-teacher-tas/assets/js/data.js','assets/js/data/task-copy-vet.js','head-teacher-tas/assets/js/task-copy-tas.js','assets/js/task-clarity.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),sandbox);
const w=sandbox.window, describe=w.WWHS_TASK_CLARITY.describe;
const catalogues={vet:[...w.VET_WORKBOARD.taskRegister.tasks,...w.VET_WORKBOARD.operatingCycle2027.tasks,...w.VET_WORKBOARD.operatingCycle2027.eventTemplates],tas:w.HT_TAS_WORKBOARD.tasks};
const clean=value=>String(value||'').replace(/202[0-6]/g,'the prior controlled year').replace(/\s+/g,' ').trim();
for(const [wing,tasks]of Object.entries(catalogues))test(`${wing}: all tasks get source-matched copy without changing saved checklist positions`,()=>{
  const before=JSON.stringify(tasks);
  for(const task of tasks){
    const copy=w.WWHS_TASK_COPY[wing][task.id]||w.WWHS_TASK_COPY[wing][task.canonicalTaskId];
    assert.ok(copy,task.id+' needs authored copy');
    const result=describe(wing,task),steps=task.actionSteps||task.steps||[];
    assert.ok(result.title&&result.purpose&&result.finished,task.id);
    assert.equal(result.steps.length,steps.length,task.id);
    assert.equal(copy.sourceSteps.length,copy.steps.length,task.id);
    assert.deepEqual(Array.from(steps,clean),Array.from(copy.sourceSteps,clean),task.id+' source checklist changed');
    assert.equal(clean(task.doneWhen),clean(copy.sourceFinished),task.id+' source outcome changed');
    assert.equal(result.finished,copy.finished,task.id+' should use clear finish');
  }
  assert.equal(JSON.stringify(tasks),before,'Presentation must not mutate source tasks');
});
test('future source changes preserve the actual checklist and outcome',()=>{
  const task=catalogues.vet[0];
  const changed={...task,actionSteps:['A new mandatory first check.'],doneWhen:'A new authorised completion condition.'};
  const result=describe('vet',changed);
  assert.deepEqual(Array.from(result.steps),changed.actionSteps);
  assert.equal(result.finished,changed.doneWhen);
});
test('saved task-help and unknown tasks retain their data and do not acquire invented steps',()=>{
  const original=catalogues.tas[0];
  const help={taskId:original.id,title:original.title,steps:original.steps,objective:original.doneWhen};
  assert.equal(describe('tas',help).finished,describe('tas',original).finished);
  const unknown={id:'new-task',title:'Own task',steps:['Own action'],doneWhen:'Own goal'};
  const result=describe('vet',unknown);
  assert.equal(result.title,unknown.title);assert.equal(result.finished,unknown.doneWhen);assert.equal(result.purpose,'');assert.deepEqual(Array.from(result.steps),unknown.steps);
});
test('created placement events and saved event help retain the complete five-step template',()=>{
  const template=w.VET_WORKBOARD.operatingCycle2027.eventTemplates.find(task=>task.id==='template-c-07-workplace-learning-control');
  const event={...template,id:'event-new-placement',occurrenceOf:template.id};
  const native=describe('vet',event);
  assert.equal(native.steps.length,5);
  assert.equal(native.steps[0],w.WWHS_TASK_COPY.vet[template.id].steps[0]);
  const help={taskId:event.id,canonicalTaskId:template.canonicalTaskId,steps:template.actionSteps,objective:template.doneWhen};
  assert.deepEqual(describe('vet',help).steps,native.steps);
});
