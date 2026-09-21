// Fresh disposable Chrome contexts only: never read a user profile or saved work.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:43175').replace(/\/$/,'');
const outputs=path.resolve(__dirname,'../../../outputs');
const inboxKey='morning-launchpad-summary:v1';
const cases=[
  {wing:'vet',route:'/#vet-home',task:'a-01-confirm-authority-set',native:'/assets/js/app-v2.js',light:'rgb(241, 245, 250)',dark:'rgb(20, 33, 47)'},
  {wing:'tas',route:'/head-teacher-tas/#home',task:'t1-year-opening-readiness',native:'/head-teacher-tas/assets/js/app.js',light:'rgb(245, 243, 249)',dark:'rgb(32, 30, 41)'},
  {wing:'launchpad',route:'/morning-launchpad/',light:'rgb(244, 245, 240)',dark:'rgb(20, 33, 31)'}
];
const results=[];
let browser,fixture;

async function makeContext(testCase,width,theme){
  const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Australia/Sydney',serviceWorkers:'block'});
  await context.addInitScript(({theme,fixture,key})=>{
    localStorage.setItem('morning-launchpad-theme',theme);
    if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(fixture));
    // Start before any page scripts. Examine every animation frame rather than
    // taking one favourable screenshot after the layout has already settled.
    const audit=window.__firstPaintAudit={frames:0,loadingFrames:0,readyFrames:0,violations:[],transitions:[]};
    const painted=element=>{
      if(!element||!element.getClientRects().length)return false;
      if(getComputedStyle(element).visibility!=='visible')return false;
      for(let node=element;node;node=node.parentElement){
        const css=getComputedStyle(node);
        if(css.display==='none'||Number(css.opacity)===0)return false;
      }
      const rect=element.getBoundingClientRect();return rect.width>0&&rect.height>0;
    };
    let previous='';
    function sample(){
      audit.frames++;
      const root=document.documentElement,body=document.body;
      if(root&&body&&body.dataset.workboard){
        const state=root.dataset.workspaceBoot||'unset';
        const visible=[...document.querySelectorAll('.topbar,#dashboard-access,.workspace-header,.backup-toolbar,#task-dialog')].filter(painted).map(el=>el.id||el.className);
        const scaffold=document.querySelectorAll('.workspace-header').length===1&&!!document.querySelector('.workspace-team-banner')&&
          !!document.querySelector('.workspace-my-work')&&!!document.querySelector('.workspace-task-link')&&!!document.querySelector('.workspace-register-link')&&
          !!document.querySelector('.workspace-home')&&!!document.querySelector('.workspace-specialist #route-content')&&!!window.WWHS_WORKBOARD_ADAPTER;
        if(state==='loading')audit.loadingFrames++;
        if(state==='ready')audit.readyFrames++;
        if(visible.length&&(state!=='ready'||!scaffold)){
          if(audit.violations.length<12)audit.violations.push({state,visible,scaffold,at:Math.round(performance.now())});
        }
        const signature=state+'|'+visible.join(',');
        if(signature!==previous&&audit.transitions.length<20){audit.transitions.push({state,visible,scaffold,at:Math.round(performance.now())});previous=signature;}
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  },{theme,fixture,key:inboxKey});
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  return {context,page,errors};
}

function holdModule(context){
  let release,notice;
  const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{notice=resolve;});
  let mode='hold';
  const setup=context.route('**/summary-import.mjs*',async route=>{
    if(mode==='hold'){notice();await gate;}
    if(mode==='abort')await route.abort('failed');else await route.continue();
  });
  return {setup,requested,release(){mode='pass';release();},abort(){mode='abort';release();},allow(){mode='pass';}};
}

async function withTimeout(promise,message,milliseconds=10000){
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),milliseconds);})]);}
  finally{clearTimeout(timer);}
}

async function twoFrames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}

