'use strict';
// Real localStorage quota plus native IndexedDB abort fault injection.
// Disposable context only; no user profile, files, Drive or physical disk exhaustion.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../outputs');
const PASSWORD='synthetic quota test password',PROBE='finance_studio_quota_probe_v1',PLAN='finance_studio_planning_inputs_v1';
const report={pass:false,syntheticOnly:true,limits:'Real localStorage exhaustion; IndexedDB write failure is injected by aborting the native transaction after put. This does not simulate physically filling the disk.',checks:[],pageErrors:[],externalRequests:[]};
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
const pass=(name,details)=>report.checks.push({name,passed:true,...(details?{details}:{})});
const saved=page=>page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');
const warns=page=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
async function rawVault(page){return page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('finance-studio-private-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction('vault').objectStore('vault').get('primary');r.onsuccess=()=>resolve(JSON.stringify(r.result??null));r.onerror=()=>reject(r.error);});}finally{db.close();}});}
async function importBackup(page,text){await page.locator('#restoreVaultFile').setInputFiles({name:'synthetic-encrypted-backup.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.locator('#restoreVaultPassword').fill(PASSWORD);const dialog=page.waitForEvent('dialog');const click=page.locator('#restoreVault').click();const question=await dialog;assert.match(question.message(),/Replace this browser/);await question.accept();await click;}
async function enterImport(page,expectWarning=false){const dialog=expectWarning?page.waitForEvent('dialog'):null;const click=page.locator('#importEncryptedBackup').click();if(dialog){const question=await dialog;assert.match(question.message(),/private encrypted backup/);await question.accept();}await click;await page.waitForFunction(()=>document.activeElement?.id==='restoreVaultFile');}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});let context;
  try{
    context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base&&route.request().method()==='GET')return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
    await context.addInitScript(()=>{
      window.__syntheticFiles=[];window.__quotaAborts=[];window.__failVaultWrites=false;window.__forcedAborts=0;
      window.showSaveFilePicker=async()=>{let text;return{createWritable:async()=>({write:async blob=>{text=await blob.text();},close:async()=>{window.__syntheticFiles.push(text);},abort:async()=>{}})};};
      const put=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){const request=put.apply(this,args);if(this.transaction.db.name==='finance-studio-private-v1'&&window.__failVaultWrites){window.__forcedAborts++;this.transaction.abort();}return request;};
      const transaction=IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction=function(...args){const tx=transaction.apply(this,args);if(this.name==='finance-studio-private-v1'&&args[1]==='readwrite')tx.addEventListener('abort',()=>window.__quotaAborts.push({name:tx.error?.name,message:tx.error?.message}));return tx;};
    });
    const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>report.pageErrors.push(error.message));
    await page.goto(base+'/finance/');await page.locator('#vaultForm').waitFor({state:'visible'});
    const localQuota=await page.evaluate(()=>{
      const key='synthetic-quota-filler';let low=0,high=8*1024*1024,errors=[];
      while(low<high){const size=Math.ceil((low+high)/2);try{localStorage.setItem(key,'x'.repeat(size));low=size;}catch(error){errors.push(error.name);high=size-1;}}
      let extraFailure;try{localStorage.setItem('extra','x');}catch(error){extraFailure=error.name;}
      return{characters:localStorage.getItem(key).length,keys:Object.keys(localStorage),quotaErrors:[...new Set(errors)],extraFailure};
    });assert.equal(localQuota.extraFailure,'QuotaExceededError');assert.ok(localQuota.characters>4*1024*1024);pass('Real localStorage is full before Finance setup',localQuota);
    const backups=await page.evaluate(async({password,key})=>{
      const {createLocalVault}=await import('/finance/security/local-vault.mjs');const vault=await createLocalVault({dbName:'synthetic-quota-backup-source'});await vault.setup(password);const result={};
      for(const[name,size]of [['small',256*1024],['large',2*1024*1024]]){const current=await vault.loadState();await vault.saveState(current.revision,{[key]:JSON.stringify({marker:'SYNTHETIC_IMPORTED_RECORDS',filler:'i'.repeat(size)})});result[name]=await vault.exportBackup();}vault.close();return result;
    },{password:PASSWORD,key:PROBE});
    await page.locator('#vaultPassword').fill(PASSWORD);await page.locator('#confirmPassword').fill(PASSWORD);await page.locator('#unlockFinance').click();await saved(page);
    await page.evaluate(()=>{window.FinanceEngine.App.navigate('planning');const field=document.querySelector('#fortnightIncome');field.value='1234.56';field.dispatchEvent(new Event('input',{bubbles:true}));});await saved(page);
    const firstRaw=await rawVault(page);assert.ok(JSON.parse(firstRaw).ciphertext);assert.ok(!firstRaw.includes('1234.56'));
    await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Encrypted backup saved to'));assert.equal(await warns(page),false);
    pass('Finance setup, edits and encrypted save work with localStorage completely full');
    await enterImport(page);await importBackup(page,backups.small);await saved(page);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),PROBE),/SYNTHETIC_IMPORTED_RECORDS/);
    await page.locator('#lockFinance').click();await page.locator('#vaultPassword').waitFor({state:'visible'});await page.locator('#vaultPassword').fill(PASSWORD);await page.locator('#unlockFinance').click();await saved(page);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),PROBE),/SYNTHETIC_IMPORTED_RECORDS/);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),['synthetic-quota-filler']);pass('Encrypted import and lock/reopen succeed without adding any localStorage data');
    const beforeFailure=await rawVault(page);await page.evaluate(()=>window.__failVaultWrites=true);
    await page.evaluate(({probe})=>{
      window.FinanceEngine.App.navigate('planning');const field=document.querySelector('#fortnightIncome');field.value='7654321.89';field.dispatchEvent(new Event('input',{bubbles:true}));
      window.FINANCE_STORAGE.setItem(probe,JSON.stringify({marker:'SYNTHETIC_UNSAVED_EDIT',filler:'u'.repeat(1024*1024)}));
    },{probe:PROBE});
    await page.waitForFunction(()=>document.querySelector('#saveStatus').dataset.error==='true');assert.equal(await rawVault(page),beforeFailure);assert.match(await page.locator('#saveProblemMessage').innerText(),/could not be saved.*Keep this tab open.*backup/);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),PROBE),/SYNTHETIC_UNSAVED_EDIT/);assert.equal(await warns(page),true);
    assert.ok(await page.evaluate(()=>window.__forcedAborts>0&&window.__quotaAborts.length>0));pass('An injected native IndexedDB transaction abort preserves the previous encrypted vault and keeps edits in memory with an explicit warning');
    await page.locator('#importEncryptedBackup').click();await page.waitForFunction(()=>!document.querySelector('#importEncryptedBackup').disabled);assert.equal(await page.locator('#financeWorkspace').isVisible(),true);assert.equal(await rawVault(page),beforeFailure);pass('Failed persistence blocks the lock/import transition');
    await page.locator('#downloadEncryptedBackup').click();await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Encrypted recovery file saved'));
    const recovery=await page.evaluate(()=>window.__syntheticFiles.at(-1));assert.ok(JSON.parse(recovery).ciphertext);assert.ok(!recovery.includes('SYNTHETIC_UNSAVED_EDIT'));assert.ok(!recovery.includes('7654321.89'));assert.equal(await rawVault(page),beforeFailure);assert.equal(await warns(page),true);
    const recovered=await page.evaluate(async({text,password,probe,plan})=>{const {createLocalVault}=await import('/finance/security/local-vault.mjs');const vault=await createLocalVault({}, {database:{read:async()=>JSON.parse(text),close(){}}});await vault.unlock(password);const values=(await vault.loadState()).values;vault.close();return{probe:JSON.parse(values[probe]).marker,income:JSON.parse(values[plan]).fortnightIncome};},{text:recovery,password:PASSWORD,probe:PROBE,plan:PLAN});assert.equal(recovered.probe,'SYNTHETIC_UNSAVED_EDIT');assert.equal(recovered.income,'7654321.89');pass('Encrypted recovery includes the latest edits without an IndexedDB write or false saved status');
    report.failedSaveMessages={save:await page.locator('#saveStatus').innerText(),problem:await page.locator('#saveProblemMessage').innerText(),backup:await page.locator('#backupStatus').innerText()};
    await page.evaluate(()=>window.__failVaultWrites=false);await page.locator('#retrySave').click();await saved(page);assert.notEqual(await rawVault(page),beforeFailure);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),PROBE),/SYNTHETIC_UNSAVED_EDIT/);pass('Retry saves the retained edits after storage becomes available');
    await enterImport(page,true);const beforeRestore=await rawVault(page);await page.evaluate(()=>window.__failVaultWrites=true);await importBackup(page,backups.large);
    await page.waitForFunction(()=>document.querySelector('#restoreVaultMessage').textContent.includes('could not be saved')&&!document.querySelector('#restoreVault').disabled);assert.equal(await rawVault(page),beforeRestore);assert.equal(await page.locator('#financeWorkspace').isVisible(),false);assert.ok(await page.evaluate(()=>window.__forcedAborts>0&&window.__quotaAborts.length>0));report.failedImportMessage=await page.locator('#restoreVaultMessage').innerText();pass('Native transaction failure during encrypted replacement leaves the original vault byte-for-byte intact and keeps the restore error visible');
    await page.evaluate(()=>window.__failVaultWrites=false);await page.locator('#vaultPassword').fill(PASSWORD);await page.locator('#unlockFinance').click();await saved(page);assert.match(await page.evaluate(key=>window.FINANCE_STORAGE.getItem(key),PROBE),/SYNTHETIC_UNSAVED_EDIT/);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),['synthetic-quota-filler']);pass('The original workspace still unlocks after failed replacement; full localStorage remains untouched');
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);report.pass=true;
  }finally{await context?.close();await browser.close();server.close();fs.writeFileSync(path.join(out,'finance-storage-quota-browser.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(`PASS Finance storage quota: ${report.checks.length} checks, full localStorage and native transaction failure, synthetic records only.`);
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
