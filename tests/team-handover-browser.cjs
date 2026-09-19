// Synthetic fixtures in disposable browser contexts. Never attach to a real profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const keys={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2',inbox:'morning-launchpad-summary:v1',meta:'wwhs-team-handover:v1',review:'wwhs-task-register-review:v1'};
const json=JSON.stringify;
async function download(page,button){const event=page.waitForEvent('download');await button.click();const file=await event;return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
async function choose(page,payload){await page.locator('#team-file').setInputFiles({name:'WWHS-team-handover.json',mimeType:'application/json',buffer:Buffer.from(json(payload))});await page.waitForFunction(()=>!document.getElementById('start-session').disabled||document.getElementById('handover-message').classList.contains('is-error'));}
async function raw(page,key){return page.evaluate(key=>localStorage.getItem(key),key);}
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 try{
  const ca=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,timezoneId:'Australia/Sydney'}),cb=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,timezoneId:'Australia/Sydney'});
  const a=await ca.newPage(),b=await cb.newPage();
  for(const p of [a,b]){p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.clock.setFixedTime(new Date('2026-09-19T01:00:00Z'));await p.goto(base+'/team-handover/');}
  await a.evaluate(async keys=>{
    const {enrich}=await import('/morning-launchpad/assets/summary-core.mjs');
    localStorage.setItem(keys.vet,JSON.stringify({schemaVersion:3,role:'htvet',links:{staff:'https://private.example/steve'},records:{'a-01-confirm-authority-set':{status:'in-progress',stepChecks:{0:true},exceptionSummary:'Synthetic original VET note',sourceChecked:false}},assignments:{},gaps:{},eventOccurrences:[]}));
    localStorage.setItem(keys.tas,JSON.stringify({schemaVersion:2,records:{'class-readiness::2026':{status:'in-progress',steps:{0:true},exceptionReason:'Synthetic original TAS note'}},weekly:{'2026-09-14':{0:true}},scheduleOverrides:{}}));
    const item=enrich({id:'native-card',taskKey:'workboard:vet:a-01-confirm-authority-set',title:'Confirm controlling sources',action:'Check source',workstream:'vet',origin:{wing:'vet',taskId:'a-01-confirm-authority-set',recordKey:'a-01-confirm-authority-set',route:'#task/a-01-confirm-authority-set',cycle:'2026'},createdOn:'2026-09-19',noteText:'Synthetic shared card note',source:'PRIVATE_EMAIL',sourceSummary:'PRIVATE_SUMMARY',url:'https://private.example/card',noteHtml:'<p>Synthetic shared card note</p>',pinnedDate:'2026-09-19'});
    const email=enrich({id:'personal-email',taskKey:'email:private',title:'Private email',action:'Reply',source:'PRIVATE_EMAIL',workstream:'personal'});
    localStorage.setItem(keys.inbox,JSON.stringify({version:2,briefing:'PRIVATE_BRIEFING',items:[item,email],workboardImports:['vet:a-01-confirm-authority-set']}));localStorage.setItem('finance-secret','PRIVATE_FINANCE');
  },keys);
  await a.reload();await a.locator('#setup-section summary').click();await a.locator('#setup-editor').fill('Steve');
  const first=await download(a,a.locator('#create-team'));assert.equal(first.revision,1);assert.equal(first.savedBy,'Steve');
  assert.doesNotMatch(json(first),/PRIVATE_|private\.example|pinnedDate|noteHtml/);
  assert.equal(await a.locator('#pending-session').isVisible(),true);await a.locator('#confirm-finish').click();assert.match(await a.locator('#status-title').innerText(),/Viewing/);
  // A second browser keeps its own private note and links on import.
  await b.evaluate(async keys=>{const {enrich}=await import('/morning-launchpad/assets/summary-core.mjs');localStorage.setItem(keys.inbox,JSON.stringify({version:2,items:[enrich({id:'diane-private',title:'Diane private',action:'Keep local',taskKey:'manual:diane',workstream:'personal'})]}));localStorage.setItem(keys.vet,JSON.stringify({schemaVersion:3,links:{staff:'https://private.example/diane'},records:{}}));},keys);
  await b.reload();await choose(b,first);await b.locator('#editor-name').fill('Diane');await b.locator('#only-editor').check();await b.locator('#start-session').click();await b.waitForURL('**/#vet-home');await b.waitForFunction(()=>window.WWHS_WORKBOARD_ADAPTER&&document.querySelector('summary-import')?.started);
  assert.match(await b.locator('.workspace-team-banner').innerText(),/Editing as Diane/);assert.equal(JSON.parse(await raw(b,keys.vet)).links.staff,'https://private.example/diane');
  assert.ok(JSON.parse(await raw(b,keys.inbox)).items.some(x=>x.id==='diane-private'));
  await b.evaluate(()=>window.WWHS_WORKBOARD_ADAPTER.openTask('a-01-confirm-authority-set'));
  await b.locator('#task-record-form select[name="status"]').selectOption('in-progress');await b.locator('#task-record-form textarea[name="exceptionSummary"]').fill('Synthetic update by Diane: funding reply awaited.');
  await b.getByRole('button',{name:'Save progress',exact:true}).click();assert.equal(JSON.parse(await raw(b,keys.vet)).records['a-01-confirm-authority-set'].exceptionSummary,'Synthetic update by Diane: funding reply awaited.');
  await b.goto(base+'/head-teacher-tas/#task/class-readiness');await b.locator('#task-dialog').waitFor({state:'visible'});
  await b.locator('#task-dialog textarea[name="exceptionReason"]').fill('Synthetic TAS follow-up from Diane.');await b.getByRole('button',{name:'Save progress',exact:true}).click();
  await b.goto(base+'/head-teacher-tas/#task/2027-t1-year-opening-readiness');await b.locator('#planning-date-panel summary').click();await b.locator('#planning-date-form [name="dueDate"]').fill('2027-02-08');await b.getByRole('button',{name:'Save dates',exact:true}).click();
  await b.goto(base+'/#vet-home');await b.getByRole('button',{name:'All VET tasks',exact:true}).click();await b.locator('[data-register-id="a-01-confirm-authority-set"] .register-tick input').check();
  // Leave a loaded native tab to prove exporting and newly imported sessions block stale writes.
  const stale=await cb.newPage();stale.on('pageerror',e=>errors.push(e.message));await stale.goto(base+'/#vet-home');await stale.waitForFunction(()=>window.WWHS_WORKBOARD_ADAPTER);
  await b.goto(base+'/team-handover/');await b.locator('#finish-session').click();assert.match(await b.locator('#handover-message').innerText(),/Save your task notes/);
  await b.locator('#handover-note').fill('Synthetic handover: follow up funding next week.');await b.locator('#notes-saved').check();
  const second=await download(b,b.locator('#finish-session'));assert.equal(second.revision,2);assert.equal(second.parentExportId,first.exportId);assert.match(second.note,/follow up funding/);
  assert.equal(second.data.tas.scheduleOverrides['2027-t1-year-opening-readiness'].dueDate,'2027-02-08');assert.equal(second.data.review.records['vet:2026:a-01-confirm-authority-set'].completed,true);
  assert.equal(await stale.evaluate(()=>window.WWHS_TEAM_SESSION.isEditing()),false);assert.equal(await stale.evaluate(key=>{const value=JSON.parse(localStorage.getItem(key));value.records['a-01-confirm-authority-set'].exceptionSummary='Attempted stale overwrite';return window.WWHS_TEAM_SESSION.allowWrite(key,value);},keys.vet),false);
  const again=await download(b,b.locator('#download-again'));assert.deepEqual(again,second);await b.locator('#confirm-finish').click();
  // Steve imports to view and sees native notes, dates and overall review; personal data survives.
  await choose(a,second);await a.locator('#view-file').click();await a.waitForURL('**/#vet-home');await a.waitForFunction(()=>window.WWHS_WORKBOARD_ADAPTER&&document.querySelector('summary-import')?.started);
  assert.match(await a.locator('.workspace-team-banner').innerText(),/Your saved team progress/);
  assert.equal(JSON.parse(await raw(a,keys.vet)).records['a-01-confirm-authority-set'].exceptionSummary,'Synthetic update by Diane: funding reply awaited.');assert.equal(JSON.parse(await raw(a,keys.tas)).records['class-readiness::2026'].exceptionReason,'Synthetic TAS follow-up from Diane.');
  assert.equal(await raw(a,'finance-secret'),'PRIVATE_FINANCE');assert.ok(JSON.parse(await raw(a,keys.inbox)).items.some(x=>x.id==='personal-email'));
  await a.locator('#role-filter').selectOption('all');
  await a.getByRole('button',{name:'All VET tasks',exact:true}).click();await a.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2026');const tick=a.locator('[data-register-id="a-01-confirm-authority-set"] .register-tick input');
  assert.equal(await tick.isChecked(),true);
  const beforeReview=await raw(a,keys.review);await tick.click();assert.equal(await tick.isChecked(),true);assert.equal(await raw(a,keys.review),beforeReview,'view-only real register UI cannot write');
  await a.goto(base+'/team-handover/');const beforeOld=await a.evaluate(()=>({...localStorage}));await choose(a,first);assert.match(await a.locator('#handover-message').innerText(),/older/);assert.deepEqual(await a.evaluate(()=>({...localStorage})),beforeOld);
  await choose(a,{...second,exportId:'competing-export'});assert.match(await a.locator('#handover-message').innerText(),/different edits/);assert.deepEqual(await a.evaluate(()=>({...localStorage})),beforeOld);
  await choose(a,second);await a.locator('#editor-name').fill('Steve');await a.locator('#only-editor').check();await a.locator('#start-session').click();await a.waitForURL('**/#vet-home');assert.match(await a.locator('.workspace-team-banner').innerText(),/Editing as Steve/);
  const oldMeta=JSON.parse(await raw(stale,keys.meta));await b.goto(base+'/team-handover/?wing=tas#start-section');await choose(b,second);await b.locator('#editor-name').fill('Diane');await b.locator('#only-editor').check();await b.locator('#start-session').click();await b.waitForURL('**/head-teacher-tas/#home');assert.notEqual(JSON.parse(await raw(b,keys.meta)).active.id,oldMeta.active?.id);assert.equal(await stale.evaluate(()=>window.WWHS_TEAM_SESSION.isEditing()),false);
  await a.goto(base+'/team-handover/');await a.locator('#recovery-section summary').click();const recovery=await download(a,a.locator('#download-recovery'));assert.notEqual(recovery.workspaceId,second.workspaceId);assert.doesNotMatch(json(recovery),/PRIVATE_|private\.example/);
  assert.deepEqual(errors,[]);console.log('PASS two-browser handover: private separation, native VET/TAS notes, date overrides, review ticks, export freeze, repeat download, read-only UI, stale/fork rejection, old-tab guard and recovery download.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
