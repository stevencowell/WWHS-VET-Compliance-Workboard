// Disposable local Chromium only. Save as writes are mocked in memory; no Drive file is touched.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const metaKey='wwhs-team-handover:v1';
async function ready(page){await page.waitForFunction(()=>!document.getElementById('team-file').disabled);}
async function state(page){return page.evaluate(()=>({...localStorage}));}
async function mode(page,value){await page.evaluate(value=>{window.__save.mode=value;},value);}
async function press(page,id){await page.locator(id).click();await ready(page);}
async function downloaded(page,id){const pending=page.waitForEvent('download');await press(page,id);const file=await pending;return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,serviceWorkers:'block'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await context.addInitScript(()=>{
      window.__save={mode:'cancel',calls:[],files:[],aborts:0};
      window.showSaveFilePicker=async options=>{
        const test=window.__save;
        test.calls.push({options,activated:navigator.userActivation.isActive,metadata:localStorage.getItem('wwhs-team-handover:v1')});
        if(test.mode==='cancel')throw new DOMException('Synthetic cancellation','AbortError');
        if(test.mode==='blocked')throw new DOMException('Synthetic block','SecurityError');
        let contents;
        return {createWritable:async()=>({
          async write(blob){contents=await blob.text();if(test.mode==='write-fail')throw Error('Synthetic write failure');},
          async close(){if(test.mode==='close-fail')throw Error('Synthetic close failure');test.files.push(contents);},
          async abort(){test.aborts++;}
        })};
      };
    });
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    await page.goto(base+'/team-handover/');await ready(page);
    const unopened=await state(page);
    await page.locator('#handover-save-link').click();assert.equal(await page.locator('#setup-section').getAttribute('open'),'');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'setup-section');assert.deepEqual(await state(page),unopened);
    await page.locator('#setup-section summary').click();
    await page.locator('#handover-import-link').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'start-section');
    assert.deepEqual(await state(page),unopened,'import shortcut only reveals the existing preview/consent flow');
    await page.locator('#setup-section summary').click();await page.locator('#setup-editor').fill('Synthetic editor');
    const initial=await state(page);await press(page,'#create-team');assert.deepEqual(await state(page),initial);
    assert.match(await page.locator('#handover-message').innerText(),/cancelled/i);
    await mode(page,'blocked');await press(page,'#create-team');assert.deepEqual(await state(page),initial);
    assert.match(await page.locator('#handover-message').innerText(),/Download a copy/);
    await mode(page,'close-fail');await press(page,'#create-team');
    let pending=JSON.parse((await state(page))[metaKey]);assert.equal(pending.active.phase,'exporting');assert.ok(pending.pendingExport);
    assert.match(await page.locator('#handover-message').innerText(),/prepared handover is kept/);
    assert.equal(await page.evaluate(()=>window.__save.files.length),0);
    const prepared=await state(page);await mode(page,'cancel');await press(page,'#download-again');assert.deepEqual(await state(page),prepared);
    const callCount=await page.evaluate(()=>window.__save.calls.length);
    const fallback=await downloaded(page,'#download-copy');assert.equal(fallback.revision,1);
    assert.equal(await page.evaluate(()=>window.__save.calls.length),callCount,'explicit fallback does not open a picker');
    assert.deepEqual(await state(page),prepared);
    await mode(page,'save');await press(page,'#download-again');
    assert.deepEqual(JSON.parse(await page.evaluate(()=>window.__save.files.at(-1))),fallback);
    assert.deepEqual(await state(page),prepared,'successful local file save does not falsely confirm Drive syncing');
    assert.match(await page.locator('#handover-message').innerText(),/wait for Drive to finish syncing/);
    await page.locator('#handover-import-link').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'pending-session');
    assert.equal(await page.locator('#start-section').isVisible(),false);assert.deepEqual(await state(page),prepared);
    await press(page,'#confirm-finish');assert.equal(JSON.parse((await state(page))[metaKey]).pendingExport,null);
    const viewOnly=await state(page);await page.locator('#handover-save-link').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'start-section');assert.match(await page.locator('#handover-message').innerText(),/view-only/);
    assert.deepEqual(await state(page),viewOnly,'save shortcut cannot manufacture a new shared revision from a view-only snapshot');

    // Prepare an editing session and recovery copy entirely from synthetic local data.
    await page.evaluate(async metaKey=>{
      const core=await import('/assets/js/team-handover-core.mjs');
      const {prepareTeamMetadata}=await import('/assets/js/team-handover-payloads.mjs');
      const {enrich}=await import('/morning-launchpad/assets/summary-core.mjs');
      localStorage.setItem(core.KEYS.inbox,JSON.stringify({version:2,items:[enrich({id:'private-email',taskKey:'email:private',title:'Private email',action:'Keep local',source:'PRIVATE_EMAIL_SENTINEL',workstream:'personal'})]}));
      localStorage.setItem('synthetic-finance','PRIVATE_FINANCE_SENTINEL');
      const data=core.snapshot(localStorage),file=core.createBackup({snapshot:data,editor:'Synthetic editor',workspaceId:'save-test',exportId:'baseline-file'});
      const info=Object.fromEntries(['workspaceId','revision','parentRevision','parentExportId','exportId','savedAt','savedBy','note','changes'].map(key=>[key,file[key]]));
      localStorage.setItem(metaKey,JSON.stringify(await prepareTeamMetadata({version:1,lastFile:info,
        active:{id:'save-session',phase:'editing',editor:'Synthetic editor',startedAt:new Date().toISOString(),baseExportId:file.exportId,baselineData:data},pendingExport:null,
        recovery:{capturedAt:new Date().toISOString(),lastFile:info,data}})));
    },metaKey);
    await page.reload();await ready(page);await page.locator('#notes-saved').check();await page.locator('#handover-note').fill('Synthetic handover note');
    const beforeShortcut=await state(page);await page.locator('#handover-import-link').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'active-session');assert.equal(await page.locator('#start-section').isVisible(),false);
    assert.deepEqual(await state(page),beforeShortcut,'active session import shortcut requires handover first');
    const editing=await state(page);await mode(page,'cancel');await press(page,'#finish-session');assert.deepEqual(await state(page),editing);
    assert.equal(await page.locator('#active-session').isVisible(),true);assert.equal(await page.locator('#handover-note').inputValue(),'Synthetic handover note');
    await mode(page,'write-fail');await press(page,'#finish-session');
    const failed=await state(page),failedMeta=JSON.parse(failed[metaKey]);assert.equal(failedMeta.active.phase,'exporting');
    assert.deepEqual(failedMeta.recovery,JSON.parse(editing[metaKey]).recovery);
    for(const key of Object.keys(editing).filter(key=>key!==metaKey))assert.equal(failed[key],editing[key],key);
    assert.match(await page.locator('#handover-message').innerText(),/prepared handover is kept/);
    await mode(page,'save');await press(page,'#download-again');
    const saved=JSON.parse(await page.evaluate(()=>window.__save.files.at(-1)));
    assert.equal(saved.revision,2);assert.equal(saved.note,'Synthetic handover note');assert.doesNotMatch(JSON.stringify(saved),/PRIVATE_EMAIL|PRIVATE_FINANCE/);
    assert.deepEqual(await state(page),failed);assert.equal(await page.evaluate(()=>window.__save.calls.every(call=>call.activated)),true);
    const firstFinishCall=await page.evaluate(()=>window.__save.calls[0]);
    assert.equal(JSON.parse(firstFinishCall.metadata).active.phase,'editing','picker opens before the session transition');
    assert.equal(firstFinishCall.options.suggestedName,'WWHS-team-handover.json');
    for(const width of [390,1440]){await page.setViewportSize({width,height:1050});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px overflow`);}
    await press(page,'#confirm-finish');assert.equal(JSON.parse((await state(page))[metaKey]).active,null);
    for(const path of ['/#vet-home','/head-teacher-tas/#home']){
      await page.goto(base+path);
      const banner=page.locator('.workspace-team-banner');await banner.waitFor({state:'visible'});
      assert.match(await banner.innerText(),/VET \+ TAS · Shared progress/i);
      assert.equal(await banner.getByRole('link',{name:'Import backup…',exact:true}).getAttribute('href').then(href=>new URL(href).hash),'#import-backup');
      assert.equal(await banner.getByRole('link',{name:'Save backup…',exact:true}).getAttribute('href').then(href=>new URL(href).hash),'#save-backup');
      for(const width of [390,1440]){await page.setViewportSize({width,height:1050});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${path} ${width}px overflow`);}
    }
    assert.deepEqual(errors,[]);
    console.log('PASS Team Save as: active user gesture, create/finish/pending cancellation, blocked picker, write/close failure recovery, exact repeat save, explicit fallback, private separation, Drive confirmation and mobile/desktop overflow. No filesystem handles or Drive files used.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
