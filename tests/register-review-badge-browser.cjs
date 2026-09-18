// Disposable local browser contexts only; never connect to a user's profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.WORKBOARD_TEST_URL || 'http://127.0.0.1:43175';
const output=process.env.WORKBOARD_TEST_OUTPUT || '../../outputs';
fs.mkdirSync(output,{recursive:true});

(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Australia/Sydney'});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-18T02:00:00Z'));
    await page.goto(base+'/#vet-home');
    await page.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true');
    await page.getByRole('button',{name:'All VET tasks',exact:true}).click();
    const register=page.locator('.workspace-register');
    const task='t1-08-monitor-support-funds',row=register.locator('[data-register-id="'+task+'"]');
    const badge=row.locator('.register-review-status');
    assert.equal(await badge.count(),0,'An unstarted task must not look under review');
    await row.locator('h3 a').click();
    const dialog=page.locator('#task-dialog');
    await dialog.locator('select[name="status"]').selectOption('waiting');
    await dialog.locator('select[name="waitingForRole"]').selectOption({label:'VET Coordinator'});
    await dialog.locator('input[name="reviewDate"]').fill('2026-09-18');
    await dialog.locator('textarea[name="exceptionSummary"]').fill('Synthetic test note: check allocation with finance.');
    await dialog.getByRole('button',{name:'Save progress',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await badge.isVisible(),true,'Saving Waiting must show Under review on the unopened register card');
    assert.equal(await badge.innerText(),'Under review · Waiting');
    const nativeKey='wwhs-vet-compliance-workboard:v3';
    const native=await page.evaluate(({key,task})=>JSON.parse(localStorage.getItem(key)).records[task],{key:nativeKey,task});
    assert.equal(native.status,'waiting');
    assert.equal(native.exceptionSummary,'Synthetic test note: check allocation with finance.');
    await page.reload();await page.getByRole('button',{name:'All VET tasks',exact:true}).click();
    assert.equal(await badge.isVisible(),true,'The saved status badge must survive reload');
    await register.getByRole('searchbox').fill('Check VET Support Funds');
    await page.screenshot({path:output+'/register-under-review-vet-desktop.png'});
    await page.setViewportSize({width:390,height:844});await row.scrollIntoViewIfNeeded();
    assert.equal(await badge.isVisible(),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile register must not overflow horizontally');
    await page.screenshot({path:output+'/register-under-review-vet-mobile.png'});
    await row.locator('.register-tick input').check();
    assert.equal(await badge.count(),0,'Reviewed complete must take precedence over saved Waiting');
    assert.equal(await row.locator('.register-tick input').isChecked(),true);
    assert.deepEqual(await page.evaluate(({key,task})=>JSON.parse(localStorage.getItem(key)).records[task],{key:nativeKey,task}),native,'Showing and signing off a badge must preserve the saved native record');
    await row.locator('.register-tick input').uncheck();
    assert.equal(await badge.isVisible(),true,'Removing sign-off must reveal the saved Waiting state again');
    await context.close();
    console.log('PASS VET: unstarted exclusion, Support Funds Waiting save, unopened card, reload, completion precedence, native preservation and mobile');

    const tas=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Australia/Sydney'});
    const tasPage=await tas.newPage();tasPage.on('pageerror',error=>errors.push(error.message));
    await tasPage.clock.setFixedTime(new Date('2026-09-18T02:00:00Z'));
    await tasPage.goto(base+'/head-teacher-tas/#home');
    await tasPage.evaluate(()=>localStorage.setItem('wwhs-head-teacher-tas-workboard:v2',JSON.stringify({
      schemaVersion:2,linkDefaultsVersion:2,records:{
        'class-readiness::2026':{status:'in-progress',steps:{0:true}},
        'faculty-meeting-control::2026-09-14':{status:'in-progress',steps:{0:true}}
      },weekly:{},links:{}
    })));
    await tasPage.reload();await tasPage.getByRole('button',{name:'All TAS tasks',exact:true}).click();
    const tasRegister=tasPage.locator('.workspace-register');
    const ongoing=tasRegister.locator('[data-register-id="class-readiness"]');
    const year=tasRegister.getByRole('combobox',{name:'Register year',exact:true});
    assert.equal(await ongoing.locator('.register-review-status').isVisible(),true,'TAS native in-progress slug must be recognised');
    await year.selectOption('2027');
    assert.equal(await ongoing.locator('.register-review-status').count(),0,'Ongoing 2026 progress must not appear against the 2027 review');
    await year.selectOption('2026');
    assert.equal(await ongoing.locator('.register-review-status').isVisible(),true);
    assert.equal(await tasRegister.locator('[data-register-id="faculty-meeting-control"]').locator('.register-review-status').isVisible(),true);
    await tasPage.clock.setFixedTime(new Date('2026-09-21T02:00:00Z'));
    await tasPage.goto(base+'/head-teacher-tas/#home');await tasPage.reload();
    await tasPage.getByRole('button',{name:'All TAS tasks',exact:true}).click();
    assert.equal(await tasRegister.locator('[data-register-id="faculty-meeting-control"]').locator('.register-review-status').count(),0,'New weekly occurrence must not inherit last week progress');
    assert.equal(await tasRegister.locator('[data-register-id="faculty-meeting-control::2026-09-14"]').locator('.register-review-status').isVisible(),true,'The saved older occurrence must retain its own progress');
    await tas.close();
    console.log('PASS TAS: native in-progress, future-year isolation, next-week isolation and preserved prior occurrence');
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
