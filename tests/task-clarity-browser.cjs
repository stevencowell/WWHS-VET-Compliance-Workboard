// Disposable local browser data only. No saved user profile or real progress.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:43175';
const output=path.resolve(__dirname,'../../../outputs');
const errors=[];
(async()=>{
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true});
  try{for(const wing of ['vet','tas']){
    const context=await browser.newContext({viewport:{width:1360,height:1000},timezoneId:'Australia/Sydney',serviceWorkers:'block'});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
    await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
    const route=wing==='vet'?'/':'/head-teacher-tas/';
    await page.goto(base+route+(wing==='vet'?'#vet-home':'#home'));
    await page.waitForFunction(()=>window.WWHS_WORKBOARD_ADAPTER&&document.querySelector('.workspace-register'));
    await page.getByRole('button',{name:`All ${wing.toUpperCase()} tasks`,exact:true}).click();
    const register=page.locator('.workspace-register');await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2027');
    await register.getByRole('combobox',{name:'Register view',exact:true}).selectOption('all');
    const row=register.locator('.register-row').filter({has:page.locator('.task-clarity-purpose')}).first();
    const snapshot=await page.evaluate(()=>window.WWHS_WORKBOARD_ADAPTER.getTaskRegister());
    assert.ok(snapshot.items.every(x=>x.clarity),'All register entries carry presentation data');
    assert.ok(await row.locator('.task-clarity-purpose').isVisible());
    assert.ok((await row.locator('.task-clarity-disclosure>summary').innerText()).includes('When:'));
    assert.equal(await row.locator('.task-clarity-disclosure').evaluate(el=>el.open),false);
    await row.locator('.task-clarity-disclosure>summary').click();
    assert.ok(await row.locator('.task-clarity-outcome').isVisible());
    assert.ok(await row.locator('.task-clarity-steps li').count()>0);
    const second=register.locator('.register-row').filter({has:page.locator('.task-clarity-purpose')}).nth(1);
    await second.locator('.task-clarity-disclosure>summary').click();
    assert.equal(await row.locator('.task-clarity-disclosure').evaluate(el=>el.open),false,'Only one task opens at once');
    await row.locator('.task-clarity-disclosure>summary').click();
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      for(const width of [1360,390]){
        await page.setViewportSize({width,height:1000});await row.scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await row.screenshot({path:path.join(output,`clear-task-${wing}-${theme}-${width}.png`)});
      }
    }
    // Check a real editable native checklist keeps its saved index after reload.
    const id=wing==='vet'?'2027-g01-authority':'annual-plan-alignment';
    await page.goto(base+route+'#task/'+id);
    const dialog=page.locator('#task-dialog');await dialog.waitFor({state:'visible'});
    assert.ok(await dialog.locator('.task-clarity-outcome').isVisible());
    assert.equal(await dialog.locator('.task-clarity-reference').first().evaluate(el=>el.open),false);
    const check=dialog.locator('[data-task-step="0"]');await check.check();
    await page.goto(base+route+'?check=reload#task/'+id);await dialog.waitFor({state:'visible'});assert.equal(await check.isChecked(),true);
    await dialog.locator('.task-clarity-reference>summary').first().click();
    assert.ok(await dialog.locator('.task-source-panel').isVisible());
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await dialog.locator('.task-clarity-reference>summary').first().click();
    await dialog.evaluate(el=>{el.scrollTop=0;el.querySelector('.dialog-body')?.scrollTo(0,0);});
    await page.screenshot({path:path.join(output,`clear-native-${wing}-390.png`)});
    console.log(`PASS ${wing}: short fronts, finished goal, numbered steps, one open, source disclosure, 1360/390 light/dark and saved checklist reload`);
    await context.close();
  }assert.deepEqual(errors,[]);}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
