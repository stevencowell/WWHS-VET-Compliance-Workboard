// Synthetic files in a disposable browser's OPFS only; no user Drive access.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Local test only');
(async()=>{
 const browser=await chromium.launch({headless:true}),report={pass:false,checks:[],errors:[]};
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   await context.addInitScript(()=>{
    window.__picked=[];window.showDirectoryPicker=async options=>{window.__picked.push({type:'directory',id:options.id});return(await navigator.storage.getDirectory()).getDirectoryHandle(options.id,{create:true});};
    window.showOpenFilePicker=async options=>{window.__picked.push({type:'open',id:options.id,startIn:options.startIn?.name});throw new DOMException('Cancel','AbortError');};
   });
   const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.setDefaultTimeout(15000);
   await page.goto(base+'/morning-launchpad/');await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
   const bar=page.getByRole('complementary',{name:'Launchpad backups'});await bar.getByRole('button',{name:'Save backup…',exact:true}).click();
   const save=page.locator('#launchpad-backup-options');await save.getByText('More backup options',{exact:true}).click();await save.locator('[data-folder-action="select"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-backup-scope="launchpad"]').textContent.includes('Selected: wwhs-launchpad-backups'));
   await page.evaluate(async()=>{
    const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle('wwhs-launchpad-backups');
    const write=async(name,value)=>{const file=await dir.getFileHandle(name,{create:true}),writer=await file.createWritable();await writer.write(JSON.stringify(value));await writer.close();};
    const {createLaunchpadBackup}=await import('/morning-launchpad/assets/launchpad-backup.mjs?v=area-backups-1');
    await write('launchpad-example.json',createLaunchpadBackup(window.WWHS_STORAGE));
    await write('finance-example.json',{format:'finance-studio-encrypted-vault',version:1,ciphertext:'synthetic'});
    await write('vet-example.json',{kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,scope:'vet',data:{}});
    await write('unrelated.json',{unrelated:true});
   });
   await save.getByRole('button',{name:'Close',exact:true}).click();await bar.getByRole('button',{name:'Open backup…',exact:true}).click();
   const open=page.getByRole('dialog',{name:'Open backup',exact:true}),files=open.locator('.backup-file-browser');
   await files.getByRole('button',{name:'Show Launchpad backups',exact:true}).click();await files.getByRole('button',{name:'launchpad-example.json',exact:true}).waitFor();
   assert.equal(await files.locator('li').count(),1);await files.getByRole('button',{name:'launchpad-example.json',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('#launchpad-backup-file').disabled&&!!document.querySelector('.launchpad-backup-dialog .import-primary:not(:disabled)'));
   assert.equal(await open.getByRole('button',{name:'Open backup',exact:true}).isEnabled(),true);
   await files.getByRole('button',{name:'Browse files…',exact:true}).click();
   const picker=await page.evaluate(()=>window.__picked.filter(item=>item.type==='open').at(-1));assert.deepEqual(picker,{type:'open',id:'wwhs-launchpad-backups',startIn:'wwhs-launchpad-backups'});
   await open.getByRole('button',{name:'Cancel',exact:true}).click();await page.reload();
   await page.waitForFunction(()=>document.querySelector('summary-import')?.started);
   await page.getByRole('complementary',{name:'Launchpad backups'}).getByRole('button',{name:'Open backup…',exact:true}).click();
   const restored=page.getByRole('dialog',{name:'Open backup',exact:true});await restored.getByRole('button',{name:'Show Launchpad backups',exact:true}).click();await restored.getByRole('button',{name:'launchpad-example.json',exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>window.__picked.filter(item=>item.type==='directory').length),0,'Remembered folder reused without directory picker');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   report.checks.push(`${width}px: scoped folder persisted, only Launchpad file listed, native Open starts in correct folder, cancelled import preserves data`);await context.close();
  }
  assert.deepEqual(report.errors,[]);report.pass=true;
 }finally{await browser.close();await fs.writeFile(path.resolve(__dirname,'../../../outputs/area-backup-files-browser.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
