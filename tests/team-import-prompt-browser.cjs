// Local UI regression only: fresh disposable contexts, synthetic records, no user profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Run against a disposable local preview.');
const outputs=path.resolve(__dirname,'../../../outputs');
const keys={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2',review:'wwhs-task-register-review:v1',inbox:'morning-launchpad-summary:v1',meta:'wwhs-team-handover:v1',journal:'wwhs-team-handover-journal:v1'};
const currentFolder='https://drive.google.com/drive/folders/1cAlk5cGGQef1jOJ_x53RyhXuAUkZvKVA';
const importURL=wing=>base+`/team-handover/?wing=${wing}#start-section`;
const routes={vet:'/#vet-home',tas:'/head-teacher-tas/#home'};
const results=[],errors=[];
let browser;
function metadata(mode){
  if(mode==='individual')return null;
  if(mode==='corrupt')return '{invalid';
  const value={version:1,lastFile:{workspaceId:'synthetic-team',revision:3,exportId:'synthetic-export-3',savedBy:'Synthetic colleague',savedAt:'2026-09-19T01:00:00.000Z'}};
  if(mode==='editing'||mode==='exporting')value.active={id:'synthetic-session',editor:'Synthetic editor',phase:mode};
  return JSON.stringify(value);
}
async function setup(width,{mode='individual',dark=false,seed=false,journal=false}={}){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},timezoneId:'Australia/Sydney',serviceWorkers:'block',colorScheme:dark?'dark':'light'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base&&route.request().method()==='GET'?route.continue():route.abort());
  await context.addInitScript(({base,keys,rawMeta,dark,seed,journal})=>{
    if(location.origin!==base||sessionStorage.getItem('synthetic-import-test-seeded'))return;
    sessionStorage.setItem('synthetic-import-test-seeded','true');
    if(rawMeta!==null)localStorage.setItem(keys.meta,rawMeta);
    if(journal)localStorage.setItem(keys.journal,'synthetic interrupted handover: preserve exactly');
    if(dark)localStorage.setItem('morning-launchpad-theme','dark');
    if(seed){
      localStorage.setItem(keys.vet,JSON.stringify({schemaVersion:3,records:{'a-01-confirm-authority-set':{status:'in-progress',exceptionSummary:'Synthetic VET note to preserve',stepChecks:{0:true}}},assignments:{},gaps:{},eventOccurrences:[]}));
      localStorage.setItem(keys.tas,JSON.stringify({schemaVersion:2,records:{'class-readiness::2026':{status:'in-progress',exceptionReason:'Synthetic TAS note to preserve',steps:{0:true}}},weekly:{},scheduleOverrides:{}}));
      localStorage.setItem(keys.review,JSON.stringify({version:1,records:{}}));
      localStorage.setItem('synthetic-private-note','Keep this private text unchanged.');
    }
  },{base,keys,rawMeta:metadata(mode),dark,seed,journal});
  context.on('page',page=>{
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push({url:page.url(),type:'pageerror',message:error.message}));
    page.on('console',message=>{if(message.type()==='error')errors.push({url:page.url(),type:'console',message:message.text()});});
    page.on('response',response=>{if(new URL(response.url()).origin===base&&response.status()>=400)errors.push({type:'http',url:response.url(),status:response.status()});});
    page.on('requestfailed',request=>{if(new URL(request.url()).origin===base)errors.push({type:'requestfailed',url:request.url(),message:request.failure()?.errorText});});
  });
  const page=await context.newPage();
  await page.clock.setFixedTime(new Date('2026-09-19T01:00:00.000Z'));
  return {context,page};
}
const prompt=page=>page.locator('dialog').filter({has:page.getByText('Import shared progress',{exact:true})});
const banner=page=>page.locator('.workspace-team-banner');
const importLink=scope=>scope.getByRole('link',{name:/^Import shared progress/});
async function go(page,route){
  const response=await page.goto(base+route,{waitUntil:'networkidle'});
  if(response)assert.equal(response.status(),200,route);
  await page.locator('.workspace-header').waitFor();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
}
async function raw(page){return page.evaluate(()=>({...localStorage}));}
async function protectedRaw(page){return page.evaluate(keys=>Object.fromEntries([...Object.values(keys).filter(key=>key!=='morning-launchpad-summary:v1'),'synthetic-private-note'].map(key=>[key,localStorage.getItem(key)])),keys);}
async function noPrompt(page){assert.equal(await prompt(page).isVisible(),false,'No automatic import prompt here');}
async function fits(page){
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,dialogs:[...document.querySelectorAll('dialog[open]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,scroll:el.scrollWidth,client:el.clientWidth};})}));
  assert.ok(size.scroll<=size.width+1,`Horizontal overflow: ${JSON.stringify(size)}`);
  for(const dialog of size.dialogs){assert.ok(dialog.left>=-1&&dialog.right<=size.width+1,'Open dialog fits screen');assert.ok(dialog.scroll<=dialog.client+1,'Dialog contents fit screen');}
}
async function check(name,body){
  if(process.env.TEAM_IMPORT_TEST_MATCH&&!name.includes(process.env.TEAM_IMPORT_TEST_MATCH))return;
  try{await body();results.push({name,passed:true});console.log('PASS '+name);}
  catch(error){results.push({name,passed:false,error:error.stack||error.message});console.error('FAIL '+name+'\n'+(error.stack||error.message));}
}
async function withPage(width,options,body){const {context,page}=await setup(width,options);try{await body(page);}finally{await context.close();}}

(async()=>{
  fs.mkdirSync(outputs,{recursive:true});
  browser=await chromium.launch({headless:true});
  await check('390: interrupted journal excludes the first-entry prompt and preserves recovery data',()=>withPage(390,{journal:true,seed:true},async page=>{
    await go(page,routes.vet);await noPrompt(page);await fits(page);
    assert.match(await banner(page).innerText(),/handover was interrupted/i);
    assert.equal(await banner(page).getByRole('button',{name:'How to import',exact:true}).isVisible(),false);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys.journal),'synthetic interrupted handover: preserve exactly');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys.meta),null,'The prompt does not create team metadata during recovery');
    const before=await raw(page);await page.reload({waitUntil:'networkidle'});await noPrompt(page);
    assert.deepEqual(await raw(page),before,'Reloading recovery guidance leaves all saved data unchanged');
  }));
  for(const width of [390,1440]){
    for(const wing of ['vet','tas'])await check(`${width}: fresh ${wing.toUpperCase()} prompt, dismissal and persistent import action`,()=>withPage(width,{seed:true,dark:width===390},async page=>{
      await go(page,routes[wing]);await prompt(page).waitFor({state:'visible'});await fits(page);
      assert.equal(await page.locator('dialog:modal').count(),1,'Only the import dialog is modal');
      assert.equal(await importLink(prompt(page)).getAttribute('href'),importURL(wing));
      assert.equal(await prompt(page).locator(`a[href="${currentFolder}"]`).count(),1,'Current handover Drive folder is explicit');
      const before=await raw(page),protectedBefore=await protectedRaw(page);
      await page.screenshot({path:path.join(outputs,`team-import-${wing}-${width}.png`)});
      if(width===390){
        await page.evaluate(()=>document.documentElement.dataset.theme='light');
        await page.screenshot({path:path.join(outputs,`team-import-${wing}-${width}-light.png`)});
        await page.evaluate(()=>document.documentElement.dataset.theme='dark');
      }
      await prompt(page).getByRole('button',{name:/browse.*without.*import/i}).click();
      await noPrompt(page);assert.deepEqual(await raw(page),before,'Dismissal leaves every localStorage value unchanged');
      assert.equal(await banner(page).isVisible(),true);assert.equal(await importLink(banner(page)).getAttribute('href'),importURL(wing));
      await banner(page).getByRole('button',{name:'How to import',exact:true}).click();await prompt(page).waitFor({state:'visible'});
      assert.deepEqual(await raw(page),before,'Reopening the guide leaves saved progress unchanged');
      await prompt(page).getByRole('button',{name:/browse.*without.*import/i}).click();await noPrompt(page);
      await fits(page);
      const other=wing==='vet'?'tas':'vet';
      await page.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name:other.toUpperCase(),exact:true}).click();
      await page.waitForURL(base+routes[other]);await page.waitForLoadState('networkidle');await noPrompt(page);await fits(page);
      assert.deepEqual(await protectedRaw(page),protectedBefore,'Wing navigation preserves native records, review, team and private storage');
      await page.reload({waitUntil:'networkidle'});await noPrompt(page);
      const beforeImport=await raw(page);
      await importLink(banner(page)).click();await page.waitForURL(importURL(other));await page.locator('#team-file').waitFor();
      assert.deepEqual(await raw(page),beforeImport,'Opening the import page does not import or change progress');
      assert.equal(await page.locator('#start-section').isVisible(),true);
    }));

    await check(`${width}: gateway, personal work and Launchpad stay free of import prompts`,()=>withPage(width,{},async page=>{
      for(const route of ['/#home','/#my-work','/head-teacher-tas/#my-work','/morning-launchpad/']){await go(page,route);await noPrompt(page);await fits(page);}
      await go(page,routes.vet);await prompt(page).waitFor({state:'visible'});
      const before=await raw(page);await page.keyboard.press('Escape');await noPrompt(page);assert.deepEqual(await raw(page),before,'Escape does not alter task data');
      await page.reload({waitUntil:'networkidle'});await noPrompt(page);
    }));

    for(const mode of ['viewing','editing','exporting','corrupt'])await check(`${width}: managed ${mode} has no first-entry modal`,()=>withPage(width,{mode,seed:true},async page=>{
      for(const wing of ['vet','tas']){
        await go(page,routes[wing]);await noPrompt(page);await fits(page);assert.equal(await banner(page).isVisible(),true);
        if(mode==='viewing')assert.equal(await importLink(banner(page)).getAttribute('href'),importURL(wing),'View-only snapshots keep import easy to find');
        if(mode==='editing')assert.match(await banner(page).innerText(),/Editing as Synthetic editor/);
        assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys.meta),metadata(mode),'Displaying team status does not mutate session state');
      }
    }));

    for(const [wing,route] of [['vet','/#task/a-01-confirm-authority-set'],['tas','/head-teacher-tas/#task/class-readiness']])await check(`${width}: ${wing} native task dialog is not covered by another modal`,()=>withPage(width,{},async page=>{
      await go(page,route);await page.locator('#task-dialog[open]').waitFor();await noPrompt(page);
      assert.equal(await page.locator('dialog:modal').count(),1);await fits(page);
    }));
  }
})().catch(error=>{results.push({name:'Browser setup',passed:false,error:error.stack||error.message});console.error(error);}).finally(async()=>{
  if(browser)await browser.close();
  const report={base,disposableContexts:true,syntheticRecordsOnly:true,passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,results,errors};
  fs.mkdirSync(outputs,{recursive:true});fs.writeFileSync(path.join(outputs,process.env.TEAM_IMPORT_TEST_MATCH?'team-import-prompt-browser-filtered-report.json':'team-import-prompt-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));if(report.failed||errors.length)process.exitCode=1;
});
