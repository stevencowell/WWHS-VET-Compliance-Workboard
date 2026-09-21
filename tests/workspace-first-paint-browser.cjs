// Fresh disposable Chrome contexts only: no user profile or saved work is read.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:43175').replace(/\/$/,'');
const outputs=path.resolve(__dirname,'../../../outputs');
const cases=[
  {wing:'vet',route:'/#vet-home',light:'rgb(241, 245, 250)',dark:'rgb(20, 33, 47)'},
  {wing:'tas',route:'/head-teacher-tas/#home',light:'rgb(245, 243, 249)',dark:'rgb(32, 30, 41)'},
  {wing:'launchpad',route:'/morning-launchpad/',light:'rgb(244, 245, 240)',dark:'rgb(20, 33, 31)'}
];
const results=[];
let browser;

function assertVisibleDocument(snapshot,label){
  assert.equal(snapshot.shared,true,label+': shared layout applies before module hydration');
  for(const [name,style] of Object.entries(snapshot.documentStyles)){
    assert.notEqual(style.display,'none',label+': '+name+' is not display-hidden');
    assert.equal(style.visibility,'visible',label+': '+name+' is not visibility-hidden');
    assert.equal(style.opacity,'1',label+': '+name+' is not faded out');
  }
}

async function snapshot(page){
  return page.evaluate(()=>{
    const style=element=>{
      const css=getComputedStyle(element);
      return {display:css.display,visibility:css.visibility,opacity:css.opacity};
    };
    return {
      shared:document.body.classList.contains('shared-workspace'),
      theme:document.documentElement.dataset.theme,
      colour:getComputedStyle(document.body).backgroundColor,
      headers:document.querySelectorAll('.workspace-header').length,
      documentStyles:{html:style(document.documentElement),body:style(document.body)},
      legacy:[...document.querySelectorAll('.sidebar,.topbar .brand')].map(element=>({
        selector:element.className,display:getComputedStyle(element).display,
        width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height
      }))
    };
  });
}

async function check(testCase,width,theme){
  const name=`${testCase.wing} ${width}px ${theme}`;
  const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Australia/Sydney'});
  const errors=[];
  let releaseModule;
  const moduleGate=new Promise(resolve=>{releaseModule=resolve;});
  let noticeHeld;
  const held=new Promise(resolve=>{noticeHeld=resolve;});
  let released=false;
  await context.addInitScript(theme=>localStorage.setItem('morning-launchpad-theme',theme),theme);
  await context.route('**/summary-import.mjs*',async route=>{
    if(!released){noticeHeld();await moduleGate;}
    await route.continue();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  try{
    // DOMContentLoaded waits for deferred modules. Inspect the painted HTML/CSS
    // while the shared shell's transitive module dependency is still held.
    await page.goto(base+testCase.route,{waitUntil:'commit'});
    let holdTimeout;
    try{
      await Promise.race([held,new Promise((_,reject)=>{holdTimeout=setTimeout(()=>reject(new Error('Shared module request was not intercepted')),10000);})]);
    }finally{clearTimeout(holdTimeout);}
    await page.waitForFunction(()=>document.body&&[...document.styleSheets].some(sheet=>sheet.href?.includes('/assets/css/workspace.css')));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const before=await snapshot(page);
    assertVisibleDocument(before,name);
    assert.equal(before.headers,0,name+': shared module really is delayed');
    assert.equal(before.theme,theme,name+': saved appearance is applied before modules');
    assert.equal(before.colour,testCase[theme],name+': first background already matches final theme');
    if(testCase.wing!=='launchpad'){
      assert.ok(before.legacy.length,name+': legacy native layout exists for regression coverage');
      for(const element of before.legacy){
        assert.equal(element.display,'none',name+': legacy '+element.selector+' does not flash');
        assert.equal(element.width,0,name+': hidden legacy element takes no width');
        assert.equal(element.height,0,name+': hidden legacy element takes no height');
      }
    }
    if(width===390&&theme==='dark')await page.screenshot({path:path.join(outputs,`first-paint-${testCase.wing}-mobile-dark.png`)});
    released=true;releaseModule();
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.workspace-header').waitFor();
    await page.waitForFunction(()=>document.querySelector('summary-import')?.started);
    const after=await snapshot(page);
    assertVisibleDocument(after,name+' after hydration');
    assert.equal(after.headers,1,name+': exactly one completed shared header');
    assert.equal(after.theme,before.theme,name+': hydration keeps appearance');
    assert.equal(after.colour,before.colour,name+': hydration keeps body colour');
    assert.equal(await page.locator('.workspace-header nav[aria-label="Workspace areas"]').isVisible(),true);
    // Exercise a real destination link rather than only checking that it exists.
    const next=testCase.wing==='vet'?{name:'TAS',url:'/head-teacher-tas/#home'}:{name:'VET',url:'/#vet-home'};
    await page.locator('.workspace-header').getByRole('link',{name:next.name,exact:true}).click();
    await page.waitForURL(base+next.url);
    await page.waitForFunction(()=>document.querySelector('summary-import')?.started);
    assert.equal(await page.locator('.workspace-header').count(),1,name+': navigation builds one header');
    assert.equal(await page.locator('#route-content h1').isVisible(),true,name+': destination opens');
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme,name+': appearance follows navigation');
    assert.deepEqual(errors,[],name+': no page errors');
    results.push({name,passed:true,before,after});
    console.log('PASS '+name+': first paint, delayed hydration and cross-area navigation');
  }catch(error){
    results.push({name,passed:false,error:error.message,runtimeErrors:errors});
    console.error('FAIL '+name+'\n'+error.stack);
  }finally{
    released=true;releaseModule();
    await context.close();
  }
}

(async()=>{
  fs.mkdirSync(outputs,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const testCase of cases)for(const width of [1360,390])for(const theme of ['light','dark'])await check(testCase,width,theme);
  const report={passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,results};
  fs.writeFileSync(path.join(outputs,'workspace-first-paint-results.json'),JSON.stringify(report,null,2));
  console.log(`${report.passed} passed; ${report.failed} failed`);
  if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
