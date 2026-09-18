import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),context=vm.createContext({window:{},URL});
for(const path of ['assets/js/data/config.js','assets/js/data/tasks.js','assets/js/data/term1-2027.js','assets/js/data/reference.js','head-teacher-tas/assets/js/data.js','assets/js/data/task-source-links.js','assets/js/task-sources.js'])vm.runInContext(fs.readFileSync(new URL(path,root),'utf8'),context);
const helper=context.window.WWHS_TASK_SOURCES,vet=context.window.VET_WORKBOARD,tas=context.window.HT_TAS_WORKBOARD;
const catalogue=context.window.WWHS_TASK_SOURCE_DATA;
const allVet=[...vet.taskRegister.tasks,...vet.operatingCycle2027.tasks,...vet.operatingCycle2027.eventTemplates];
const extras=task=>(task.sourceIds||[]).map(id=>({id,...(task.operatingYear===2027?vet.operatingCycle2027.sourceFamilies[id]:null),...(!vet.operatingCycle2027.sourceFamilies[id]||task.operatingYear!==2027?vet.sources.find(s=>s.id===id)||{}:{})}));

test('every VET and TAS task, event template and weekly control exposes source access without editing data',()=>{
  const before=JSON.stringify({vet,tas,catalogue});let count=0;
  for(const [wing,tasks] of [['vet',allVet],['tas',[...tas.tasks,...tas.weeklyChecks.map((title,index)=>({id:'weekly-scan-'+index,title}))]]])for(const task of tasks){
    const html=helper.panel(wing,task,wing==='vet'?extras(task):[]);
    assert.match(html,/aria-label="Task sources"/,task.id);
    const refs=helper.refsFor(wing,task,wing==='vet'?extras(task):[]);
    assert.ok(refs.some(ref=>ref.url?.startsWith('https://')),task.id+' needs a source access route');
    assert.doesNotMatch(html,/href="(?:javascript:|undefined|null)/,task.id);
    assert.match(html,/not a quotation from the source/);
    count++;
  }
  assert.equal(count,311);
  assert.equal(JSON.stringify({vet,tas,catalogue}),before);
});

test('handbook task identifies exact RTO wording and the original guide above suggested steps',()=>{
  const task=vet.taskRegister.tasks.find(t=>t.id==='a-08-publish-local-handbook');
  const html=helper.panel('vet',task,extras(task));
  assert.match(html,/Original source wording/);
  assert.match(html,/Update School VET Handbook and issue or provide link to all VET staff and executive\./);
  assert.match(html,/https:\/\/docs.google.com\/document\/d\/1nhUiViZFMjSbrn5aWuTiLSVwKUdwu--f\/edit/);
  assert.match(html,/Whole School — Update School VET Handbook/);
  assert.match(html,/task=a-08-publish-local-handbook/);
  assert.equal(task.title,'Update and share the School VET Handbook');
});

test('2027 uses its own current source routes and clearly labels 2026 background',()=>{
  const task=allVet.find(t=>t.operatingYear===2027&&t.canonicalTaskId==='a-08-publish-local-handbook');
  assert.ok(task);
  const html=helper.panel('vet',task,extras(task));
  assert.match(html,/2026 documents are background only/);assert.doesNotMatch(html,/Original source wording/);
  assert.match(html,/2027 planning task/);
  assert.ok(helper.refsFor('vet',task,extras(task)).some(s=>s.id==='RTO-DOCUMENT-LIBRARY'&&s.url.includes('powerapps')));
  const generated=allVet.find(t=>t.operatingYear===2027&&!t.canonicalTaskId);
  const generatedHtml=helper.panel('vet',generated,extras(generated));
  assert.match(generatedHtml,/workboard planning control/);
  assert.doesNotMatch(generatedHtml,/task=2027-/);
});

test('named TAS sources, exact folders and fallback labels are semantically correct',()=>{
  const system=id=>tas.systems.find(s=>s.id===id);
  assert.equal(system('finance-system').url,'https://selfservice.det.nsw.edu.au/irj/portal');
  assert.equal(system('onguard').url,'https://onguardv3.com.au/');
  for(const id of ['assessment-schedules','program-register','workshop-maintenance','chemical-register','whs-system'])assert.match(system(id).url,/drive.google.com\/drive\/folders\//,id);
  assert.equal(helper.source('TAS-ROTATION-SCHEDULE').linkKind,'guide');
  assert.equal(helper.source('TAS-MEETING-RECORDS').linkKind,'guide');
  assert.equal(helper.source('RTO-NOTICE-T3W5-2026').linkKind,'portal');
  assert.match(helper.source('WWHS-VET-MGMT-2026-27').url,/drive\/search/);
  assert.match(helper.referenceHtml(helper.source('TAS-ROTATION-SCHEDULE')),/Open related guide/);
  assert.match(helper.source('TAS-MAINTENANCE-SCHEDULE').url,/1r4TfBMm8cwgsqUtTRkCX25ofazCstjphwLLFr42foQ0/);
  assert.match(helper.source('WWHS-EXCURSION-PROCEDURE').url,/1s44wyQZumY0l6PDAoaTF786RnSptwElR/);
  assert.match(system('staff-calendar').url,/\/calendar\/29$/);
});

test('one guide preserves every section locator for a compound task',()=>{
  const task=tas.tasks.find(task=>task.id==='annual-plan-alignment');
  const ref=helper.refsFor('tas',task).find(ref=>ref.id==='WWHS-HT-DOC');
  assert.match(ref.locator,/A11/);assert.match(ref.locator,/A12/);
});

test('source text is escaped and inaccessible mappings stay honestly labelled',()=>{
  const html=helper.referenceHtml({id:'test',title:'<img onerror=alert(1)>',url:'javascript:alert(1)',locator:'<script>bad</script>'});
  assert.doesNotMatch(html,/<img|<script|href=/);assert.match(html,/Source link to confirm/);
  assert.equal(helper.kind({url:'https://drive.google.com/drive/search?q=source'}),'search');
  assert.doesNotMatch(helper.referenceHtml({title:'Unsafe',url:'https://user:secret@example.org/'}),/href=/);
});