async function snapshot(page){
  return page.evaluate(()=>{
    const style=element=>{const css=getComputedStyle(element);return {display:css.display,visibility:css.visibility,opacity:css.opacity};};
    return {
      shared:document.body.classList.contains('shared-workspace'),theme:document.documentElement.dataset.theme,
      state:document.documentElement.dataset.workspaceBoot||null,colour:getComputedStyle(document.body).backgroundColor,
      headers:document.querySelectorAll('.workspace-header').length,
      documentStyles:{html:style(document.documentElement),body:style(document.body)},
      topbar:document.querySelector('.topbar')?style(document.querySelector('.topbar')):null,
      legacy:[...document.querySelectorAll('.sidebar,.topbar .brand')].map(element=>({selector:element.className,display:getComputedStyle(element).display})),
      audit:window.__firstPaintAudit
    };
  });
}

function assertDocument(snapshot,label){
  assert.equal(snapshot.shared,true,label+': shared layout applies before module hydration');
  for(const [name,style]of Object.entries(snapshot.documentStyles)){
    assert.notEqual(style.display,'none',label+': '+name+' is not display-hidden');
    const expected=name==='body'&&['loading','failed'].includes(snapshot.state)?'hidden':'visible';
    assert.equal(style.visibility,expected,label+': '+name+' follows the loading gate');
    assert.equal(style.opacity,'1',label+': '+name+' is not faded out');
  }
  assert.deepEqual(snapshot.audit.violations,[],label+': no animation frame exposes a partial native page');
}

async function assertNotes(page,label){
  const item=await page.evaluate(key=>JSON.parse((window.WWHS_STORAGE||localStorage).getItem(key)).items.find(item=>item.id==='first-paint-note'),inboxKey);
  assert.deepEqual(item,fixture.items[0],label+': existing note is unchanged');
}

async function assertLoading(page,testCase,theme,state='loading'){
  await page.waitForFunction(()=>document.body&&[...document.styleSheets].some(sheet=>sheet.href?.includes('/assets/css/workspace.css')));
  if(testCase.wing!=='launchpad')await page.waitForFunction(state=>document.documentElement.dataset.workspaceBoot===state,state);
  await twoFrames(page);
  const before=await snapshot(page);
  assertDocument(before,testCase.wing+' '+state);
  assert.equal(before.theme,theme);assert.equal(before.colour,testCase[theme]);
  if(testCase.wing!=='launchpad'){
    assert.equal(await page.locator('#workspace-loading').isVisible(),true);
    assert.equal(await page.locator('#workspace-loading .workspace-loading-'+(state==='failed'?'error':'wait')).isVisible(),true);
    assert.equal(before.topbar.visibility,'hidden','Native chrome is hidden until the complete scaffold is ready');
    assert.notEqual(before.topbar.display,'none','Gate preserves native layout instead of creating a collapsed/reappearing layout');
    assert.ok(before.legacy.length);
    for(const element of before.legacy)assert.equal(element.display,'none','Legacy '+element.selector+' stays hidden');
    if(state==='failed')await page.locator('#workspace-loading').getByRole('link',{name:/retry/i}).click({trial:true});
  }
  await assertNotes(page,testCase.wing+' '+state);
  return before;
}

async function assertReady(page,testCase,theme){
  if(testCase.wing!=='launchpad')await page.waitForFunction(()=>document.documentElement.dataset.workspaceBoot==='ready');
  await page.locator('.workspace-header').waitFor();
  await twoFrames(page);
  const after=await snapshot(page);
  assertDocument(after,testCase.wing+' ready');
  assert.equal(after.headers,1);assert.equal(after.theme,theme);assert.equal(after.colour,testCase[theme]);
  if(testCase.wing!=='launchpad'){
    assert.equal(await page.locator('#workspace-loading').isVisible(),false);
    assert.equal(await page.locator('.workspace-team-banner').count(),1);
    for(const selector of ['.workspace-my-work','.workspace-task-link','.workspace-register-link'])assert.equal(await page.locator(selector).count(),1);
    assert.ok(after.audit.readyFrames>0);
  }
  if(testCase.wing==='launchpad')await page.waitForFunction(()=>document.querySelector('summary-import')?.started);
  await assertNotes(page,testCase.wing+' ready');
  return after;
}

