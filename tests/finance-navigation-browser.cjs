'use strict';
// Disposable synthetic vaults only. No personal browser profile or finance files.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),DATA='finance_studio_planning_inputs_v1',META='finance_studio_backup_reminder_v1';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end('<h1>Synthetic VET destination</h1>');return;}
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
const unload=page=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
async function rawVault(page){return page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('finance-studio-private-v1',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const request=db.transaction('vault').objectStore('vault').get('primary');request.onsuccess=()=>resolve(JSON.stringify(request.result));request.onerror=()=>reject(request.error);});}finally{db.close();}
});}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true}),errors=[],external=[],checks=[];
  try{
    async function openFinance(){
      const context=await browser.newContext({serviceWorkers:'block'});
      await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();external.push(route.request().url());return route.abort();});
      const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+'/finance/');
      await page.locator('#vaultPassword').fill('synthetic navigation password');await page.locator('#confirmPassword').fill('synthetic navigation password');await page.locator('#unlockFinance').click();
      await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
      await page.evaluate(({base,key})=>{
        for(const link of document.querySelectorAll('.workspace-areas a'))if(link.textContent==='VET'){link.id='test-vet-link';link.href=base+'/#vet-home';}
        const outside=document.createElement('a');outside.id='test-unrelated-link';outside.href=base+'/outside-workspace/';outside.textContent='Unrelated page';document.body.append(outside);
        window.FINANCE_STORAGE.setItem(key,JSON.stringify({synthetic:'Saved navigation test'}));
      },{base,key:DATA});
      await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
      return {context,page};
    }
    const first=await openFinance(),page=first.page;
    assert.equal(await unload(page),true,'Actual exits still warn while an encrypted backup is due');
    const before=await rawVault(page);
    await page.locator('.workspace-areas a[href="#overview"]').click();
    assert.equal(await unload(page),true,'A same-document hash link must not suppress the next real exit warning');
    const unwanted=[];page.on('dialog',async dialog=>{unwanted.push(dialog.type());await dialog.dismiss();});
    await page.locator('#test-vet-link').click();await page.waitForURL(base+'/#vet-home');
    assert.equal(await page.locator('h1').innerText(),'Synthetic VET destination');assert.deepEqual(unwanted,[]);
    assert.equal(await rawVault(page),before,'Internal navigation cannot modify or confirm the encrypted backup');
    checks.push('Saved Finance records navigate to VET without a backup-only exit prompt; encrypted records unchanged');
    await first.context.close();

    const second=await openFinance(),guarded=second.page;
    async function expectWarning(selector){
      const dialogPromise=guarded.waitForEvent('dialog');const click=guarded.locator(selector).click();const dialog=await dialogPromise;
      assert.equal(dialog.type(),'beforeunload');await dialog.dismiss();await click;
      assert.ok(guarded.url().startsWith(base+'/finance/'));
    }
    const reminder=await guarded.evaluate(key=>window.FINANCE_STORAGE.getItem(key),META);
    await expectWarning('#test-unrelated-link');
    assert.equal(await guarded.evaluate(key=>window.FINANCE_STORAGE.getItem(key),META),reminder);
    checks.push('Unrelated navigation retains the backup warning without changing reminder settings');
    await guarded.evaluate(key=>document.querySelector('#test-vet-link').addEventListener('click',()=>window.FINANCE_STORAGE.setItem(key,JSON.stringify({synthetic:'Unsaved click edit'})),{once:true}),DATA);
    await expectWarning('#test-vet-link');
    assert.match(await guarded.evaluate(key=>window.FINANCE_STORAGE.getItem(key),DATA),/Unsaved click edit/);
    await guarded.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
    assert.equal(await unload(guarded),true,'The rejected navigation allowance is consumed, so later exits still warn');
    checks.push('An edit made during the internal click remains protected; the allowance cannot leak to a later exit');
    await guarded.evaluate(()=>window.FINANCE_STORAGE.onError(new Error('Synthetic mandatory save failure')));
    await expectWarning('#test-vet-link');assert.match(await guarded.locator('#saveStatus').innerText(),/Not saved/);
    checks.push('A fatal save error still warns for internal navigation even when browser storage is otherwise saved');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log(`PASS Finance navigation: ${checks.length} checks, synthetic vaults only.`);
    await second.context.close();
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
