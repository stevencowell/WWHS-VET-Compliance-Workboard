// Disposable local browser only. Never attach to a user's profile or live storage.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL || 'http://127.0.0.1:43175';
const output=path.resolve(process.env.WORKBOARD_TEST_OUTPUT || '../../outputs');
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use an isolated local preview URL.');
fs.mkdirSync(output,{recursive:true});
const handbook='https://docs.google.com/document/d/1nhUiViZFMjSbrn5aWuTiLSVwKUdwu--f/edit';
const nativeKeys=['wwhs-vet-compliance-workboard:v3','wwhs-head-teacher-tas-workboard:v2','wwhs-task-register-review:v1'];
const snapshot=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),nativeKeys);
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  const context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Australia/Sydney'});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-09-18T02:00:00Z'));
  try{
    await page.goto(base+'/#task/a-08-publish-local-handbook');
    const dialog=page.locator('#task-dialog'),panel=dialog.locator('.task-source-panel');
    await dialog.waitFor({state:'visible'});
    await dialog.locator('.task-clarity-reference>summary').click();
    await page.waitForLoadState('networkidle');
    const initial=await snapshot(page);
    assert.equal(await panel.locator('a[href="'+handbook+'"]').count(),1);
    assert.ok(await panel.locator('a[href="'+handbook+'"]').isVisible());
    assert.match(await panel.innerText(),/Original source wording/);
    assert.match(await panel.innerText(),/Whole School/);
    assert.ok(await panel.evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('#task-dialog .step-list'))&Node.DOCUMENT_POSITION_PRECEDING)));
    assert.equal(await dialog.getByRole('heading',{name:'What to do',exact:true}).count(),1);
    await page.screenshot({path:path.join(output,'direct-sources-vet-handbook-desktop.png')});
    const [audit]=await Promise.all([context.waitForEvent('page'),panel.getByRole('link',{name:/View source details/}).click()]);
    audit.on('pageerror',error=>errors.push(error.message));
    await audit.waitForLoadState('domcontentloaded');
    await audit.locator('#task-list .card').first().waitFor();
    assert.equal(await audit.locator('#task-list .card').count(),1);
    assert.match(await audit.locator('#task-list').innerText(),/Update and share the School VET Handbook/);
    assert.equal(await audit.locator('#task-list details[open]').count(),1);
    await audit.locator('#reset').click();
    assert.equal(await audit.locator('#task-list .card').count(),61);
    assert.ok(!new URL(audit.url()).searchParams.has('task'));
    await audit.close();
    assert.deepEqual(await snapshot(page),initial,'Source mapping navigation preserves native and review state');
    await page.setViewportSize({width:390,height:844});
    await panel.locator('a[href="'+handbook+'"]').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
    await page.screenshot({path:path.join(output,'direct-sources-vet-handbook-mobile.png')});
    console.log('PASS VET: visible exact handbook source, source disclosure after steps, exact audit focus/reset, unchanged native state, mobile overflow');

    await page.setViewportSize({width:1440,height:1100});
    for(const fixture of [
      {id:'annual-plan-alignment',label:'plan',url:'/1g5MMPHgj1Yk1vO7-obIyAaavUj5_w16dDq6ueQ_kyYg/'},
      {id:'workshop-routine',label:'maintenance',url:'/1r4TfBMm8cwgsqUtTRkCX25ofazCstjphwLLFr42foQ0/'}
    ]){
      await page.goto(base+'/head-teacher-tas/#task/'+fixture.id);
      await dialog.waitFor({state:'visible'});
      await dialog.locator('.task-clarity-reference>summary').click();
      const direct=panel.locator('a[href*="'+fixture.url+'"]');
      assert.equal(await direct.count(),1);
      assert.ok(await direct.isVisible());
      assert.ok(await panel.evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('#task-dialog .action-list'))&Node.DOCUMENT_POSITION_PRECEDING)));
      await page.screenshot({path:path.join(output,'direct-sources-tas-'+fixture.label+'-desktop.png')});
      await page.setViewportSize({width:390,height:844});
      await direct.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
      await page.screenshot({path:path.join(output,'direct-sources-tas-'+fixture.label+'-mobile.png')});
      await page.setViewportSize({width:1440,height:1100});
      console.log('PASS TAS '+fixture.label+': exact source disclosure after steps, mobile overflow');
    }
    assert.deepEqual(errors,[],'No page errors');
  }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
