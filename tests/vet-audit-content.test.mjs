import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{}});
for(const file of ['data/config.js','data/tasks.js','data/term1-2027.js','data/reference.js','vet-step-guidance.js']){
  vm.runInContext(fs.readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8'),context,{filename:file});
}
const board=context.window.VET_WORKBOARD;
const canonical=board.taskRegister.tasks;
const scheduled=board.operatingCycle2027.tasks;
const events=board.operatingCycle2027.eventTemplates;
const all=[...canonical,...scheduled,...events];
const byId=new Map(all.map(task=>[task.id,task]));
const task=id=>{assert.ok(byId.has(id),id);return byId.get(id);};
const words=id=>task(id).actionSteps.join(' ');

test('all 53 audit findings have explicit existing or new duty dispositions',()=>{
  assert.equal(board.auditCoverage.length,53);
  assert.equal(new Set(board.auditCoverage.map(row=>row.rowId)).size,53);
  assert.deepEqual(Array.from(board.auditCoverage,row=>row.rowId),Array.from({length:53},(_,i)=>'R'+String(i+1).padStart(2,'0')));
  for(const row of board.auditCoverage){
    assert.ok(row.taskIds.length,row.rowId);
    for(const id of row.taskIds)assert.ok(canonical.some(task=>task.id===id),row.rowId+': '+id);
    if(!row.disposition.startsWith('retain'))assert.ok(row.taskIds.some(id=>(task(id).auditRows||[]).includes(row.rowId)),row.rowId+' has a concrete instruction');
  }
  assert.equal(canonical.length,67);
  assert.equal(events.length,10);
});
test('leaver procedure includes signed student transcript, official filing and both Evidence Central memberships',()=>{
  assert.match(words('e-03-enrolment-change'),/attest, sign and date/);
  assert.match(words('e-03-enrolment-change'),/provide the student copy/);
  assert.match(words('e-03-enrolment-change'),/reopen the attachment/);
  assert.match(words('e-03-enrolment-change'),/both the induction cohort/);
  assert.match(words('e-03-enrolment-change'),/current NESA\/RTO instructions/);
});
test('daily work is a fresh dated checklist for each week and never one annual tick',()=>{
  const routines=scheduled.filter(item=>item.recurrence==='daily-grouped-by-week');
  assert.equal(routines.length,41);
  const dates=new Set(),ids=new Set();
  for(const routine of routines){
    assert.ok(routine.actionSteps.length>=1 && routine.actionSteps.length<=5);
    assert.equal(routine.actionSteps.length,routine.dailyCheckDates.length);
    assert.equal(routine.legacyRequirements,undefined,'new daily occurrences have no old completion baseline');
    for(const [index,date]of routine.dailyCheckDates.entries()){
      assert.ok(!dates.has(date));dates.add(date);
      assert.ok(date>=routine.windowStart && date<=routine.windowEnd);
      assert.ok(![0,6].includes(new Date(date+'T12:00:00Z').getUTCDay()));
      const step=routine.auditSteps[index];
      assert.ok(!ids.has(step.id));ids.add(step.id);
      assert.match(step.text,/school working day/);
      assert.match(step.text,/confirmed holiday or non-working day/);
    }
  }
});
test('missing term attendance and earlier markbook/exam preparation are placed in the right cycle',()=>{
  const attendance=scheduled.filter(item=>item.canonicalTaskId==='c-11-term-end-attendance');
  assert.equal(attendance.length,4);
  for(const entry of attendance)assert.equal(entry.dueDate,board.operatingCycle2027.terms.find(term=>term.number===entry.term).end);
  assert.match(words('c-11-term-end-attendance'),/every VET class/);
  assert.match(words('c-11-term-end-attendance'),/approved restricted attendance folder/);
  assert.equal(task('2027-w01-markbook-setup').term,1);
  assert.equal(task('2027-t2-w01-exam-intentions').term,2);
  assert.ok(task('2027-t3-w01-exam-entry').dependencies.includes('2027-t2-w01-exam-intentions'));
  assert.equal(task('2027-t4-w02-preliminary-exit-survey').term,4);
  assert.match(words('a-09-set-up-markbooks'),/Retain non-continuing students/);
});
test('report setup keeps the overwrite warning, post-sync verification and current VET fields together',()=>{
  for(const id of ['t2-06-finalise-semester-one-reports','t4-02-year11-reports']){
    assert.match(words(id),/overwrite behaviour/);
    assert.match(words(id),/manually entered report results/);
    assert.match(words(id),/compare the resulting reports against the markbook/);
    assert.match(words(id),/marks or ranks/);
    assert.match(words(id),/internal Head Teacher review date/);
  }
});
test('source conflicts remain conditional, with no invented upload owner or destruction instruction',()=>{
  assert.match(words('t1-01-usi-verification'),/Only carry out the school's assigned part/);
  assert.match(words('c-08-records-privacy-control'),/Retain originals securely until that instruction is confirmed/);
  assert.match(words('a-03-confirm-roles-access'),/approved LLN Robot address/);
  assert.match(words('e-06-discrepancy-corrective-action'),/current NESA late-competency correction template/);
  assert.match(words('a-01-confirm-authority-set'),/Do not carry old waivers, credentials/);
  assert.equal(task('template-e-08-rto-audit-visit').occurrenceTemplate,true);
});
test('published 2027 deadlines are source-located and do not become premature planning-window cut-offs',()=>{
  const expected={
    't1-02-external-vet-entries':'2027-03-17','t1-01-usi-verification':'2027-04-02',
    't2-01-confirm-rto-qualification':'2027-05-13','t2-02-sbat-status':'2027-05-13',
    't2-03-enter-competencies':'2027-05-13','t3-05-hsc-estimates':'2027-09-17',
    't4-01-year11-final-outcomes':'2027-10-22','t4-03-year12-year10-final-data':'2027-11-19',
    't4-04-year9-short-course-entries':'2027-11-19'
  };
  for(const[id,due]of Object.entries(expected)){
    const matching=scheduled.filter(item=>item.canonicalTaskId===id);
    assert.ok(matching.length,id);
    for(const item of matching){
      assert.equal(item.dueDate,due);assert.equal(item.windowEnd,due);
      assert.equal(item.officialDeadline.sourceId,'NESA-TOA');
      assert.ok(item.officialDeadline.rows);
      assert.ok(item.windowStart<=due);
    }
  }
  const competencies=task('2027-t2-w04-competencies');
  assert.equal(competencies.week,2);assert.ok(competencies.planningWindow.end<competencies.dueDate);
  assert.match(words('t2-03-enter-competencies'),/competency the student intends to study/);
  assert.match(task('2027-t2-w03-usi-exceptions').timing,/not an extension/);
});
test('audit steps have stable row identities and copied procedure metadata resolves without ordinal guessing',()=>{
  for(const item of all){
    const ids=new Set();
    for(const addition of item.auditSteps||[]){
      assert.ok(addition.id && addition.rowId && addition.text);
      assert.ok(!ids.has(addition.id),item.id+': '+addition.id);ids.add(addition.id);
      assert.ok(item.actionSteps.includes(addition.text),item.id+': exact instruction match');
      const index=item.actionSteps.indexOf(addition.text);
      assert.ok(context.window.VET_STEP_GUIDANCE.forStep(item,addition.text,index).length,item.id+': guidance');
    }
    if(item.legacyRequirements){
      assert.ok(item.actionSteps.length>=item.legacyRequirements.steps.length);
      if (!['t2-03-enter-competencies','2027-t2-w04-competencies'].includes(item.id)) assert.deepEqual(Array.from(item.actionSteps.slice(0,item.legacyRequirements.steps.length)),Array.from(item.legacyRequirements.steps),item.id+': existing checklist order preserved');
    }
  }
});
test('daily reminders exclude published public holidays and staff-only development days',()=>{
  const dates=new Set(scheduled.filter(item=>item.recurrence==='daily-grouped-by-week').flatMap(item=>Array.from(item.dailyCheckDates)));
  assert.equal(dates.size,191);
  for(const holiday of ['2027-03-26','2027-03-29','2027-06-14'])assert.ok(!dates.has(holiday),holiday+' public holiday omitted');
  for(const staffDay of ['2027-01-28','2027-01-29','2027-02-01','2027-02-02','2027-04-27','2027-04-28','2027-07-19','2027-10-11'])assert.ok(!dates.has(staffDay),staffDay+' has no student-term checklist');
  assert.ok(dates.has('2027-08-02'),'the August bank holiday is not a school public holiday');
  assert.ok(dates.has('2027-12-20'),'20 December is the published last student day');
  assert.equal(board.operatingCycle2027.calendar.checkedOn,'2026-09-24');
  assert.match(board.operatingCycle2027.calendar.dailyCheckBasis,/staff-only days and local variations/);
});

test('intended competency entry is not blocked by completed assessment and retains the exact old migration baseline',()=>{
  const originalSteps = ["Confirm the assessor's outcome is supported by evidence in Evidence Central.","Check the qualification and competency codes.","Enter only authorised, evidence-supported outcomes.","Reconcile Evidence Central, markbook and NESA after entry."];
  for(const id of ['t2-03-enter-competencies','2027-t2-w04-competencies']){
    const entry=task(id);
    assert.deepEqual(Array.from(entry.legacyRequirements.steps),originalSteps);
    assert.equal(entry.legacyRequirements.finished,'Required competency data is entered by the live deadline and all systems agree or show an owned exception.');
    assert.match(entry.title,/intend to study/);
    assert.match(entry.actionSteps[0],/completed assessment is not required/);
    assert.match(entry.actionSteps[2],/actual outcomes separately and only with authorised assessment evidence/);
    assert.match(entry.doneWhen,/Intended competencies are entered/);
    assert.ok(entry.dependencies.every(id=>!/(assessment|evidence)/.test(id)));
  }
  assert.deepEqual(Array.from(task('t2-03-enter-competencies').dependencies),['t2-01-confirm-rto-qualification']);
  assert.deepEqual(Array.from(task('2027-t2-w04-competencies').dependencies),['2027-t2-w02-qualification']);
});

test('the March external-entry deadline applies to TAFE NSW only while the canonical duty stays broad',()=>{
  const scheduledEntry=task('2027-w02-external');
  assert.match(scheduledEntry.title,/TAFE NSW outside-school/);
  assert.match(scheduledEntry.officialDeadline.appliesTo,/TAFE NSW \(RTO 98201\).*only/);
  assert.match(scheduledEntry.applicability.conditions,/Other external providers follow their current instructions and deadlines/);
  assert.match(scheduledEntry.timing,/TAFE NSW action only/);
  assert.match(task('t1-02-external-vet-entries').trigger,/TAFE, Virtual VET or other externally delivered/);
  const catalogue=JSON.parse(fs.readFileSync(new URL('../task-sources/data.json',import.meta.url),'utf8'));
  const entry=catalogue.rows.find(row=>row.rowKey==='VET:t1-02-external-vet-entries');
  assert.match(entry.title,/externally delivered/);
  assert.match(entry.sourceBasis+' '+entry.sourceGap,/TAFE NSW/);
  assert.match(entry.sourceGap+' '+entry.nextYearCheck,/provider/);
});