async function run(name,test){
  if(process.env.FIRST_PAINT_MATCH&&!name.includes(process.env.FIRST_PAINT_MATCH))return;
  try{const detail=await test();results.push({name,passed:true,...detail});console.log('PASS '+name);}
  catch(error){results.push({name,passed:false,error:error.message});console.error('FAIL '+name+'\n'+error.stack);}
}

async function delayedCase(testCase,width,theme){
  const {context,page,errors}=await makeContext(testCase,width,theme),held=holdModule(context);
  try{
    await held.setup;
    await page.goto(base+testCase.route,{waitUntil:'commit'});
    await withTimeout(held.requested,'Shared module was not intercepted');
    const before=await assertLoading(page,testCase,theme);
    assert.equal(before.headers,0,'Shared module really is delayed');
    if(testCase.wing!=='launchpad')assert.ok(before.audit.loadingFrames>0);
    if(width===390&&theme==='dark'&&testCase.wing!=='launchpad')await page.screenshot({path:path.join(outputs,`first-paint-${testCase.wing}-mobile-dark.png`)});
    held.release();
    const after=await assertReady(page,testCase,theme);
    const next=cases.find(item=>item.wing===(testCase.wing==='vet'?'tas':'vet'));
    await page.locator('.workspace-header').getByRole('link',{name:next.wing.toUpperCase(),exact:true}).click();
    await page.waitForURL(base+next.route);
    await assertReady(page,next,theme);
    assert.equal(await page.locator('#route-content h1').isVisible(),true);
    assert.deepEqual(errors,[],'No runtime errors');
    return {before,after};
  }finally{held.release();await context.close();}
}

async function failureCase(testCase,nativeFailure=false){
  const {context,page,errors}=await makeContext(testCase,390,'dark');
  const direct=testCase.route.split('#')[0]+'#task/'+testCase.task;
  let allowNative=false;
  const held=nativeFailure?null:holdModule(context);
  try{
    if(held)await held.setup;
    else await context.route('**/*',route=>{
      if(!allowNative&&new URL(route.request().url()).pathname===testCase.native)return route.abort('failed');
      return route.continue();
    });
    await page.goto(base+direct,{waitUntil:'commit'});
    if(held){await withTimeout(held.requested,'Shared module was not intercepted');await assertLoading(page,testCase,'dark');held.abort();}
    const failed=await assertLoading(page,testCase,'dark','failed');
    if(!nativeFailure&&testCase.wing==='vet')await page.screenshot({path:path.join(outputs,'first-paint-vet-retry-mobile-dark.png')});
    const beforeRetryErrors=errors.slice();
    if(held)held.allow();else allowNative=true;
    // A hidden native task dialog must not intercept this real pointer click.
    await page.locator('#workspace-loading').getByRole('link',{name:/retry/i}).click();
    await page.waitForLoadState('domcontentloaded');
    const recovered=await assertReady(page,testCase,'dark');
    await page.locator('#task-dialog[open]').waitFor({state:'visible'});
    assert.ok((await page.locator('#task-dialog-title').innerText()).trim(),'Retry opens the requested task normally');
    await page.goto(base+testCase.route.split('#')[0]+'#my-work',{waitUntil:'domcontentloaded'});
    await assertReady(page,testCase,'dark');
    assert.equal(await page.locator('.workspace-home').isVisible(),true,'Direct personal work route opens');
    await page.reload({waitUntil:'domcontentloaded'});
    await assertReady(page,testCase,'dark');
    assert.deepEqual(errors.slice(beforeRetryErrors.length),[],'Successful retry has no runtime errors');
    return {failed,recovered,expectedFailureErrors:beforeRetryErrors};
  }finally{held?.release();await context.close();}
}

