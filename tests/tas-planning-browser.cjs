// Disposable local browser contexts only. Never connect to a user's profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.WORKBOARD_TEST_URL || 'http://127.0.0.1:43175';
const nativeKey='wwhs-head-teacher-tas-workboard:v2';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use an isolated local preview URL.');

(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Australia/Sydney',acceptDownloads:true});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  const native=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),nativeKey);
  const dialog=page.locator('#task-dialog');
  const form=page.locator('#planning-date-form');
  const openEdit=async(target=page)=>target.locator('#planning-date-panel summary').click();
  const openRegister=async()=>{
    await page.goto(base+'/head-teacher-tas/#home');
    await page.getByRole('button',{name:'All TAS tasks',exact:true}).click();
    const register=page.locator('.workspace-register');
    await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2027');
    return register;
  };
  const closeTask=async()=>dialog.getByRole('button',{name:'Close task',exact:true}).click();
  try{
    await page.clock.setFixedTime(new Date('2026-09-18T02:00:00Z'));
    await page.goto(base+'/head-teacher-tas/#home');
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({
      schemaVersion:2,linkDefaultsVersion:2,mode:'guided',guidance:true,links:{},weekly:{},eventOccurrences:{},
      records:{'class-readiness::2026':{status:'in-progress',steps:{0:true},milestones:{},
        exceptionReason:'Synthetic 2026 note to preserve.',evidenceRef:'Synthetic reference',verifier:'HT',
        sourceChecked:true,doneConfirmed:false,updatedAt:'2026-09-18T02:00:00.000Z'}}
    })),nativeKey);
    await page.reload();
    const originalRecords=(await native()).records;
    let register=await openRegister();
    assert.equal(await register.locator('.register-row').count(),65,'2027 includes 29 dated planning entries and 36 continuing duties/checks');
    const model=await page.evaluate(()=>window.WWHS_WORKBOARD_ADAPTER.getTaskRegister());
    assert.equal(model.items.filter(item=>item.year==='2027').length,29);
    assert.equal(model.items.filter(item=>item.year==='ongoing').length,36);
    const firstId='2027-t1-year-opening-readiness';
    let row=register.locator('[data-register-id="'+firstId+'"]');
    assert.match(await row.innerText(),/Provisional dates.*based on 2026/);
    assert.match(await row.locator('.register-timing').innerText(),/2027-02-02/);
    assert.equal(await row.locator('input[type="checkbox"]').isDisabled(),true,'Future work is not signed off by date planning');
    await row.locator('h3 a').click();
    await dialog.waitFor({state:'visible'});
    assert.match(await dialog.locator('#task-dialog-title').innerText(),/Open the year/);
    const sourceLinks=await dialog.locator('.task-source-panel a[href^="https:"]').evaluateAll(nodes=>nodes.map(node=>node.href).sort());
    assert.ok(sourceLinks.length>0,'Planning cards retain direct canonical source links');
    await openEdit();
    const draft='Synthetic unsaved progress note retained while editing dates.';
    await dialog.locator('textarea[name="exceptionReason"]').fill(draft);
    await form.locator('[name="dueDate"]').fill('2027-02-06');
    await form.getByRole('button',{name:'Save dates',exact:true}).click();
    assert.match(await dialog.locator('.planning-weekend').innerText(),/Weekend check/);
    assert.equal(await dialog.locator('textarea[name="exceptionReason"]').inputValue(),draft,'Saving dates retains unsaved progress notes');
    assert.equal((await native()).scheduleOverrides[firstId].confirmed,false);
    await openEdit();
    await form.locator('[name="confirmed"]').check();
    await form.getByRole('button',{name:'Save dates',exact:true}).click();
    assert.match(await form.locator('.form-error').innerText(),/Add the source you checked/);
    assert.equal((await native()).scheduleOverrides[firstId].confirmed,false,'Cannot confirm without a source note');
    await form.locator('[name="dueDate"]').fill('2027-02-08');
    assert.equal(await form.locator('[name="confirmed"]').isChecked(),false,'Changing a date requires fresh confirmation');
    await form.locator('[name="sourceNote"]').fill('Synthetic current calendar confirmation.');
    await form.locator('[name="confirmed"]').check();
    await form.getByRole('button',{name:'Save dates',exact:true}).click();
    assert.match(await dialog.locator('.dialog-badges').innerText(),/Dates confirmed by you/);
    assert.match(await dialog.locator('.source-details .pill.source').textContent(),/Dates confirmed by you/);
    assert.equal(await dialog.locator('.planning-weekend').count(),0);
    assert.equal(await dialog.locator('textarea[name="exceptionReason"]').inputValue(),draft);
    assert.equal(await dialog.locator('.action-list input:checked').count(),0,'Date confirmation does not complete checklist steps');
    assert.deepEqual((await native()).records,originalRecords,'Date edits preserve all 2026 progress and notes');
    await closeTask();
    assert.match(await register.locator('[data-register-id="'+firstId+'"] .register-timing').innerText(),/2027-02-08/);
    await page.reload();register=await openRegister();row=register.locator('[data-register-id="'+firstId+'"]');
    assert.match(await row.innerText(),/Dates confirmed by you/);
    assert.match(await row.locator('.register-timing').innerText(),/2027-02-08/);
    console.log('PASS 2027 register totals, provisional labels, single-date edit, confirmation validation, reload and note preservation');

    await page.goto(base+'/head-teacher-tas/#task/t1-year-opening-readiness');
    await dialog.waitFor({state:'visible'});
    assert.deepEqual(await dialog.locator('.task-source-panel a[href^="https:"]').evaluateAll(nodes=>nodes.map(node=>node.href).sort()),sourceLinks,'The 2027 clone retains its original direct source destinations');
    await closeTask();
    const chainId='2027-t2-year12-report-chain';
    await page.goto(base+'/head-teacher-tas/#task/'+chainId);await dialog.waitFor({state:'visible'});await openEdit();
    const milestoneInputs=form.locator('input[name^="milestone-"]');
    const count=await milestoneInputs.count();assert.ok(count>1,'A reporting chain has several dates to edit');
    const dates=Array.from({length:count},(_,index)=>'2027-04-'+String(20+index).padStart(2,'0'));
    for(let index=0;index<count;index++)await milestoneInputs.nth(index).fill(dates[index]);
    await milestoneInputs.nth(1).fill('2027-04-19');
    await form.getByRole('button',{name:'Save dates',exact:true}).click();
    assert.match(await form.locator('.form-error').innerText(),/earliest to latest/);
    assert.equal((await native()).scheduleOverrides[chainId],undefined,'Invalid milestone order cannot be persisted');
    await milestoneInputs.nth(1).fill(dates[1]);
    await form.getByRole('button',{name:'Save dates',exact:true}).click();
    assert.deepEqual((await native()).scheduleOverrides[chainId].milestones,dates);
    assert.equal((await native()).scheduleOverrides[chainId].dueDate,dates[0]);
    assert.deepEqual(await dialog.locator('.milestone-list time').evaluateAll(nodes=>nodes.map(node=>node.dateTime)),dates,'All displayed milestone dates update immediately');
    await closeTask();
    await page.goto(base+'/head-teacher-tas/#calendar');
    await page.locator('#tas-calendar-year').selectOption('2027');
    assert.match(await page.locator('#route-content').innerText(),/2027/);
    assert.ok(await page.locator('[data-task-id="'+firstId+'"]').count()>0,'Calendar exposes the editable planning task');
    assert.ok(await page.locator('[data-task-id="'+chainId+'"]').count()>0,'Calendar exposes the reporting chain');
    console.log('PASS canonical direct sources, milestone order validation, saved date chain and calendar selection');

    register=await openRegister();
    await page.setViewportSize({width:390,height:844});
    row=register.locator('[data-register-id="'+firstId+'"]');await row.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile register has no horizontal overflow');
    await row.locator('h3 a').click();await openEdit();
    assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Mobile date form has no horizontal overflow');
    await form.getByRole('button',{name:'Restore 2026 pattern',exact:true}).click();
    assert.equal((await native()).scheduleOverrides[firstId],undefined);
    assert.match(await dialog.locator('.dialog-badges').innerText(),/Provisional dates/);
    await openEdit();assert.equal(await form.locator('[name="dueDate"]').inputValue(),'2027-02-02');
    await closeTask();await page.setViewportSize({width:1440,height:1050});
    console.log('PASS mobile register/form layout and restore baseline');

    await page.goto(base+'/head-teacher-tas/#task/'+firstId);await dialog.waitFor({state:'visible'});await openEdit();
    await form.locator('[name="dueDate"]').fill('2027-02-10');
    await dialog.locator('textarea[name="exceptionReason"]').fill(draft);
    const newer=await context.newPage();newer.on('pageerror',error=>errors.push(error.message));
    await newer.clock.setFixedTime(new Date('2026-09-18T02:00:00Z'));
    await newer.goto(base+'/head-teacher-tas/#task/'+firstId);await newer.locator('#task-dialog').waitFor({state:'visible'});await openEdit(newer);
    await newer.locator('#planning-date-form [name="dueDate"]').fill('2027-02-11');
    await newer.locator('#planning-date-form').getByRole('button',{name:'Save dates',exact:true}).click();
    const newerSaved=await native();
    await form.getByRole('button',{name:'Save dates',exact:true}).click();
    assert.match(await page.locator('#toast-region').innerText(),/changed in another tab/);
    assert.deepEqual(await native(),newerSaved,'Stale date save cannot overwrite the newer tab');
    assert.equal(await dialog.locator('textarea[name="exceptionReason"]').inputValue(),draft,'A rejected stale save retains the draft');
    await newer.close();await page.reload();if(await dialog.isVisible())await closeTask();
    await page.goto(base+'/head-teacher-tas/#reference');
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export backup',exact:true}).click();
    const download=await downloadPromise,stream=await download.createReadStream(),chunks=[];
    for await(const chunk of stream)chunks.push(chunk);
    const backup=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(backup.kind,'WWHS-HEAD-TEACHER-TAS-WORKBOARD-BACKUP');
    assert.deepEqual(backup.state.scheduleOverrides,newerSaved.scheduleOverrides,'The ordinary TAS backup includes all date edits');
    assert.deepEqual(backup.state.records,originalRecords,'The ordinary TAS backup retains untouched 2026 progress');
    assert.equal(backup.state.links,undefined,'Existing authenticated-link exclusion remains intact');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS stale-tab save refusal, draft preservation, backup date overrides and intact 2026 records');
  }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
