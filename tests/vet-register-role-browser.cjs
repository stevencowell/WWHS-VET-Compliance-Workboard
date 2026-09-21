// Fresh Chrome context and synthetic saved settings; never uses a real profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:43175';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1360,height:1000},timezoneId:'Australia/Sydney'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/#vet-home');await page.waitForFunction(()=>window.WWHS_WORKBOARD_ADAPTER);
    const fixture=await page.evaluate(()=>{
      const key=window.VET_WORKBOARD.config.storageKey,store=window.WWHS_STORAGE||localStorage;
      const data={schemaVersion:3,linkDefaultsVersion:2,role:'htvet',records:{'c-01-rto-updates':{status:'in-progress',stepChecks:{0:true},exceptionSummary:'Synthetic note to preserve'}},assignments:{'c-01-rto-updates':'VET Coordinator'}};
      const raw=JSON.stringify(data);store.setItem(key,raw);return {key,raw};
    });
    await page.reload();await page.waitForFunction(()=>window.WWHS_WORKBOARD_ADAPTER);
    await page.getByRole('button',{name:'All VET tasks',exact:true}).click();
    const register=page.locator('.workspace-register');
    await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2026');
    assert.equal(await register.locator('.register-row').count(),61);
    assert.match(await register.locator('.register-counts[role="status"]').innerText(),/Showing 61 of 61 entries for 2026\. All VET roles\./);
    await register.scrollIntoViewIfNeeded();await page.screenshot({path:path.resolve(__dirname,'../../../outputs/vet-register-chrome-head-teacher.png')});
    await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('2027');
    assert.equal(await register.locator('.register-row').count(),185);
    await register.getByRole('combobox',{name:'Register year',exact:true}).selectOption('all');
    assert.equal(await register.locator('.register-row').count(),246);
    assert.equal(await page.evaluate(({key})=>(window.WWHS_STORAGE||localStorage).getItem(key),fixture),fixture.raw);
    assert.equal(await page.evaluate(()=>window.WWHS_WORKBOARD_ADAPTER.getForecast().context.role),'htvet');
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    console.log('PASS Chrome: saved Head Teacher VET role shows 61 tasks for 2026, 185 for 2027 and all 246; saved settings/progress unchanged; mobile fits');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