async function stalledCase(){
  const testCase=cases[0],{context,page}=await makeContext(testCase,390,'light'),held=holdModule(context);
  try{
    await held.setup;await page.goto(base+testCase.route,{waitUntil:'commit'});
    await withTimeout(held.requested,'Shared module was not intercepted');
    await assertLoading(page,testCase,'light');
    const started=Date.now();
    await page.waitForFunction(()=>document.documentElement.dataset.workspaceBoot==='failed',null,{timeout:15000});
    const failed=await assertLoading(page,testCase,'light','failed');
    assert.ok(Date.now()-started>=6500,'Timeout gives a slow connection time to respond');
    held.release();
    const recovered=await assertReady(page,testCase,'light');
    return {failed,recovered};
  }finally{held.release();await context.close();}
}

async function lateNativeCase(){
  const testCase=cases[0],{context,page}=await makeContext(testCase,390,'dark');
  let releaseNative,noticeNative,retry=false;
  const nativeGate=new Promise(resolve=>{releaseNative=resolve;}),nativeHeld=new Promise(resolve=>{noticeNative=resolve;});
  await context.route('**/*',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(!retry&&pathname===testCase.native){noticeNative();await nativeGate;}
    if(!retry&&pathname.endsWith('/assets/js/workspace.mjs'))await route.abort('failed');
    else await route.continue();
  });
  try{
    await page.goto(base+'/#task/'+testCase.task,{waitUntil:'commit'});
    await withTimeout(nativeHeld,'Native app was not delayed');
    await page.waitForFunction(()=>document.documentElement.dataset.workspaceBoot==='failed',null,{timeout:15000});
    releaseNative();
    await page.waitForFunction(()=>!!window.WWHS_WORKBOARD_ADAPTER);
    await twoFrames(page);
    const failed=await assertLoading(page,testCase,'dark','failed');
    assert.equal(await page.locator('#task-dialog').getAttribute('open'),null,'Late task modal is suspended while Retry is shown');
    retry=true;
    await page.locator('#workspace-loading').getByRole('link',{name:/retry/i}).click();
    const recovered=await assertReady(page,testCase,'dark');
    await page.locator('#task-dialog[open]').waitFor({state:'visible'});
    return {failed,recovered};
  }finally{releaseNative();await context.close();}
}

(async()=>{
  fs.mkdirSync(outputs,{recursive:true});
  const {enrich,validateInbox}=await import(pathToFileURL(path.resolve(__dirname,'../morning-launchpad/assets/summary-core.mjs')).href);
  fixture=validateInbox(JSON.stringify({version:2,items:[enrich({id:'first-paint-note',taskKey:'personal:first-paint-note',title:'Synthetic existing note',personal:true,status:'note',action:'',noteText:'Keep this synthetic note unchanged.',noteHtml:'<p>Keep this synthetic note unchanged.</p>',source:'Synthetic first-paint regression fixture'})]}));
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const testCase of cases)for(const width of [1360,390])for(const theme of ['light','dark'])await run(`${testCase.wing} ${width}px ${theme} delayed module`,()=>delayedCase(testCase,width,theme));
  for(const testCase of cases.filter(item=>item.wing!=='launchpad')){
    await run(`${testCase.wing} failed dependency and direct-task retry`,()=>failureCase(testCase));
    await run(`${testCase.wing} failed native app and direct-task retry`,()=>failureCase(testCase,true));
  }
  await run('vet stalled dependency times out and recovers',stalledCase);
  await run('vet late native task dialog cannot block failed-workspace retry',lateNativeCase);
  const reportPath=path.join(outputs,'workspace-first-paint-results.json');
  const previous=process.env.FIRST_PAINT_MATCH&&fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')).results:[];
  const combined=[...previous.filter(previous=>!results.some(result=>result.name===previous.name)),...results];
  const report={passed:combined.filter(result=>result.passed).length,failed:combined.filter(result=>!result.passed).length,results:combined};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
  console.log(`${report.passed} passed; ${report.failed} failed`);
  if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
