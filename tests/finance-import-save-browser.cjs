'use strict';
// Fresh synthetic browser storage only: no user profile, personal files or Drive.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../outputs');
const KEY='finance_studio_planning_inputs_v1',PASSWORD='synthetic current workspace password',BACKUP_PASSWORD='synthetic imported backup password';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const report={pass:false,syntheticOnly:true,checks:[],pageErrors:[],externalRequests:[]};
const server=http.createServer((req,res)=>{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
const check=name=>report.checks.push(name);
async function rawVault(page){return page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('finance-studio-private-v1',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const request=db.transaction('vault').objectStore('vault').get('primary');request.onsuccess=()=>resolve(JSON.stringify(request.result??null));request.onerror=()=>reject(request.error);});}finally{db.close();}
});}
async function waitSaved(page){await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');}
async function dismissOrAccept(page,selector,accept,pattern){
  const dialog=page.waitForEvent('dialog');const click=page.locator(selector).click();const question=await dialog;assert.match(question.message(),pattern);await(accept?question.accept():question.dismiss());await click;
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:'block'});
    await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
    await context.addInitScript(()=>{window.__files=[];window.showSaveFilePicker=async()=>{let text;return{createWritable:async()=>({write:async value=>{text=await value.text();},close:async()=>{window.__files.push(text);},abort:async()=>{}})};};});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.pageErrors.push(error.message));
    await page.goto(base+'/finance/');await page.locator('#vaultForm').waitFor({state:'visible'});
    await page.locator('#gateImportBackup').click();assert.equal(await page.locator('#restoreVaultDetails').getAttribute('open'),'');assert.equal(await page.evaluate(()=>document.activeElement.id),'restoreVaultFile');assert.equal(await rawVault(page),'null');
    check('Locked Import backup opens and focuses the existing encrypted restore form without creating records');
    const backup=await page.evaluate(async({key,password})=>{
      const {createLocalVault}=await import('/finance/security/local-vault.mjs');const vault=await createLocalVault({dbName:'synthetic-source-backup'});
      await vault.setup(password);const initial=await vault.loadState();await vault.saveState(initial.revision,{[key]:JSON.stringify({syntheticCase:'Imported test records'})});const text=await vault.exportBackup();vault.close();return text;
    },{key:KEY,password:BACKUP_PASSWORD});
    await page.locator('#vaultPassword').fill(PASSWORD);await page.locator('#confirmPassword').fill(PASSWORD);await page.locator('#unlockFinance').click();await waitSaved(page);
    assert.equal(await page.locator('#financeBackupReminderTitle').innerText(),'Import & save');assert.equal(await page.locator('#financeBackupReminder .import-save-scope').innerText(),'Finance · Private encrypted records');
    assert.equal(await page.locator('#downloadEncryptedBackup').innerText(),'Save backup…');assert.equal(await page.locator('#financeBackupNow').count(),0);
    await page.evaluate(key=>window.FINANCE_STORAGE.setItem(key,JSON.stringify({syntheticCase:'Current test records'})),KEY);await waitSaved(page);
    await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Encrypted backup saved to'));
    assert.ok(JSON.parse(await page.evaluate(()=>window.__files[0])).ciphertext);assert.ok(!(await page.evaluate(()=>window.__files[0])).includes('Current test records'));
    check('One main encrypted save button is paired with import; existing successful save behaviour retained');
    await page.evaluate(key=>window.FINANCE_STORAGE.setItem(key,JSON.stringify({syntheticCase:'New current edit'})),KEY);
    await dismissOrAccept(page,'#importEncryptedBackup',false,/Lock Finance and open backup import anyway/);
    assert.equal(await page.locator('#financeWorkspace').isVisible(),true);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),KEY),/New current edit/);await waitSaved(page);
    check('Import first flushes edits; cancelling the existing backup-before-lock warning keeps the workspace and records open');
    await dismissOrAccept(page,'#importEncryptedBackup',true,/Lock Finance and open backup import anyway/);
    await page.waitForURL('**/finance/#import-backup');await page.waitForFunction(()=>document.activeElement?.id==='restoreVaultFile');
    assert.equal(await page.evaluate(()=>typeof window.FinanceEngine),'undefined');assert.equal(await page.locator('#financeWorkspace').isVisible(),false);
    const before=await rawVault(page);
    const current=await page.evaluate(async({key,password})=>{const {createLocalVault}=await import('/finance/security/local-vault.mjs');const vault=await createLocalVault();await vault.unlock(password);const values=(await vault.loadState()).values;vault.close();return values[key];},{key:KEY,password:PASSWORD});assert.match(current,/New current edit/);
    check('Proceeding reloads into the focused restore form, purges the old engine, and preserves the latest saved records');
    await page.locator('#restoreVaultFile').setInputFiles({name:'synthetic-encrypted-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await page.locator('#restoreVaultPassword').fill(BACKUP_PASSWORD);
    await dismissOrAccept(page,'#restoreVault',false,/Replace this browser/);assert.equal(await rawVault(page),before);assert.equal(await page.locator('#financeWorkspace').isVisible(),false);
    check('Cancelling explicit replacement leaves the encrypted vault byte-for-byte unchanged');
    await page.locator('#restoreVaultPassword').fill('incorrect synthetic password');await dismissOrAccept(page,'#restoreVault',true,/Replace this browser/);
    await page.waitForFunction(()=>document.querySelector('#restoreVaultMessage').textContent.length>0&&!document.querySelector('#restoreVault').disabled);assert.equal(await rawVault(page),before);assert.equal(await page.locator('#financeWorkspace').isVisible(),false);
    check('Wrong backup password cannot replace or unlock existing records');
    await page.locator('#restoreVaultFile').setInputFiles({name:'invalid-test.json',mimeType:'application/json',buffer:Buffer.from('{"not":"a vault"}')});await page.locator('#restoreVaultPassword').fill(BACKUP_PASSWORD);await dismissOrAccept(page,'#restoreVault',true,/Replace this browser/);
    await page.waitForFunction(()=>document.querySelector('#restoreVaultMessage').textContent.includes('valid encrypted')&&!document.querySelector('#restoreVault').disabled);assert.equal(await rawVault(page),before);
    check('Invalid backup validation still leaves the encrypted vault unchanged');
    await page.locator('#restoreVaultFile').setInputFiles({name:'synthetic-encrypted-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});await dismissOrAccept(page,'#restoreVault',true,/Replace this browser/);await waitSaved(page);
    assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),KEY),/Imported test records/);assert.equal(await page.locator('#restoreVaultPassword').inputValue(),'');
    check('Only a valid encrypted backup, its correct password and explicit replacement complete the import');
    await page.evaluate(()=>window.FINANCE_STORAGE.onError(new Error('Synthetic unsaved failure')));await page.locator('#importEncryptedBackup').click();await page.waitForFunction(()=>!document.querySelector('#importEncryptedBackup').disabled);assert.equal(await page.locator('#financeWorkspace').isVisible(),true);assert.match(await page.locator('#saveProblemMessage').innerText(),/Synthetic unsaved failure/);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),KEY),/Imported test records/);
    check('Fatal save errors block the import transition and keep the current workspace available for recovery');
    await page.locator('#retrySave').click();await waitSaved(page);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);
    await page.setViewportSize({width:390,height:844});await page.locator('#financeBackupReminder').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'finance-import-save-mobile.png')});
    check('390px import/save controls fit without horizontal overflow; no financial localStorage');
    const sample=await context.newPage();sample.on('pageerror',error=>report.pageErrors.push(error.message));await sample.goto(base+'/finance/');await sample.locator('#trySample').click();await sample.locator('#financeWorkspace').waitFor({state:'visible'});assert.equal(await sample.locator('#financeBackupReminder').isVisible(),false);assert.equal(await sample.locator('#downloadEncryptedBackup').isVisible(),false);assert.equal(await sample.locator('#importEncryptedBackup').isVisible(),false);assert.equal(await sample.locator('#restoreBackup').isDisabled(),true);
    check('Sample mode remains isolated from all private import/save controls');
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);report.pass=true;await context.close();
  }finally{await browser.close();server.close();fs.writeFileSync(path.join(out,'finance-import-save-browser.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(`PASS Finance Import & save: ${report.checks.length} checks, synthetic context only.`);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
