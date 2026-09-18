// Test only disposable browser contexts; never connect to a user's profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.WORKBOARD_TEST_URL || 'http://127.0.0.1:43175';
const fs=require('node:fs');
const output=process.env.WORKBOARD_TEST_OUTPUT || '../../outputs';
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true}), errors=[];
  try {
    for (const wing of ['vet','tas']) {
      const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Australia/Sydney'});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.clock.setFixedTime(new Date('2026-09-18T02:00:00Z'));
      const path=wing==='vet'?'/#vet-home':'/head-teacher-tas/#home';
      const nativeKey=wing==='vet'?'wwhs-vet-compliance-workboard:v3':'wwhs-head-teacher-tas-workboard:v2';
      const task=wing==='vet'?'a-01-confirm-authority-set':'class-readiness';
      const recordKey=wing==='vet'?task:task+'::2026';
      const stepField=wing==='vet'?'stepChecks':'steps', noteField=wing==='vet'?'exceptionSummary':'exceptionReason';
      const original={status:'in-progress',[stepField]:{0:true},[noteField]:'Existing teacher note',evidenceRef:'Actual record 123',verifier:'Saved initials'};
      await page.goto(base+path);
      await page.evaluate(({nativeKey,recordKey,original,wing})=>localStorage.setItem(nativeKey,JSON.stringify({schemaVersion:wing==='vet'?3:2,linkDefaultsVersion:2,records:{[recordKey]:original},weekly:{},links:{}})),{nativeKey,recordKey,original,wing});
      await page.reload();
      await page.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true');
      await page.getByRole('button',{name:'All '+wing.toUpperCase()+' tasks',exact:true}).click();
      const register=page.locator('.workspace-register'), row=register.locator('[data-register-id="'+task+'"]');
      const review=row.locator('.register-tick input');
      await review.check();
      assert.equal(await review.isChecked(),true);
      assert.equal(await review.isDisabled(),false,'overall review must remain reversible');
      assert.equal(await row.locator('.register-gap').count(),0);
      await row.locator('h3 a').click();
      const dialog=page.locator('#task-dialog'), steps=dialog.locator('[data-task-step]');
      const count=await steps.count();assert.ok(count>1);
      assert.equal(await dialog.locator('[data-task-step]:checked:disabled').count(),count);
      const notes=dialog.locator('textarea[name="'+noteField+'"]');
      assert.match(await notes.inputValue(),/Existing teacher note\n\nReviewed complete for 2026 on 2026-09-18/);
      assert.match(await dialog.innerText(),/Task complete · overall sign-off/);
      assert.equal(await dialog.getByRole('button',{name:'Verify and close',exact:true}).count(),0);
      await page.screenshot({path:output+'/overall-signoff-'+wing+'.png'});
      await notes.fill('Additional teacher note\n\n'+(await notes.inputValue()));
      await dialog.getByRole('button',{name:'Save notes',exact:true}).click();
      assert.equal(await review.isChecked(),true);
      const persisted=await page.evaluate(({nativeKey,recordKey})=>JSON.parse(localStorage.getItem(nativeKey)).records[recordKey],{nativeKey,recordKey});
      assert.equal(persisted.status,'in-progress');
      assert.deepEqual(persisted[stepField],{0:true});
      assert.equal(persisted.evidenceRef,'Actual record 123');assert.equal(persisted.verifier,'Saved initials');
      assert.equal(persisted[noteField],'Additional teacher note\n\nExisting teacher note');
      await page.reload();await page.getByRole('button',{name:'All '+wing.toUpperCase()+' tasks',exact:true}).click();
      assert.equal(await review.isChecked(),true,'existing review survives reload');
      await review.uncheck();await row.locator('h3 a').click();
      assert.equal(await dialog.locator('[data-task-step]:checked').count(),1);
      assert.equal(await notes.inputValue(),'Additional teacher note\n\nExisting teacher note');
      await dialog.getByRole('button',{name:'Close task',exact:true}).click();
      const year=register.getByRole('combobox',{name:'Register year',exact:true});
      await year.selectOption('2027');
      assert.equal(await register.locator('.register-tick input:checked').count(),0);
      await year.selectOption('2026');
      if (wing==='tas') {
        const historical=register.locator('[data-register-id="t1-year-opening-readiness"]');
        await historical.locator('input').check();await historical.locator('h3 a').click();
        assert.match(await dialog.locator('textarea[name="exceptionReason"]').inputValue(),/Reviewed complete for 2026 on 2026-09-18/);
        assert.ok(await dialog.locator('.history-step .step-number').count()>0);
        assert.ok((await dialog.locator('.history-step .step-number').allTextContents()).every(value=>value==='✓'));
        await dialog.getByRole('button',{name:'Close task',exact:true}).click();
        await historical.locator('input').uncheck();await historical.locator('h3 a').click();
        assert.doesNotMatch(await dialog.innerText(),/Task complete · overall sign-off/);
        await dialog.getByRole('button',{name:'Close task',exact:true}).click();
        const weekly=register.locator('[data-register-id="weekly-scan-0"]');
        await weekly.locator('input').check();await weekly.locator('h3 a').click();
        assert.equal(await page.locator('[data-weekly-check="0"]').isChecked(),true);
        assert.equal(await page.locator('[data-weekly-check="0"]').isDisabled(),true);
        await page.clock.setFixedTime(new Date('2026-09-21T02:00:00Z'));
        await page.goto(base+path);await page.getByRole('button',{name:'All TAS tasks',exact:true}).click();
        assert.equal(await register.locator('[data-register-id="weekly-scan-0"] input').isChecked(),false);
        assert.equal(await register.locator('[data-register-id="weekly-scan-0::2026-09-14"] input').isChecked(),true);
      }
      await page.setViewportSize({width:390,height:844});
      await row.locator('h3 a').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await context.close();console.log('PASS '+wing+': review/reload, completed checklist, preserved notes/evidence, reopening, year and occurrence isolation, mobile');
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
