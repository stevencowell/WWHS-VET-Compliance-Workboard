'use strict';
// Synthetic, disposable browser contexts only. No personal browser profile or data.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.resolve(root,'../../outputs');
const DATA='finance_studio_budget_items_v3',META='finance_studio_backup_reminder_v1';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  const errors=[],external=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
    await context.addInitScript(()=>{
      window.__pickerMode='file';window.__savedFiles=[];window.__pickerCalls=0;
      window.showSaveFilePicker=async options=>{
        window.__pickerCalls++;
        if(window.__pickerMode==='cancel')throw new DOMException('Cancelled','AbortError');
        if(window.__pickerMode==='blocked')throw new DOMException('Synthetic blocked picker','SecurityError');
        const mode=window.__pickerMode;let text='';
        return {createWritable:async()=>({write:async blob=>{if(mode==='write-fail')throw new Error('Synthetic file failure');text=await blob.text();},close:async()=>{if(mode==='defer')await new Promise(resolve=>window.__releaseFile=resolve);window.__savedFiles.push({name:options.suggestedName,text});},abort:async()=>{}})};
      };
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:'))external.push(r.url());});
    await page.goto(base+'/finance/');await page.locator('#vaultPassword').fill('synthetic private test password');await page.locator('#confirmPassword').fill('synthetic private test password');await page.locator('#unlockFinance').click();
    await page.locator('#financeWorkspace').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
    await page.locator('#financeBackupSettings > summary').click();
    assert.equal(await page.locator('#financeBackupAlerts').isChecked(),true);
    assert.match(await page.locator('#financeBackupReminderMessage').innerText(),/No backup has been confirmed/);
    const edit=async n=>{await page.evaluate(({key,n})=>window.FINANCE_STORAGE.setItem(key,JSON.stringify([{id:'synthetic',category:'Housing',item:'Water',annual_budget:n,notes:'Invented test'}])),{key:DATA,n});await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');};
    const unload=()=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
    await edit(100);assert.equal(await unload(),true);assert.match(await page.locator('#financeBackupReminderMessage').innerText(),/saved in this browser/);
    await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Encrypted backup saved to'));
    assert.equal(await unload(),false);const encrypted=await page.evaluate(()=>window.__savedFiles[0].text);assert.ok(JSON.parse(encrypted).ciphertext);assert.ok(!encrypted.includes('Invented test'));
    await edit(200);const before=await page.evaluate(k=>window.FINANCE_STORAGE.getItem(k),META);await page.evaluate(()=>window.__pickerMode='cancel');await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>!document.querySelector('#downloadEncryptedBackup').disabled);assert.equal(await page.evaluate(k=>window.FINANCE_STORAGE.getItem(k),META),before);assert.equal(await unload(),true);assert.match(await page.locator('#backupStatus').innerText(),/Save cancelled/);
    await page.evaluate(()=>window.__pickerMode='write-fail');await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('could not be saved'));assert.equal(await unload(),true);
    await page.evaluate(()=>window.__pickerMode='blocked');let download=page.waitForEvent('download');await page.locator('#downloadEncryptedBackup').click();await download;await page.locator('#confirmFinanceBackup').waitFor({state:'visible'});assert.match(await page.locator('#backupStatus').innerText(),/download started/);assert.equal(await unload(),true);
    await edit(300);assert.equal(await page.locator('#confirmFinanceBackup').isVisible(),false);
    download=page.waitForEvent('download');await page.locator('#downloadFinanceCopy').click();await download;await page.locator('#confirmFinanceBackup').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Backup confirmed.'));assert.equal(await unload(),false);
    await edit(400);await page.evaluate(()=>window.__pickerMode='defer');await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>typeof window.__releaseFile==='function');await edit(500);await page.evaluate(()=>window.__releaseFile());await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('more changes arrived'));assert.equal(await unload(),true);assert.equal(await page.locator('#confirmFinanceBackup').isVisible(),false);
    let lockAsked=false;page.once('dialog',async d=>{lockAsked=d.message().includes('Lock Finance anyway');await d.dismiss();});await page.locator('#lockFinance').click();assert.equal(lockAsked,true);assert.equal(await page.locator('#financeWorkspace').isVisible(),true);
    await page.locator('#financeBackupAlerts').uncheck();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');assert.equal(await unload(),false);
    const mandatory=await page.evaluate(k=>{window.FINANCE_STORAGE.setItem(k,'[]');const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;},DATA);assert.equal(mandatory,true);await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await page.locator('#lockFinance').click();await page.locator('#vaultPassword').waitFor({state:'visible'});await page.locator('#vaultPassword').fill('synthetic private test password');await page.locator('#unlockFinance').click();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');assert.equal(await page.locator('#financeBackupAlerts').isChecked(),false);
    await page.locator('#financeBackupSettings > summary').click();
    await page.locator('#financeBackupAlerts').check();await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
    await page.locator('#financeBackupSettings > summary').click();
    await page.screenshot({path:path.join(out,'finance-backup-reminder-desktop.png'),fullPage:false});
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'finance-backup-reminder-mobile.png'),fullPage:false});
    const sample=await browser.newContext();const samplePage=await sample.newPage();await samplePage.goto(base+'/finance/');await samplePage.locator('#trySample').click();await samplePage.locator('#financeWorkspace').waitFor({state:'visible'});await samplePage.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('Sample only'));assert.equal(await samplePage.locator('#financeBackupReminder').isVisible(),false);assert.equal(await samplePage.locator('#downloadEncryptedBackup').isVisible(),false);assert.equal(await samplePage.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),false);
    const mobile=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'});await mobile.addInitScript(()=>{window.showSaveFilePicker=undefined;window.showDirectoryPicker=undefined;});await mobile.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();external.push(route.request().url());return route.abort();});
    const mobilePage=await mobile.newPage();mobilePage.on('pageerror',e=>errors.push(e.message));await mobilePage.goto(base+'/finance/');await mobilePage.locator('#vaultPassword').fill('synthetic mobile password');await mobilePage.locator('#confirmPassword').fill('synthetic mobile password');await mobilePage.locator('#unlockFinance').click();await mobilePage.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');await mobilePage.evaluate(k=>window.FINANCE_STORAGE.setItem(k,'[{"id":"mobile","category":"Housing","item":"Water","annual_budget":10}]'),DATA);await mobilePage.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
    const mobileDownload=mobilePage.waitForEvent('download');await mobilePage.locator('#downloadEncryptedBackup').click();await (await mobileDownload).cancel();await mobilePage.locator('#confirmFinanceBackup').waitFor({state:'visible'});assert.match(await mobilePage.locator('#backupStatus').innerText(),/download started/);assert.equal(await mobilePage.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),true);assert.equal(await mobilePage.locator('#financeBackupSettings').getAttribute('open'),null);assert.ok(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await mobilePage.locator('#financeBackupReminder').scrollIntoViewIfNeeded();await mobilePage.screenshot({path:path.join(out,'finance-backup-download-mobile.png'),fullPage:false});await mobile.close();
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    fs.writeFileSync(path.join(out,'finance-backup-reminder-browser.json'),JSON.stringify({pass:true,checks:['default on; initial state unverified','post-edit close warning','native encrypted file save auto-confirmed','picker cancellation preserves state','failed file save retains warning','download requires explicit confirmation','later edit invalidates pending confirmation','edit during file save cannot clear reminder','Lock cancel preserves workspace','optional off retains mandatory unsaved warning','encrypted lock/reopen persists preference','no localStorage writes','sample isolated','390px no horizontal overflow','mobile fallback never confirms a cancelled or unverified download','no browser errors or external requests'],errors,external},null,2)+'\n');
    console.log('Finance reminder browser checks passed.');await sample.close();await context.close();
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
