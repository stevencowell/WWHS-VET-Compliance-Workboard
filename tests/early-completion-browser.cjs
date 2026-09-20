// Disposable preview contexts and synthetic data only. Never use a personal profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
const reviewKey='wwhs-task-register-review:v1';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const wing of ['vet','tas']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Australia/Sydney'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.clock.setFixedTime(new Date('2026-09-20T02:00:00Z'));
   await page.goto(base+(wing==='vet'?'/#vet-home':'/head-teacher-tas/#home'));
   await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();
   const register=page.locator('.workspace-register');
   const future=await page.evaluate(({wing})=>window.WWHS_WORKBOARD_ADAPTER.getTaskRegister().items.find(item=>item.year==='2026'&&!item.procedureOnly&&(item.schedule.endDate||item.schedule.startDate)>'2026-09-20'&&(wing!=='vet'||item.title==='Finalise Year 11 outcomes and placement hours')),{wing});
   assert.ok(future,`${wing} has a future 2026 task`);
   const search=register.getByRole('searchbox');await search.fill(future.title);
   const row=register.locator(`[data-register-id="${future.id}"]`),check=row.locator('.register-tick input');
   assert.equal(await check.isEnabled(),true);assert.match(await row.innerText(),/Mark complete early/);
   const timing=await row.locator('.register-timing').innerText();
   const nativeKey=wing==='vet'?'wwhs-vet-compliance-workboard:v3':'wwhs-head-teacher-tas-workboard:v2';
   const before=await page.evaluate(key=>(window.WWHS_STORAGE||localStorage).getItem(key),nativeKey);
   await page.setViewportSize({width:390,height:844});await row.scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.resolve(__dirname,`../../../outputs/early-${wing}-available-mobile.png`)});
   await check.check();assert.equal(await check.isChecked(),true);
   assert.match(await row.innerText(),/Reviewed complete early/);
   assert.equal(await row.locator('.register-timing').innerText(),timing);
   const key=`${wing}:2026:${encodeURIComponent(future.recordKey||future.id)}`;
   const records=await page.evaluate(key=>JSON.parse((window.WWHS_STORAGE||localStorage).getItem(key)).records,reviewKey);
   assert.deepEqual(records[key],{completed:true,reviewedOn:'2026-09-20',completedEarly:true});
   await row.locator('h3 a').click();const dialog=page.locator('#task-dialog');await dialog.waitFor({state:'visible'});
   assert.match(await dialog.innerText(),/Task complete · reviewed/);
   assert.match(await dialog.locator(wing==='vet'?'textarea[name="exceptionSummary"]':'textarea[name="exceptionReason"]').inputValue(),/Signed off early/);
   const steps=dialog.locator(wing==='vet'?'.step-list input[type=checkbox]':'.action-list input[type=checkbox]');
   assert.ok(await steps.count()>0);assert.equal(await steps.evaluateAll(nodes=>nodes.every(node=>node.checked)),true);
   await page.keyboard.press('Escape');
   await page.reload();await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();
   await search.fill(future.title);assert.equal(await check.isChecked(),true,'early completion survives reload');
   await page.screenshot({path:path.resolve(__dirname,`../../../outputs/early-${wing}-complete-mobile.png`)});
   await check.uncheck();assert.equal(await check.isChecked(),false);
   assert.equal(await page.evaluate(key=>(window.WWHS_STORAGE||localStorage).getItem(key),nativeKey),before,'reversal preserves native checklist');
   await search.fill('');await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2027');
   assert.equal(await register.locator('input[type=checkbox]:checked').count(),0,'2026 cannot complete 2027');
   const next=register.locator('.register-tick input:not(:disabled)').first();assert.ok(await next.count());await next.check();assert.equal(await next.isChecked(),true);
   await page.reload();await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();
   await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2027');
   assert.equal(await register.locator('input[type=checkbox]:checked').count(),1,'explicit 2027 review survives reload');
   assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${wing}: early check, card, reload, undo, year separation and mobile`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
