// Disposable local browser contexts. Never reads or changes the user's profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:4173',reviewKey='wwhs-task-register-review:v1';
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try{
    for(const wing of ['vet','tas']){
      const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Australia/Sydney'});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.clock.setFixedTime(new Date('2026-09-17T02:00:00Z'));
      const route=wing==='vet'?'/#vet-home':'/head-teacher-tas/#home';
      await page.goto(base+route);await page.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true');
      await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();
      const register=page.locator('.workspace-register'),view=register.getByRole('combobox',{name:'Register view',exact:true}),year=register.getByRole('combobox',{name:'Register year',exact:true});
      assert.equal(await register.getAttribute('open'),'');
      const snapshot=await page.evaluate(()=>window.WWHS_WORKBOARD_ADAPTER.getTaskRegister());
      assert.ok(snapshot.items.length>20);assert.ok(snapshot.items.some(x=>x.historyOnly));assert.ok(snapshot.items.some(x=>x.schedule.kind==='trigger'||x.schedule.kind==='recurring'));
      const expected=snapshot.items.filter(x=>x.year==='2026'||x.year==='ongoing');
      assert.equal(await register.locator('.register-row').count(),expected.length);
      const originalNative=await page.evaluate(wing=>localStorage.getItem(wing==='vet'?'wwhs-vet-compliance-workboard:v3':'wwhs-head-teacher-tas-workboard:v2'),wing);
      await view.selectOption('past');assert.ok(await register.locator('.register-row').count()>0);
      const beforePast=await register.locator('.register-row').count();
      const check=register.locator('.register-tick input:not(:disabled)').first();
      const label=await check.getAttribute('aria-label');await register.getByRole('checkbox',{name:label,exact:true}).click();
      assert.equal(await register.locator('.register-row').count(),beforePast-1);
      const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),reviewKey);assert.equal(Object.keys(stored.records).length,1);assert.ok(Object.keys(stored.records)[0].startsWith(wing+':2026:'));
      assert.equal(await page.evaluate(wing=>localStorage.getItem(wing==='vet'?'wwhs-vet-compliance-workboard:v3':'wwhs-head-teacher-tas-workboard:v2'),wing),originalNative);
      await view.selectOption('complete');assert.equal(await register.getByRole('checkbox',{name:label,exact:true}).isChecked(),true);
      await page.reload();await page.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true');await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();await view.selectOption('complete');assert.equal(await register.getByRole('checkbox',{name:label,exact:true}).isChecked(),true);
      if(wing==='vet'){
        await year.selectOption('2027');await view.selectOption('all');assert.ok(await register.locator('.register-row').count()>100);
        assert.equal(await register.locator('.register-tick input:not(:disabled)').count(),0,'2027 work cannot be prematurely ticked off');
        assert.equal(await register.locator('.register-tick input:checked').count(),0,'2026 completion cannot complete 2027');
        const area=register.getByRole('combobox',{name:'Task area or term',exact:true});
        const firstTerm=await area.locator('option').allTextContents();const term=firstTerm.find(x=>/^Term 1$/i.test(x));assert.ok(term);await area.selectOption({label:term});
        assert.ok(await register.locator('.register-row').count()>0);assert.ok(await register.locator('.register-row').count()<100);await area.selectOption('all');
      }else{
        await year.selectOption('2027');await view.selectOption('all');assert.ok(await register.locator('.register-row').count()>0);
        assert.ok((await register.locator('.register-review-note').innerText()).includes('No dated calendar is loaded'));
        assert.equal(await register.locator('.register-tick input:checked').count(),0,'2026 review cannot complete future ongoing duties');
      }
      await year.selectOption('all');await view.selectOption('all');assert.equal(await register.locator('.register-row').count(),snapshot.items.length);
      await view.selectOption('gaps');assert.ok(await register.locator('.register-row').count()>0);
      await view.selectOption('all');await year.selectOption('2026');
      await register.getByRole('searchbox').fill('zz-no-such-task');assert.equal(await register.locator('.register-row').count(),0);await register.getByRole('searchbox').fill('');
      await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:`../../outputs/full-register-${wing}-mobile.png`,fullPage:false});
      if(wing==='tas'){
        const weekly=register.locator('[data-register-id="weekly-scan-0"] input');await weekly.click();
        await page.clock.setFixedTime(new Date('2026-09-21T02:00:00Z'));await page.reload();await page.getByRole('button',{name:'All TAS tasks',exact:true}).click();
        assert.equal(await register.locator('[data-register-id="weekly-scan-0"] input').isChecked(),false,'A review tick must not complete the next weekly occurrence');
      }
      await page.evaluate(key=>localStorage.setItem(key,'unreadable synthetic backup'),reviewKey);await page.reload();await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();
      await register.locator('.register-backup>summary').click();page.once('dialog',dialog=>dialog.accept());
      await register.getByLabel('Restore review ticks',{exact:true}).setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(stored))});
      await page.waitForFunction(key=>{try{return JSON.parse(localStorage.getItem(key)).version===1;}catch{return false;}},reviewKey);
      assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),reviewKey),stored,'A valid backup can recover unreadable review storage');
      await context.close();console.log(`PASS ${wing}: full coverage, past dates, review save/reload, future-year isolation, native record preservation, filters and mobile`);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
