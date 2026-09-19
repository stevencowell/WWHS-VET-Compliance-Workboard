'use strict';
// Disposable context + real OPFS handles persisted through real IndexedDB.
// Native choosers are mocked; no normal browser profile, user files or Drive.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../outputs');
const PRIVATE='Synthetic Launchpad backups',FINANCE='Synthetic Finance backups',TEAM='Synthetic VET backups';
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const report={pass:false,syntheticOPFSOnly:true,checks:[],pickers:[],pageErrors:[],externalRequests:[]};
const pass=name=>report.checks.push(name);
const server=http.createServer((req,res)=>{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});

async function files(page,folder=PRIVATE){return page.evaluate(async name=>{
  const directory=await(await navigator.storage.getDirectory()).getDirectoryHandle(name);const values={};
  for await(const [filename,handle]of directory.entries())if(handle.kind==='file')values[filename]=await(await handle.getFile()).text();
  return values;
},folder);}
async function databaseRecord(page,scope){return page.evaluate(async({scope,privateName,financeName,teamName})=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('wwhs-backup-folders:v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const value=await new Promise((resolve,reject)=>{const r=db.transaction('folders').objectStore('folders').get(scope);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();
  if(!value)return null;
  const reference=await(await navigator.storage.getDirectory()).getDirectoryHandle(scope==='launchpad'?privateName:scope==='finance'?financeName:teamName,{create:true});
  return {keys:Object.keys(value).sort(),name:value.handle?.name,revision:value.revision,nativeHandle:value.handle instanceof FileSystemDirectoryHandle,sameEntry:await value.handle.isSameEntry(reference)};
},{scope,privateName:PRIVATE,financeName:FINANCE,teamName:TEAM});}
const warns=page=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
async function folderReady(page,scope='launchpad'){
  if(scope==='launchpad'&&!await page.locator('#launchpad-backup-options').evaluate(node=>node.open))await page.locator('[data-backup-action=save]').click();
  if(scope==='finance'&&!await page.locator('#financeBackupReminder').evaluate(node=>node.open))await page.locator('#financeSaveBackup').click();
  await page.evaluate(()=>{for(const selector of ['#launchpad-backup-options details','#financeBackupSettings','#backup-settings']){const panel=document.querySelector(selector);if(panel)panel.open=true;}});
  await page.locator(`${scope==='finance'?'#financeBackupReminder ':''}.backup-folder-settings[data-backup-scope="${scope}"] [data-folder-action="select"]`).waitFor({state:'visible'});
  await page.waitForFunction(scope=>!document.querySelector(`${scope==='finance'?'#financeBackupReminder ':''}.backup-folder-settings[data-backup-scope="${scope}"] [data-folder-action="select"]`).disabled,scope);
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:false,serviceWorkers:'block'});
    await context.exposeBinding('__recordSyntheticPicker',(_,value)=>report.pickers.push(value));
    await context.route('**/*',route=>{if(new URL(route.request().url()).origin===base)return route.continue();report.externalRequests.push(route.request().url());return route.abort();});
    await context.addInitScript(({privateName,financeName,teamName})=>{
      window.__writeMode='normal';window.__denyFolder=false;window.__folderChoice=null;window.__closedNames=[];window.__pendingClose=null;window.__permissionRequests=0;window.__focusDuringPermission=false;
      window.showDirectoryPicker=async options=>{
        const name=window.__folderChoice||(options.id.includes('vet')?teamName:options.id.includes('finance')?financeName:privateName);
        await window.__recordSyntheticPicker({kind:'directory',name,id:options.id});
        return(await navigator.storage.getDirectory()).getDirectoryHandle(name,{create:true});
      };
      window.showSaveFilePicker=async options=>{await window.__recordSyntheticPicker({kind:'file',name:options.suggestedName,folder:options.startIn?.name||null});throw new DOMException('Unexpected native Save as during remembered-folder test','AbortError');};
      const handleProto=FileSystemHandle.prototype;
      const originalQuery=handleProto.queryPermission,originalRequest=handleProto.requestPermission;
      handleProto.queryPermission=async function(options){
        if(this.kind==='directory'&&window.__denyFolder)return 'denied';
        const result=await originalQuery.call(this,options);
        if(this.kind==='directory'&&window.__focusDuringPermission)window.dispatchEvent(new Event('focus'));
        return result;
      };
      handleProto.requestPermission=async function(options){window.__permissionRequests++;return window.__denyFolder?'denied':originalRequest.call(this,options);};
      const originalWritable=FileSystemFileHandle.prototype.createWritable;
      FileSystemFileHandle.prototype.createWritable=async function(options){
        const writer=await originalWritable.call(this,options),name=this.name,mode=window.__writeMode;
        return {write:chunk=>writer.write(chunk),abort:()=>writer.abort(),close:async()=>{
          if(mode==='defer'){window.__pendingClose=name;await new Promise(resolve=>window.__releaseClose=resolve);window.__pendingClose=null;}
          if(mode==='fail-close')throw new Error('Synthetic close failure');
          await writer.close();window.__closedNames.push(name);
        }};
      };
    },{privateName:PRIVATE,financeName:FINANCE,teamName:TEAM});
    const makePage=async()=>{const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.pageErrors.push(error.message));return page;};
    const launchpad=await makePage();await launchpad.goto(base+'/morning-launchpad/');
    await launchpad.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
    await folderReady(launchpad);
    const privatePanel=launchpad.locator('#launchpad-backup-options');
    await privatePanel.locator('[data-folder-action="select"]').click();
    await launchpad.waitForFunction(name=>document.querySelector('.backup-folder-settings').textContent.includes('Selected: '+name),PRIVATE);
    const initialRecord=await databaseRecord(launchpad,'launchpad');assert.equal(initialRecord.nativeHandle,true);assert.equal(initialRecord.sameEntry,true);assert.deepEqual(initialRecord.keys,['handle','revision']);assert.equal(await databaseRecord(launchpad,'vet'),null);
    pass('Launchpad remembers a genuine OPFS directory handle in actual IndexedDB; no backup payload is in the preference record.');

    await launchpad.evaluate(async()=>{
      const {enrich}=await import('/morning-launchpad/assets/summary-core.mjs?v=email-cleanup-1');
      const board=document.querySelector('summary-import');
      const note=enrich({id:'synthetic-private-note',taskKey:'manual:synthetic-private-note',title:'Invented personal note',action:'Synthetic follow-up',personal:true,workstream:'personal',noteText:'Invented note for disposable folder test'});
      if(!board.persist({...board.inbox,items:[...board.inbox.items,note]}))throw new Error('Synthetic note could not be saved');
      board.renderItems();await window.WWHS_PRIVATE_NOTES_BACKUP.refresh();window.__writeMode='defer';
    });
    assert.equal(await warns(launchpad),true);
    await privatePanel.getByRole('button',{name:'Save backup…',exact:true}).click();
    await launchpad.waitForFunction(()=>!!window.__pendingClose);
    assert.equal(await launchpad.evaluate(()=>window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup),true);assert.equal(await warns(launchpad),true);
    await launchpad.evaluate(()=>window.__releaseClose());
    await launchpad.waitForFunction(()=>!window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup&&!!window.WWHS_PRIVATE_NOTES_BACKUP.state().confirmedAt);
    assert.equal(await warns(launchpad),false);
    const firstFiles=await files(launchpad);assert.equal(Object.keys(firstFiles).length,1);assert.ok(Object.values(firstFiles)[0].includes('Invented personal note'));
    pass('Launchpad reminder remains pending through write and clears only after the actual OPFS stream closes.');
    await launchpad.evaluate(()=>{window.__writeMode='normal';window.__focusDuringPermission=true;});
    await privatePanel.getByRole('button',{name:'Save backup…',exact:true}).click();
    await launchpad.waitForFunction(()=>window.__closedNames.length===2);
    const twice=await files(launchpad);assert.equal(Object.keys(twice).length,2);for(const [name,text]of Object.entries(firstFiles))assert.equal(twice[name],text);
    assert.ok(Object.keys(twice).every(name=>/^launchpad-backup-\d{4}-\d{2}-\d{2}T.+\.json$/.test(name)));
    pass('Repeated saves retain earlier dated files; a focus refresh with unchanged folder causes no false conflict.');

    const finance=await makePage();await finance.goto(base+'/finance/');
    await finance.locator('#vaultPassword').fill('synthetic folder test password');await finance.locator('#confirmPassword').fill('synthetic folder test password');await finance.locator('#unlockFinance').click();
    await finance.waitForFunction(()=>document.querySelector('#saveStatus')?.textContent==='Saved in this browser');await folderReady(finance,'finance');
    assert.match(await finance.locator('#financeBackupReminder .backup-folder-settings[data-backup-scope="finance"]').innerText(),/remember it for Open and Save/);
    await finance.locator('#financeBackupReminder .backup-folder-settings[data-backup-scope="finance"] [data-folder-action="select"]').click();
    await finance.waitForFunction(name=>document.querySelector('#financeBackupReminder [data-backup-scope="finance"]').textContent.includes('Selected: '+name),FINANCE);
    const financeRecord=await databaseRecord(finance,'finance');assert.equal(financeRecord.name,FINANCE);assert.notEqual(financeRecord.name,initialRecord.name);
    assert.equal(report.pickers.filter(p=>p.kind==='directory').length,2);assert.equal(report.pickers.filter(p=>p.kind==='file').length,0);
    pass('Finance selects and remembers its own folder separately from Launchpad.');
    const edit=async amount=>{await finance.evaluate(amount=>window.FINANCE_STORAGE.setItem('finance_studio_budget_items_v3',JSON.stringify([{id:'synthetic-budget',category:'Housing',item:'Water',annual_budget:amount,notes:'Secret invented finance marker'}])),amount);await finance.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='Saved in this browser');};
    await edit(111);assert.equal(await warns(finance),true);
    await finance.evaluate(()=>window.__writeMode='defer');await finance.locator('#downloadEncryptedBackup').click();await finance.waitForFunction(()=>!!window.__pendingClose);
    assert.equal(await warns(finance),true);assert.equal(await finance.locator('#financeBackupReminder').getAttribute('data-state'),'needed');
    await finance.evaluate(()=>window.__releaseClose());await finance.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Encrypted backup saved'));
    assert.equal(await warns(finance),false);
    const withFinance=await files(finance,FINANCE);const encryptedName=Object.keys(withFinance).find(name=>name.startsWith('finance-encrypted-backup-'));assert.ok(encryptedName);
    const encrypted=JSON.parse(withFinance[encryptedName]);assert.equal(encrypted.kdf,'PBKDF2-SHA256');assert.ok(encrypted.ciphertext);assert.ok(!withFinance[encryptedName].includes('Secret invented finance marker'));assert.ok(!withFinance[encryptedName].includes('Invented personal note'));
    assert.equal(Object.keys(withFinance).length,1);assert.deepEqual(await files(finance,PRIVATE),twice);
    pass('Finance writes encrypted content only to its own folder and confirms only after file close; Launchpad backups remain unchanged in their separate folder.');

    await edit(222);await finance.evaluate(()=>window.__writeMode='fail-close');await finance.locator('#downloadEncryptedBackup').click();
    await finance.waitForFunction(()=>!document.querySelector('#downloadEncryptedBackup').disabled&&document.querySelector('#backupStatus').textContent.includes('could not be saved'));
    assert.equal(await warns(finance),true);assert.equal(await finance.locator('#confirmFinanceBackup').isVisible(),false);
    for(const [name,text]of Object.entries(withFinance))assert.equal((await files(finance,FINANCE))[name],text);
    pass('A file-close failure retains the Finance warning and cannot replace earlier backups.');
    await finance.evaluate(()=>{window.__writeMode='normal';window.__denyFolder=true;});const beforeDenied=await files(finance,FINANCE);
    await finance.locator('#downloadEncryptedBackup').click();await finance.waitForFunction(()=>!document.querySelector('#downloadEncryptedBackup').disabled&&document.querySelector('#backupStatus').textContent.includes('not granted'));
    assert.equal(await warns(finance),true);assert.ok(await finance.evaluate(()=>window.__permissionRequests>0));assert.deepEqual(await files(finance,FINANCE),beforeDenied);assert.equal(report.pickers.filter(p=>p.kind==='file').length,0);
    pass('Denied directory permission leaves the warning and files unchanged; it does not silently open another chooser.');
    await finance.evaluate(()=>window.__denyFolder=false);await finance.locator('#downloadEncryptedBackup').click();await finance.waitForFunction(()=>document.querySelector('#backupStatus').textContent.startsWith('Encrypted backup saved'));assert.equal(await warns(finance),false);
    const afterRetry=await files(finance,FINANCE);assert.equal(Object.keys(afterRetry).filter(name=>name.startsWith('finance-encrypted-backup-')&&afterRetry[name]).length,2);
    pass('Retry succeeds with the remembered handle and retains both successful encrypted backups.');

    const team=await makePage();await team.goto(base+'/team-handover/?wing=vet#save-backup');await folderReady(team,'vet');
    const teamPanel=team.locator('.backup-folder-settings[data-backup-scope="vet"]');assert.match(await teamPanel.innerText(),/remember it for Open and Save/);
    await team.evaluate(name=>window.__folderChoice=name,PRIVATE);await teamPanel.locator('[data-folder-action="select"]').click();
    await team.waitForFunction(()=>document.querySelector('.backup-folder-settings[data-backup-scope="vet"]').textContent.includes('Each area needs its own'));
    assert.equal(await databaseRecord(team,'vet'),null);assert.equal((await databaseRecord(team,'launchpad')).revision,initialRecord.revision);
    await team.evaluate(name=>window.__folderChoice=name,TEAM);await teamPanel.locator('[data-folder-action="select"]').click();await team.waitForFunction(name=>document.querySelector('.backup-folder-settings[data-backup-scope="vet"]').textContent.includes('Selected: '+name),TEAM);
    assert.equal((await databaseRecord(team,'vet')).sameEntry,true);assert.equal((await databaseRecord(team,'launchpad')).sameEntry,true);
    await finance.reload();await finance.locator('#vaultPassword').fill('synthetic folder test password');await finance.locator('#unlockFinance').click();await finance.waitForFunction(()=>document.querySelector('#saveStatus')?.textContent==='Saved in this browser');await folderReady(finance,'finance');
    assert.match(await finance.locator('#financeBackupReminder .backup-folder-settings[data-backup-scope="finance"]').innerText(),/Selected: Synthetic Finance backups/);
    await finance.evaluate(name=>window.__folderChoice=name,TEAM);await finance.locator('#financeBackupReminder .backup-folder-settings[data-backup-scope="finance"] [data-folder-action="select"]').click();
    await finance.waitForFunction(()=>document.querySelector('#financeBackupReminder .backup-folder-settings[data-backup-scope="finance"]').textContent.includes('Each area needs its own'));
    assert.equal((await databaseRecord(finance,'finance')).revision,financeRecord.revision);assert.equal((await databaseRecord(finance,'vet')).name,TEAM);
    await finance.evaluate(async()=>{const {getBackupFolder}=await import('/assets/js/backup-folder.mjs?v=area-backups-1');await getBackupFolder('finance').refresh();});
    assert.deepEqual(await files(finance,FINANCE),afterRetry);assert.deepEqual(await files(finance,TEAM),{});
    pass('Launchpad, Finance and VET retain independent folders in IndexedDB; selecting a directory already used by another area is rejected without moving or writing files.');

    await finance.setViewportSize({width:390,height:844});assert.ok(await finance.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await finance.locator('#financeBackupReminder').scrollIntoViewIfNeeded();await finance.screenshot({path:path.join(out,'private-default-folder-finance-mobile.png'),fullPage:false});
    await launchpad.setViewportSize({width:390,height:844});assert.ok(await launchpad.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await privatePanel.scrollIntoViewIfNeeded();await launchpad.screenshot({path:path.join(out,'private-default-folder-launchpad-mobile.png'),fullPage:false});
    pass('Finance and Launchpad folder controls fit at 390 pixels without horizontal page overflow.');
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.externalRequests,[]);report.pass=true;report.successfulPrivateFiles=Object.entries(afterRetry).filter(([,text])=>text).map(([name])=>name);report.emptyFailedFiles=Object.entries(afterRetry).filter(([,text])=>!text).map(([name])=>name);
    await context.close();console.log(`PASS separate private backup folders: ${report.checks.length} checks; actual OPFS/IndexedDB; no real Drive or personal profile.`);
  }catch(error){report.error=error.message;throw error;}
  finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'private-default-folder-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
