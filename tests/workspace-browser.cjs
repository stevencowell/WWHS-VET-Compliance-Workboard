// Run only against an isolated local preview; never a saved/live browser profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const base='http://127.0.0.1:4173';
const inboxKey='morning-launchpad-summary:v1',vetKey='wwhs-vet-compliance-workboard:v3',tasKey='wwhs-head-teacher-tas-workboard:v2';
const outputs=path.resolve(__dirname,'../../../outputs');
const results=[],runtimeErrors=[];
let browser;
async function check(name,fn){if(process.env.WORKSPACE_TEST_MATCH&&!name.includes(process.env.WORKSPACE_TEST_MATCH))return;try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.message});console.log('FAIL '+name+'\n'+error.message);}}
async function context(){const c=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Australia/Sydney'});await c.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());c.on('page',p=>{p.setDefaultTimeout(6500);p.on('pageerror',error=>runtimeErrors.push({url:p.url(),message:error.message}));});return c;}
async function go(page,route){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&document.querySelector('.workspace-header'));}
async function inbox(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{"items":[]}'),inboxKey);}
async function sourceState(page,key){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{"records":{}}').records,key);}
async function findCard(page,title){const board=page.locator('summary-import');await board.getByRole('navigation',{name:'Work area',exact:true}).getByRole('button',{name:/^All work \(/}).click();await board.getByRole('searchbox',{name:'Search notes',exact:true}).fill(title);const card=board.locator('article.import-card').filter({has:page.locator('.import-card-top strong',{hasText:title})});await card.waitFor();if(await card.locator('.import-card-disclosure').getAttribute('open')===null)await card.locator('.import-card-chevron').click();return card;}
async function nativeTask(page,wing){return page.evaluate(wing=>{const board=wing==='vet'?window.VET_WORKBOARD:window.HT_TAS_WORKBOARD;const tasks=wing==='vet'?board.taskRegister.tasks:board.tasks;const task=tasks.find(x=>!x.historyOnly&&!x.procedureOnly);return {id:task.id,title:task.title};},wing);}
async function storedItem(page,title){return (await inbox(page)).items.find(x=>x.title===title);}
async function waitItem(page,title,predicate){await page.waitForFunction(({key,title,predicate})=>{const item=JSON.parse(localStorage.getItem(key)||'{"items":[]}').items.find(x=>x.title===title);return item&&(!predicate||item[predicate.key]===predicate.value);},{key:inboxKey,title,predicate});}

(async()=>{
 browser=await chromium.launch({headless:true});fs.mkdirSync(outputs,{recursive:true});
 await check('VET specialist routes, navigation and task verification remain available',async()=>{
  const c=await context(),p=await c.newPage();
  try{
   const routes=['home','vet-home','today','reference','ai-admin','cycle-2027','term1-2027','term2-2027','term3-2027','term4-2027','year','workflows','systems','issues'];
   for(const route of routes){await go(p,'/#'+route);assert.equal(new URL(p.url()).hash,'#'+route);assert.ok(await p.locator('#route-content h1').count(),route+' has a specialist heading');assert.equal(await p.locator('.workspace-header').count(),1);}
   await go(p,'/#my-work');assert.equal(await p.locator('summary-import').isVisible(),true);assert.equal(await p.locator('.workspace-specialist').isVisible(),false);
   const t=await nativeTask(p,'vet');await go(p,'/#task/'+t.id);await p.locator('#task-dialog[open]').waitFor();assert.equal(await p.locator('#task-dialog-title').textContent(),t.title);
   await p.locator('#task-dialog').getByRole('button',{name:'Verify and close',exact:true}).click();assert.ok(await p.locator('#task-form-error').isVisible());assert.equal((await sourceState(p,vetKey))[t.id],undefined);
   assert.ok(await p.locator('#task-dialog [data-action="track-work-task"]').count());
  }finally{await c.close();}
 });
 await check('TAS specialist routes, direct tasks and verification remain available',async()=>{
  const c=await context(),p=await c.newPage();
  try{
   for(const route of ['home','today','calendar','teaching','faculty','people','reference','ai-admin']){await go(p,'/head-teacher-tas/#'+route);assert.equal(new URL(p.url()).hash,'#'+route);assert.ok(await p.locator('#route-content h1').count(),route+' has a specialist heading');}
   await go(p,'/head-teacher-tas/#my-work');assert.equal(await p.locator('summary-import').isVisible(),true);
   const t=await nativeTask(p,'tas');await go(p,'/head-teacher-tas/#task/'+t.id);await p.locator('#task-dialog[open]').waitFor();assert.equal(await p.locator('#task-dialog-title').textContent(),t.title);
   await p.locator('#task-dialog').getByRole('button',{name:'Verify and close',exact:true}).click();assert.ok(await p.locator('#task-record-form .form-error').isVisible());assert.equal(Object.keys(await sourceState(p,tasKey)).length,0);
  }finally{await c.close();}
 });
 await check('one task and rich working note persist through VET, TAS and Launchpad; Done leaves native records unchanged',async()=>{
  const c=await context(),p=await c.newPage();
  try{
   await go(p,'/#my-work');const t=await nativeTask(p,'vet');await go(p,'/#task/'+t.id);
   await p.locator('#task-dialog [data-action="track-work-task"]').click();await waitItem(p,t.title);assert.equal(new URL(p.url()).hash,'#my-work');
   let card=await findCard(p,t.title);await card.getByRole('textbox',{name:'Note for '+t.title,exact:true}).fill('Synthetic shared working note from VET.');await waitItem(p,t.title,{key:'noteText',value:'Synthetic shared working note from VET.'});
   await card.getByRole('button',{name:'Pin for today: '+t.title,exact:true}).click();assert.ok((await storedItem(p,t.title)).pinnedDate);
   card=await findCard(p,t.title);const before=JSON.stringify(await sourceState(p,vetKey));await card.getByRole('button',{name:'Mark done',exact:true}).click();await waitItem(p,t.title,{key:'status',value:'done'});assert.equal(JSON.stringify(await sourceState(p,vetKey)),before);
   await p.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name:'TAS',exact:true}).click();await p.waitForFunction(()=>document.querySelector('summary-import')?.started);card=await findCard(p,t.title);assert.equal(await card.getByRole('textbox',{name:'Note for '+t.title,exact:true}).innerText(),'Synthetic shared working note from VET.');
   await card.getByRole('textbox',{name:'Note for '+t.title,exact:true}).fill('Synthetic shared note revised in TAS.');await waitItem(p,t.title,{key:'noteText',value:'Synthetic shared note revised in TAS.'});
   await p.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name:'Launchpad',exact:true}).click();await p.waitForFunction(()=>document.querySelector('summary-import')?.started);card=await findCard(p,t.title);assert.equal(await card.getByRole('textbox',{name:'Note for '+t.title,exact:true}).innerText(),'Synthetic shared note revised in TAS.');
   const tracked=await storedItem(p,t.title);assert.equal(tracked.status,'done');assert.equal(tracked.origin.wing,'vet');assert.equal((await inbox(p)).items.filter(x=>x.origin?.recordKey===t.id).length,1);
   await card.getByRole('link',{name:'Open VET task',exact:true}).click();await p.locator('#task-dialog[open]').waitFor();assert.equal(await p.locator('#task-dialog-title').textContent(),t.title);assert.equal(JSON.stringify(await sourceState(p,vetKey)),before);
   await p.locator('#task-dialog [data-action="track-work-task"]').click();await waitItem(p,t.title,{key:'status',value:'done'});assert.equal((await inbox(p)).items.filter(i=>i.origin?.recordKey===t.id).length,1);assert.equal((await storedItem(p,t.title)).noteText,'Synthetic shared note revised in TAS.');
   await p.screenshot({path:path.join(outputs,'workspace-vet-desktop.png'),fullPage:true});
  }finally{await c.close();}
 });
 await check('TAS task tracking uses its occurrence identity and common Done leaves its checklist unchanged',async()=>{
  const c=await context(),p=await c.newPage();
  try{await go(p,'/head-teacher-tas/#my-work');const t=await nativeTask(p,'tas');await go(p,'/head-teacher-tas/#task/'+t.id);const descriptor=await p.evaluate(id=>window.WWHS_WORKBOARD_ADAPTER.describeTask(id),t.id);
   await p.locator('#task-dialog [data-action="track-task"]').click();await waitItem(p,t.title);const card=await findCard(p,t.title);const before=JSON.stringify(await sourceState(p,tasKey));await card.getByRole('button',{name:'Mark done',exact:true}).click();await waitItem(p,t.title,{key:'status',value:'done'});assert.equal(JSON.stringify(await sourceState(p,tasKey)),before);assert.equal((await storedItem(p,t.title)).origin.recordKey,descriptor.recordKey);
  }finally{await c.close();}
 });
 await check('native saved-record migration is idempotent and deleted shared cards do not resurrect',async()=>{
  const c=await context(),p=await c.newPage();
  try{await go(p,'/#my-work');const t=await nativeTask(p,'vet');await p.evaluate(({key,id})=>{localStorage.removeItem('morning-launchpad-summary:v1');localStorage.setItem(key,JSON.stringify({schemaVersion:3,linkDefaultsVersion:2,records:{[id]:{status:'in-progress',exceptionSummary:'Synthetic migrated note',stepChecks:{0:true}}}}));},{key:vetKey,id:t.id});await p.reload();await waitItem(p,t.title);
   assert.equal((await storedItem(p,t.title)).noteText,'Synthetic migrated note');await p.reload();await waitItem(p,t.title);assert.equal((await inbox(p)).items.filter(i=>i.origin?.recordKey===t.id).length,1);
   const card=await findCard(p,t.title);p.once('dialog',dialog=>dialog.accept());await card.getByRole('button',{name:'Delete note',exact:true}).click();assert.equal((await inbox(p)).items.filter(i=>i.origin?.recordKey===t.id).length,0);
   await p.reload();await p.waitForFunction(()=>document.querySelector('summary-import')?.started);assert.equal((await inbox(p)).items.filter(i=>i.origin?.recordKey===t.id).length,0);assert.equal((await sourceState(p,vetKey))[t.id].exceptionSummary,'Synthetic migrated note');
  }finally{await c.close();}
 });
 await check('manual tracking deletion survives later native progress and reload',async()=>{
  const c=await context(),p=await c.newPage();
  try{await go(p,'/#my-work');const t=await nativeTask(p,'vet');await go(p,'/#task/'+t.id);await p.locator('#task-dialog [data-action="track-work-task"]').click();await waitItem(p,t.title);
   const card=await findCard(p,t.title);p.once('dialog',dialog=>dialog.accept());await card.getByRole('button',{name:'Delete note',exact:true}).click();assert.equal((await inbox(p)).items.filter(i=>i.origin?.recordKey===t.id).length,0);
   await go(p,'/#task/'+t.id);await p.locator('#task-dialog [data-task-step]').first().check();assert.equal((await sourceState(p,vetKey))[t.id].stepChecks[0],true);await p.reload();await p.waitForFunction(()=>document.querySelector('summary-import')?.started);assert.equal((await inbox(p)).items.filter(i=>i.origin?.recordKey===t.id).length,0);
  }finally{await c.close();}
 });
 await check('older daily-plan migration preserves originals, pins and completion without resurrection',async()=>{
  const c=await context(),p=await c.newPage();
  try{await go(p,'/morning-launchpad/');const legacy=await p.evaluate(()=>{const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return JSON.stringify({version:1,days:{[day]:{commitment:'Synthetic only',capacity:'small',closed:false,tasks:[{id:'legacy-todo',title:'[Synthetic old task] — Make a brief plan',state:'todo',url:'https://example.com/'},{id:'legacy-done',title:'[Synthetic old completed] — Finished plan',state:'done'}]}}});});
   await p.evaluate(({key,legacy})=>{localStorage.removeItem(key);localStorage.setItem('morning-launchpad-routine:v1',legacy);},{key:inboxKey,legacy});await p.reload();await waitItem(p,'Synthetic old task');const current=await inbox(p);assert.equal(current.items.length,2);assert.ok(current.items.find(x=>x.title==='Synthetic old task').pinnedDate);assert.equal(current.items.find(x=>x.title==='Synthetic old completed').status,'done');assert.equal(await p.evaluate(()=>localStorage.getItem('morning-launchpad-routine:v1')),legacy);
   await p.reload();await waitItem(p,'Synthetic old task');assert.equal((await inbox(p)).items.length,2);const card=await findCard(p,'Synthetic old task');p.once('dialog',dialog=>dialog.accept());await card.getByRole('button',{name:'Delete note',exact:true}).click();await p.reload();await p.waitForFunction(()=>document.querySelector('summary-import')?.started);assert.equal((await inbox(p)).items.length,1);assert.equal(await p.evaluate(()=>localStorage.getItem('morning-launchpad-routine:v1')),legacy);
  }finally{await c.close();}
 });
 await check('shared cross-tab conflict preserves unsaved draft and reload offers draft recovery',async()=>{
  const c=await context(),p=await c.newPage(),other=await c.newPage();
  try{
   await go(p,'/#my-work');await p.getByRole('button',{name:'Add my note',exact:true}).click();await p.getByRole('textbox',{name:'Note title',exact:true}).fill('Synthetic conflict note');await p.getByRole('textbox',{name:'Next action (optional)',exact:true}).fill('Original action');await p.getByRole('button',{name:'Save note',exact:true}).click();await waitItem(p,'Synthetic conflict note');
   await go(other,'/head-teacher-tas/#my-work');let card=await findCard(other,'Synthetic conflict note');const draft=card.getByRole('textbox',{name:'Edit card text for Synthetic conflict note',exact:true});await draft.fill('Uncommitted text in second tab');
   await p.evaluate(key=>{const state=JSON.parse(localStorage.getItem(key));state.items.find(i=>i.title==='Synthetic conflict note').action='Saved in first tab';localStorage.setItem(key,JSON.stringify(state));},inboxKey);
   await other.waitForFunction(()=>document.querySelector('summary-import').blocked);await new Promise(resolve=>setTimeout(resolve,700));assert.equal((await storedItem(other,'Synthetic conflict note')).action,'Saved in first tab');assert.equal(await draft.inputValue(),'Uncommitted text in second tab');
   const draftsBefore=await other.evaluate(()=>[...document.querySelector('summary-import').draftInputs].map(([field,label])=>({label,connected:field.isConnected,text:field.value||field.innerText})));other.once('dialog',dialog=>dialog.accept());await other.getByRole('button',{name:'Reload saved work',exact:true}).click();assert.ok(await other.locator('.import-draft-recovery').count(),'Recovery missing: '+JSON.stringify({draftsBefore,after:await other.evaluate(()=>({message:document.querySelector('summary-import').message.textContent,blocked:document.querySelector('summary-import').blocked}))}));await other.locator('.import-draft-recovery > summary').click();assert.match(await other.locator('.import-draft-recovery').innerText(),/Uncommitted text in second tab/);assert.equal(await other.evaluate(()=>document.querySelector('summary-import').blocked),false);
  }finally{await c.close();}
 });
 await check('rich unsaved draft recovery retains formatted HTML in its export',async()=>{
  const c=await context(),p=await c.newPage(),other=await c.newPage();
  try{await go(p,'/#my-work');await p.getByRole('button',{name:'Add my note',exact:true}).click();await p.getByRole('textbox',{name:'Note title',exact:true}).fill('Synthetic rich conflict');await p.getByRole('textbox',{name:'Next action (optional)',exact:true}).fill('Review rich note');await p.getByRole('button',{name:'Save note',exact:true}).click();await waitItem(p,'Synthetic rich conflict');
   await go(other,'/head-teacher-tas/#my-work');const card=await findCard(other,'Synthetic rich conflict'),editor=card.getByRole('textbox',{name:'Note for Synthetic rich conflict',exact:true});await editor.fill('Synthetic bold recovery text');await editor.press('ControlOrMeta+A');await card.getByRole('button',{name:'Bold',exact:true}).click();assert.match(await editor.innerHTML(),/<(?:b|strong)>/);
   await p.evaluate(key=>{const saved=JSON.parse(localStorage.getItem(key));saved.items.find(i=>i.title==='Synthetic rich conflict').action='Another tab change';localStorage.setItem(key,JSON.stringify(saved));},inboxKey);await other.waitForFunction(()=>document.querySelector('summary-import').blocked);other.once('dialog',dialog=>dialog.accept());await other.getByRole('button',{name:'Reload saved work',exact:true}).click();const recovery=other.locator('.import-draft-recovery');await recovery.waitFor();await recovery.locator('summary').click();assert.match(await recovery.innerText(),/Synthetic bold recovery text/);
   const downloadPromise=other.waitForEvent('download');await recovery.getByRole('button',{name:'Export this draft text',exact:true}).click();const download=await downloadPromise;const drafts=JSON.parse(fs.readFileSync(await download.path(),'utf8'));const rich=drafts.find(x=>x.label==='Note for Synthetic rich conflict');assert.equal(rich.text,'Synthetic bold recovery text');assert.match(rich.html,/<(?:b|strong)>/);
  }finally{await c.close();}
 });
 await check('VET and TAS native stale-tab changes cannot overwrite records',async()=>{
  for(const [wing,key,prefix,stepSelector] of [['vet',vetKey,'/','[data-task-step]'],['tas',tasKey,'/head-teacher-tas/','[data-task-step]']]){
   const c=await context(),p=await c.newPage(),other=await c.newPage();
   try{await go(p,prefix+'#my-work');const t=await nativeTask(p,wing);await go(p,prefix+'#task/'+t.id);await go(other,prefix+'#my-work');
    const marker=JSON.stringify({schemaVersion:wing==='vet'?3:2,linkDefaultsVersion:2,records:{},syntheticExternalMarker:'Do not overwrite'});await other.evaluate(({key,marker})=>localStorage.setItem(key,marker),{key,marker});
    const checkbox=p.locator('#task-dialog').locator(stepSelector).first();assert.ok(await checkbox.count(),wing+' action checklist is present');await checkbox.click();assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),marker);assert.match(await p.locator('#toast-region').innerText(),/another tab|changed/i);
   }finally{await c.close();}
  }
 });
 await check('malformed shared and native data is preserved without silent reset',async()=>{
  for(const [wing,key,prefix] of [['vet',vetKey,'/'],['tas',tasKey,'/head-teacher-tas/']]){
   const c=await context(),p=await c.newPage();
   try{await go(p,prefix+'#my-work');const t=await nativeTask(p,wing);await p.evaluate(({key,inboxKey})=>{localStorage.setItem(key,'{synthetic broken native');localStorage.setItem(inboxKey,'{synthetic broken shared');},{key,inboxKey});await p.reload();await go(p,prefix+'#task/'+t.id);assert.equal(await p.evaluate(()=>document.querySelector('summary-import').blocked),true);
    const checkbox=p.locator('#task-dialog input[type="checkbox"]').first();await checkbox.click();assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),'{synthetic broken native');assert.equal(await p.evaluate(key=>localStorage.getItem(key),inboxKey),'{synthetic broken shared');
   }finally{await c.close();}
  }
 });
 await check('390px shared shell and specialist pages fit, and theme follows across hubs',async()=>{
  const c=await context(),p=await c.newPage();
  try{await p.setViewportSize({width:390,height:844});for(const route of ['/#my-work','/head-teacher-tas/#my-work','/morning-launchpad/','/#workflows','/head-teacher-tas/#teaching']){await go(p,route);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' has no document overflow');}
   await go(p,'/#my-work');await p.getByRole('button',{name:'Dark appearance',exact:true}).click();await go(p,'/head-teacher-tas/#my-work');assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await p.screenshot({path:path.join(outputs,'workspace-tas-mobile-dark.png'),fullPage:true});
  }finally{await c.close();}
 });
 await browser.close();
 const errors=runtimeErrors.filter((error,index,all)=>all.findIndex(x=>x.url===error.url&&x.message===error.message)===index);
 console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results,runtimeErrors:errors},null,2));
 if(results.some(r=>!r.passed)||errors.length)process.exitCode=1;
})().catch(async error=>{console.error(error.stack);if(browser)await browser.close();process.exitCode=1;});
