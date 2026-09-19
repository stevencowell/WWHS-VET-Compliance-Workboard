// Disposable Chromium and origin-private test handles only. No real Drive or user files.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const metaKey='wwhs-team-handover:v1';
const raw=page=>page.evaluate(()=>({...localStorage}));
async function ready(page){
  await page.waitForFunction(()=>!document.getElementById('team-file').disabled);
  await page.waitForFunction(()=>!document.querySelector('[data-folder-action="select"]').disabled);
}
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,serviceWorkers:'block'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    await context.addInitScript(()=>{
      window.__folderMode='select';window.__save={mode:'cancel',calls:[],files:[]};
      window.showDirectoryPicker=async()=>{
        if(window.__folderMode==='cancel')throw new DOMException('Synthetic cancel','AbortError');
        return (await navigator.storage.getDirectory()).getDirectoryHandle('01 Current handover',{create:true});
      };
      window.showSaveFilePicker=async options=>{
        const state=window.__save;state.calls.push({name:options.suggestedName,folder:options.startIn?.name,activated:navigator.userActivation.isActive,metadata:localStorage.getItem('wwhs-team-handover:v1')});
        if(state.mode==='cancel')throw new DOMException('Synthetic cancel','AbortError');
        let text;return {createWritable:async()=>({write:async blob=>{text=await blob.text();},close:async()=>{state.files.push(text);},abort:async()=>{}})};
      };
    });
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    await page.goto(base+'/team-handover/?wing=vet');await ready(page);
    const host=page.locator('#team-backup-folder');
    const original=await raw(page);
    await host.locator('[data-folder-action="select"]').click();
    await page.waitForFunction(()=>document.getElementById('team-backup-folder').textContent.includes('Selected: 01 Current handover'));
    assert.deepEqual(await raw(page),original,'folder preference does not alter any saved work');
    assert.match(await host.innerText(),/once for VET and TAS/);
    await page.reload();await ready(page);assert.match(await host.innerText(),/Selected: 01 Current handover/);
    assert.equal(await page.evaluate(async()=>{const {getBackupFolder}=await import('/assets/js/backup-folder.mjs?v=default-folder-1');await getBackupFolder('private').ready;return getBackupFolder('private').state().name;}),'','team choice does not configure the private folder');
    await page.evaluate(()=>{window.__folderMode='cancel';});
    await host.locator('[data-folder-action="select"]').click();await ready(page);
    assert.match(await host.innerText(),/Selected: 01 Current handover/);
    await page.locator('#setup-section summary').click();await page.locator('#setup-editor').fill('Synthetic editor');
    const before=await raw(page);await page.locator('#create-team').click();await ready(page);
    assert.deepEqual(await raw(page),before,'cancelling Save as leaves team state unchanged');
    const picker=await page.evaluate(()=>window.__save.calls[0]);
    assert.equal(picker.folder,'01 Current handover');assert.equal(picker.name,'WWHS-team-handover.json');assert.equal(picker.activated,true);assert.equal(picker.metadata,null);
    await page.evaluate(()=>{window.__save.mode='save';});await page.locator('#create-team').click();await ready(page);
    assert.equal(JSON.parse((await raw(page))[metaKey]).active.phase,'exporting','saved file still waits for explicit Drive sync confirmation');
    assert.match(await page.locator('#handover-message').innerText(),/wait for Drive to finish syncing/);
    assert.equal(JSON.parse(await page.evaluate(()=>window.__save.files[0])).revision,1);
    await page.goto(base+'/team-handover/?wing=tas');await ready(page);
    assert.match(await host.innerText(),/Selected: 01 Current handover/,'TAS uses the same saved folder');
    const pending=await raw(page);await page.locator('#download-again').click();await ready(page);
    assert.deepEqual(await raw(page),pending,'cancelled retry keeps prepared handover');
    assert.equal(await page.evaluate(()=>window.__save.calls[0].folder),'01 Current handover');
    for(const width of [390,1440]){await page.setViewportSize({width,height:1050});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px overflow`);}
    await host.locator('[data-folder-action="forget"]').click();await ready(page);
    assert.match(await host.innerText(),/No default folder selected/);
    assert.deepEqual(await raw(page),pending,'forget changes only folder preference');
    await page.reload();await ready(page);assert.match(await host.innerText(),/No default folder selected/);
    await page.locator('#download-again').click();await ready(page);assert.equal(await page.evaluate(()=>window.__save.calls[0].folder),undefined);
    assert.deepEqual(errors,[]);
    console.log('PASS Team default folder: actual IndexedDB handle persistence, VET/TAS shared preference, private separation, cancelled change/save/retry, picker user gesture before session mutation, Drive sync confirmation, forgetting preference and phone/desktop layout. No real Drive files used.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
