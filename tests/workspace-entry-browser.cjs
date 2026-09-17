// Local regression only. Fresh ephemeral contexts; no user browser or live accounts.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base='http://127.0.0.1:4173';
const personalKeys=['morning-launchpad-summary:v1','morning-launchpad-routine:v1'];
const nativeKeys={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2'};
const outputs=path.resolve(__dirname,'../../../outputs');
const results=[],runtimeErrors=[],httpErrors=[];
let browser;

async function check(name,body){
  if(process.env.WORKSPACE_ENTRY_MATCH&&!name.includes(process.env.WORKSPACE_ENTRY_MATCH))return;
  try{const details=await body();results.push({name,passed:true,...(details?{details}:{})});console.log('PASS '+name);}
  catch(error){results.push({name,passed:false,error:error.stack||error.message});console.log('FAIL '+name+'\n'+(error.stack||error.message));}
}
async function setup({seedPersonal=false}={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Australia/Sydney',serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base&&route.request().method()==='GET'?route.continue():route.abort());
  await context.addInitScript(({keys,seedPersonal,base})=>{
    if(location.origin!==base)return;
    const originalGet=Storage.prototype.getItem,originalSet=Storage.prototype.setItem;
    if(seedPersonal)for(const key of keys)if(originalGet.call(localStorage,key)===null)originalSet.call(localStorage,key,'SYNTHETIC PRIVATE STORAGE: '+key);
    window.__personalStorageAccess=[];
    // Test observations bypass the recorder so only application accesses count.
    window.__readStored=key=>originalGet.call(localStorage,key);
    for(const name of ['getItem','setItem','removeItem','clear']){
      const original=Storage.prototype[name];
      Storage.prototype[name]=function(...args){
        if(this===localStorage&&(name==='clear'||keys.includes(String(args[0]))))window.__personalStorageAccess.push({operation:name,key:name==='clear'?'*':String(args[0]),hash:location.hash});
        return original.apply(this,args);
      };
    }
  },{keys:personalKeys,seedPersonal,base});
  context.on('page',page=>{
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>runtimeErrors.push({url:page.url(),message:error.message}));
    page.on('response',response=>{if(new URL(response.url()).origin===base&&response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});
  });
  const page=await context.newPage();await page.clock.setFixedTime(new Date('2026-09-17T00:00:00Z'));
  return {context,page};
}
async function go(page,route){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('.workspace-header').waitFor();}
async function staffReady(page){await page.locator('#route-content h1').waitFor();assert.equal(await page.locator('.workspace-home').isVisible(),false);}
async function personalReady(page){await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&document.querySelector('.workspace-forecast')?.dataset.ready==='true');assert.equal(new URL(page.url()).hash,'#my-work');}
async function access(page){return page.evaluate(()=>window.__personalStorageAccess);}
async function stored(page,key=personalKeys[0]){return page.evaluate(key=>window.__readStored(key),key);}
async function inbox(page){return JSON.parse(await stored(page)||'{"items":[]}');}
async function assertUntouchedStaff(page){
  assert.equal(await page.locator('summary-import').count(),0,'Staff entry must not connect the personal component');
  assert.deepEqual(await access(page),[],'Staff page must not read, write or clear personal task/routine storage');
}
async function openPersonal(page){await page.locator('.workspace-my-work').click();await personalReady(page);}
async function nativeTask(page,wing){
  return page.evaluate(wing=>{
    const data=wing==='vet'?window.VET_WORKBOARD:window.HT_TAS_WORKBOARD;
    const tasks=wing==='vet'?data.taskRegister.tasks:data.tasks;
    const task=tasks.find(task=>!task.historyOnly&&!task.procedureOnly);
    return {id:task.id,title:task.title};
  },wing);
}

(async()=>{
  fs.mkdirSync(outputs,{recursive:true});browser=await chromium.launch({headless:true});
  await check('Staff home restores both wing choices and header destinations without opening personal work',async()=>{
    const {context,page}=await setup({seedPersonal:true});
    try{
      await go(page,'/#home');await staffReady(page);await assertUntouchedStaff(page);
      const chooser=page.getByRole('navigation',{name:'Choose a workboard',exact:true});
      assert.equal(await chooser.getByRole('link').count(),2);
      assert.equal(await chooser.getByRole('link',{name:'Enter the VET wing',exact:true}).getAttribute('href'),'#vet-home');
      assert.equal(await chooser.getByRole('link',{name:'Enter the Head Teacher TAS wing',exact:true}).getAttribute('href'),'head-teacher-tas/#home');
      assert.equal(await chooser.isVisible(),true);assert.equal(await page.locator('.route-bar').isVisible(),false,'Chooser does not show a VET-only navigation bar');
      await page.screenshot({path:path.join(outputs,'workspace-entry-chooser-desktop.png'),fullPage:true});
      const nav=page.getByRole('navigation',{name:'Workspace areas',exact:true});
      await nav.getByRole('link',{name:'VET',exact:true}).click();await page.waitForURL(base+'/#vet-home');await staffReady(page);
      assert.equal(await page.locator('#route-content h1').innerText(),'VET dashboard');await assertUntouchedStaff(page);
      await page.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name:'TAS',exact:true}).click();await page.waitForURL(base+'/head-teacher-tas/#home');await staffReady(page);
      assert.equal(await page.locator('#route-content h1').innerText(),'Head Teacher TAS');await assertUntouchedStaff(page);
      assert.equal(context.pages().length,1);
      await page.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name:'Home',exact:true}).click();await page.waitForURL(base+'/#home');await staffReady(page);await assertUntouchedStaff(page);
      await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(outputs,'workspace-entry-chooser-mobile.png'),fullPage:true});
      return {sameTab:true,chooserLinks:2,personalStorageAccesses:0};
    }finally{await context.close();}
  });

  await check('Staff routes and their refresh events leave existing personal and legacy storage entirely untouched',async()=>{
    const {context,page}=await setup({seedPersonal:true});
    const routes=['/#vet-home','/#today','/#workflows','/#cycle-2027','/head-teacher-tas/#home','/head-teacher-tas/#teaching','/head-teacher-tas/#people'];
    try{
      for(const route of routes){
        await go(page,route);await staffReady(page);
        await page.evaluate(async()=>{
          window.dispatchEvent(new CustomEvent('wwhs:forecast-updated'));
          window.dispatchEvent(new CustomEvent('wwhs:records-updated'));
          window.dispatchEvent(new Event('focus'));
          document.dispatchEvent(new Event('visibilitychange'));
          await new Promise(resolve=>setTimeout(resolve,60));
        });
        await assertUntouchedStaff(page);
        for(const key of personalKeys)assert.equal(await stored(page,key),'SYNTHETIC PRIVATE STORAGE: '+key,route+' preserves '+key);
      }
      return {routes,personalStorageAccesses:0};
    }finally{await context.close();}
  });

  await check('Explicit My work mounts forecasts; returning to staff pauses refresh and preserves an unsaved note draft',async()=>{
    const details=[];
    for(const wing of ['vet','tas']){
      const {context,page}=await setup();
      try{
        await go(page,wing==='vet'?'/#vet-home':'/head-teacher-tas/#home');await staffReady(page);await assertUntouchedStaff(page);
        await openPersonal(page);
        const saved=await inbox(page);assert.ok(saved.items.some(item=>item.origin?.wing===wing&&item.forecast?.active));
        const openedAccess=await access(page);assert.ok(openedAccess.some(event=>event.operation==='getItem'));assert.ok(openedAccess.some(event=>event.operation==='setItem'));
        await page.getByRole('button',{name:'Add my note',exact:true}).click();
        const title='Synthetic unsaved '+wing+' draft',note='This draft has deliberately not been saved.';
        await page.getByRole('textbox',{name:'Note title',exact:true}).fill(title);await page.getByRole('textbox',{name:'My note',exact:true}).fill(note);
        const before=await stored(page);
        await page.evaluate(()=>{window.__entryBoard=document.querySelector('summary-import');location.hash='#today';});
        await staffReady(page);await page.evaluate(()=>{window.__personalStorageAccess=[];});
        await page.evaluate(async()=>{
          window.dispatchEvent(new CustomEvent('wwhs:forecast-updated'));
          window.dispatchEvent(new CustomEvent('wwhs:records-updated'));
          window.dispatchEvent(new Event('focus'));
          await new Promise(resolve=>setTimeout(resolve,80));
        });
        assert.equal(await stored(page),before,'Hidden personal list does not change on staff events');
        assert.deepEqual(await access(page),[],'Background staff refresh does not access the personal store');
        await page.locator('.workspace-my-work').click();await personalReady(page);
        assert.equal(await page.evaluate(()=>document.querySelector('summary-import')===window.__entryBoard),true,'One persistent component retains the draft');
        assert.equal(await page.getByRole('textbox',{name:'Note title',exact:true}).inputValue(),title);
        assert.equal(await page.getByRole('textbox',{name:'My note',exact:true}).inputValue(),note);
        assert.equal((await inbox(page)).items.some(item=>item.title===title),false,'The draft was not silently saved');
        details.push({wing,forecastCards:saved.items.filter(item=>item.origin?.wing===wing).length,draftRetained:true});
      }finally{await context.close();}
    }
    return details;
  });

  await check('Native Add to my work explicitly mounts personal work and tracks the exact source occurrence',async()=>{
    const details=[];
    for(const wing of ['vet','tas']){
      const {context,page}=await setup();
      try{
        const prefix=wing==='vet'?'/':'/head-teacher-tas/';await go(page,prefix+(wing==='vet'?'#vet-home':'#home'));
        const task=await nativeTask(page,wing);await go(page,prefix+'#task/'+encodeURIComponent(task.id));await page.locator('#task-dialog[open]').waitFor();await assertUntouchedStaff(page);
        const expected=await page.evaluate(id=>window.WWHS_WORKBOARD_ADAPTER.describeTask(id),task.id),nativeBefore=await stored(page,nativeKeys[wing]);
        await page.locator('#task-dialog').locator(wing==='vet'?'[data-action="track-work-task"]':'[data-action="track-task"]').click();
        await page.waitForFunction(({wing,key})=>document.querySelector('summary-import')?.inbox?.items.some(item=>item.origin?.wing===wing&&item.origin.recordKey===key),{wing,key:expected.recordKey});
        assert.equal(new URL(page.url()).hash,'#my-work');assert.equal(await page.locator('summary-import').isVisible(),true);
        const matches=(await inbox(page)).items.filter(item=>item.origin?.wing===wing&&item.origin.recordKey===expected.recordKey);
        assert.equal(matches.length,1);assert.equal(matches[0].origin.taskId,task.id);assert.equal(matches[0].origin.cycle,expected.cycle);
        assert.equal(await stored(page,nativeKeys[wing]),nativeBefore,'Tracking leaves native records unchanged');
        details.push({wing,taskId:task.id,recordKey:expected.recordKey});
      }finally{await context.close();}
    }
    return details;
  });

  await check('Staff calendar choice opens a separate Launchpad after an earlier personal-work visit',async()=>{
    const {context,page}=await setup();
    try{
      await go(page,'/head-teacher-tas/#home');await openPersonal(page);
      await page.locator('.route-nav').getByRole('link',{name:'TAS wing',exact:true}).click();await staffReady(page);assert.equal(new URL(page.url()).hash,'#home');
      await page.locator('.route-nav').getByRole('link',{name:'Calendar ↗',exact:true}).click();await page.locator('.calendar-choice[open]').waitFor();
      const popupPromise=page.waitForEvent('popup');await page.locator('.calendar-choice').getByRole('link',{name:/^Launchpad calendar/}).click();const popup=await popupPromise;
      await popup.waitForURL(base+'/morning-launchpad/#calendar');await popup.locator('.workspace-header').waitFor();
      assert.equal(new URL(page.url()).hash,'#home','Staff page stays on the TAS wing');assert.equal(await page.locator('.workspace-home').isVisible(),false);
      assert.equal(context.pages().length,2);await popup.close();
      return {staffRoute:'/head-teacher-tas/#home',newTab:'/morning-launchpad/#calendar'};
    }finally{await context.close();}
  });
})().catch(error=>{results.push({name:'Browser setup',passed:false,error:error.stack||error.message});console.error(error.stack||error);}).finally(async()=>{
  if(browser)await browser.close();
  const report={base,isolatedContexts:true,syntheticDataOnly:true,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,results,runtimeErrors,httpErrors};
  fs.mkdirSync(outputs,{recursive:true});fs.writeFileSync(path.join(outputs,'workspace-entry-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(report.failed||runtimeErrors.length||httpErrors.length)process.exitCode=1;
});
