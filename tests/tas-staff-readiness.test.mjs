import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {getTasTaskHelp} from '../assets/js/tas-task-help.mjs';
const root=new URL('../',import.meta.url),read=path=>fs.readFileSync(new URL(path,root),'utf8');
const context=vm.createContext({window:{},URL});
for(const file of ['head-teacher-tas/assets/js/data.js','head-teacher-tas/assets/js/guidance-destinations.js','head-teacher-tas/assets/js/step-guidance.js','head-teacher-tas/assets/js/task-copy-tas.js','assets/js/task-clarity.js','assets/js/data/task-source-links.js','assets/js/task-sources.js'])vm.runInContext(read(file),context);
const w=context.window,board=w.HT_TAS_WORKBOARD,sources=JSON.parse(read('task-sources/data.json'));
const task=id=>board.tasks.find(task=>task.id===id);
const guide=(id,index)=>w.TAS_STEP_GUIDANCE.forStep(task(id),index);
const plain=value=>JSON.parse(JSON.stringify(value));
const ids=['capability-training','annual-rosters-rhythm','class-readiness'];

test('staff-readiness additions retain the three existing task and checklist identities and no dated requirement',()=>{
  for(const [id,count] of [['capability-training',5],['annual-rosters-rhythm',4],['class-readiness',5]]){
    const t=task(id),copy=w.WWHS_TASK_COPY.tas[id];
    assert.equal(t.id,id);assert.equal(t.phase,'annual');assert.equal(t.steps.length,count);
    assert.equal(t.dueDate,undefined);assert.equal(t.milestones,undefined);
    assert.deepEqual(plain(copy.sourceSteps),plain(t.steps));assert.equal(copy.sourceFinished,t.doneWhen);
    assert.match(t.guidanceUpdate,id==='capability-training'?/accreditation/:/drill-review/);
  }
  assert.match(task('capability-training').steps[0],/approved NESA\/employer process/);
  assert.match(task('capability-training').steps[0],/historical C5 wording does not set current requirements/);
  assert.match(task('capability-training').steps[1],/any required accreditation supervision, mentoring or support/);
  assert.match(task('capability-training').steps[1],/Principal\/TA Delegate or allocated Accreditation Supervisor, as applicable/);
  for(const id of ids.slice(1)){
    assert.match(task(id).steps.join(' '),/evacuation\/lockdown/);
    assert.match(task(id).steps.join(' '),/assigned by the authorised executive\/WHS drill review/);
    assert.match(task(id).privacy,/emergency operational details/);
  }
  const c16=task('2027-faculty-allocations-timetable');assert.equal(c16.steps.length,5);assert.equal(c16.dueDate,undefined);
});

test('current accreditation and emergency guidance routes match verified sources and avoid protected descendants',()=>{
  const whs=board.systems.find(s=>s.id==='whs-system');
  assert.equal(whs.url,'https://drive.google.com/drive/folders/1dVYBc474-QgVK7ciOiDMkNL1qyR-6zKj');
  assert.ok(guide('capability-training',0).some(s=>s.systemId==='teacher-accreditation'));
  assert.ok(guide('capability-training',1).some(s=>s.systemId==='teacher-accreditation'));
  for(const [id,index] of [['annual-rosters-rhythm',1],['annual-rosters-rhythm',3],['class-readiness',3],['class-readiness',4]])assert.ok(guide(id,index).some(s=>s.systemId==='whs-system'&&/2026/.test(s.hint)));
  const accreditation=board.systems.find(s=>s.id==='teacher-accreditation');assert.match(accreditation.url,/www\.nsw\.gov\.au\/.*\/nsw-ta-manual\/e2$/);
  for(const id of ids){
    const row=sources.rows.find(r=>r.wing==='TAS'&&r.id===id);
    assert.match(row.sourceBasis,/Earlier saved ticks do not establish/);
    assert.equal(row.due2026,null);
    if(id==='capability-training'){
      assert.ok(row.sourceIds.includes('NESA-TEACHER-ACCREDITATION-RESPONSIBILITIES'));
      assert.ok(row.sourceIds.includes('NSW-DOE-ACCREDITATION-PROCEDURES'));
      assert.match(row.sourceGap,/under review/);
    }else{
      assert.ok(row.sourceIds.includes('WWHS-EVACUATION-PROCEDURE-2026'));
      assert.ok(row.sourceIds.includes('WWHS-LOCKDOWN-PROCEDURE-2026'));
      assert.match(row.sourceGap,/mismatched historical 2021 hyperlink/);
    }
  }
  for(const id of ['WWHS-EVACUATION-PROCEDURE-2026','WWHS-LOCKDOWN-PROCEDURE-2026']){
    const ref=sources.sources.find(s=>s.id===id);
    assert.equal(ref.url,whs.url);assert.equal(ref.linkKind,'folder');assert.match(ref.locator,/2026/);
    assert.match(ref.verification,/not the protected procedure/);
  }
  for(const id of ['WWHS-EVACUATION-PROCEDURE-2026','WWHS-LOCKDOWN-PROCEDURE-2026']){
    assert.equal(w.WWHS_TASK_SOURCE_DATA.sources[id].url,whs.url);
    for(const row of Object.values(w.WWHS_TASK_SOURCE_DATA.rows))for(const ref of row.evidenceRefs.filter(ref=>ref.id===id))assert.equal(ref.url,whs.url);
  }
});

test('source register inventories reconcile after the focused update without claiming a whole-register re-audit',()=>{
  assert.equal(sources.rows.length,133);assert.equal(sources.sources.length,96);
  assert.equal(sources.counts.sourceRecords,sources.sources.length);
  const referenced=new Set(sources.rows.flatMap(r=>r.sourceIds));assert.equal(sources.counts.mappedSourceRecords,referenced.size);
  for(const watch of sources.watch)assert.equal(watch.sourceCount,watch.sourceIds.length);
  const units={};for(const s of sources.sources)units[s.countingUnit]=(units[s.countingUnit]||0)+1;
  assert.deepEqual(sources.counts.sourceCountingUnits,units);
  assert.equal(sources.staffReadinessCheckedAt,'2026-10-13');assert.notEqual(sources.checkedAt,'2026-10-13');
});

test('preparation help exposes additions without inferring completed checks or requesting protected data',()=>{
  for(const id of ids){
    const help=JSON.stringify(getTasTaskHelp(task(id)));
    assert.match(help,/earlier ticks do not verify/);
    assert.match(help,id==='capability-training'?/No personnel register or individual status decisions/:/No (?:personal roster or )?emergency operational details/);
  }
});

test('shared entry points use the staff-readiness cache version and expose the visible qualification',()=>{
  for(const file of ['index.html','head-teacher-tas/index.html','morning-launchpad/index.html','task-sources/index.html','team-handover/index.html','finance/index.html','assets/js/workspace.mjs','assets/js/task-help.mjs','task-sources/app.mjs']){
    assert.match(read(file),/v=tas-staff-readiness-20261013/);assert.doesNotMatch(read(file),/v=tas-c16-planning-20261013/);
  }
  assert.match(read('assets/js/task-register.mjs'),/if\(item\.guidanceUpdate\)front\.append/);
  assert.match(read('head-teacher-tas/index.html'),/guidance-destinations\.js\?v=tas-staff-readiness-20261013/);
});
