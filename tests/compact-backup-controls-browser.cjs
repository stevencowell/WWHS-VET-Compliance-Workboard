'use strict';
// Visual and interaction checks in disposable browsers, using synthetic state only.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Disposable local preview only.');
const out=path.resolve(__dirname,'../../../outputs'),results=[],errors=[];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390])for(const theme of ['light','dark'])for(const [wing,route] of [['vet','/#vet-home'],['tas','/head-teacher-tas/#home'],['launchpad','/morning-launchpad/']]){
   const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
   await context.addInitScript(theme=>{localStorage.setItem('morning-launchpad-theme',theme);window.showSaveFilePicker=undefined;window.showDirectoryPicker=undefined;},theme);
   const page=await context.newPage();page.on('pageerror',e=>errors.push({url:page.url(),message:e.message,stack:e.stack,name:e.name}));await page.goto(base+route);await page.locator('.backup-toolbar').waitFor();
   if(wing==='launchpad')await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
   const toolbar=page.locator('.backup-toolbar');assert.equal(await toolbar.count(),1,'One backup toolbar per workspace');assert.equal(await page.locator('dialog[open]').count(),0,'No automatic backup modal');
   const box=await toolbar.boundingBox();assert.ok(box.height<=(width===390?125:70),`Compact ${wing} toolbar: ${box.height}`);assert.ok(box.y<400,'Backup controls stay at the top');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No horizontal overflow');
   const open=toolbar.getByRole(wing==='launchpad'?'button':'link',{name:'Open backup…',exact:true}),save=toolbar.getByRole(wing==='launchpad'?'button':'link',{name:'Save backup…',exact:true});assert.equal(await open.isVisible(),true);assert.equal(await save.isVisible(),true);
   await page.screenshot({path:path.join(out,`compact-backup-${wing}-${width}-${theme}.png`)});
   if(wing==='launchpad'){
    await save.click();const dialog=page.getByRole('dialog',{name:'Save your Launchpad backup',exact:true});await dialog.waitFor({state:'visible'});assert.equal(await dialog.getByRole('button',{name:'Save backup…',exact:true}).isVisible(),true);await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await save.evaluate(el=>el===document.activeElement),true,'Escape returns focus to Save');
    await open.click();const importDialog=page.getByRole('dialog',{name:'Open backup',exact:true});await importDialog.waitFor({state:'visible'});await importDialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await open.evaluate(el=>el===document.activeElement),true,'Cancel returns focus to Open');
   }else{
    assert.ok((await open.getAttribute('href')).endsWith(`/team-handover/?wing=${wing}#import-backup`));assert.ok((await save.getAttribute('href')).endsWith(`/team-handover/?wing=${wing}#save-backup`));const details=toolbar.getByRole('button',{name:'Details',exact:true});await details.click();const dialog=page.getByRole('dialog',{name:`${wing.toUpperCase()} backup details`,exact:true});await dialog.waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await details.evaluate(el=>el===document.activeElement),true);
   }
   results.push({wing,width,theme,toolbarHeight:box.height,oneToolbar:true,noAutomaticModal:true,focusReturns:true});await context.close();
  }
  // Recovery stays visible in the compact strip and opens a readable explanation.
  const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(()=>localStorage.setItem('wwhs-team-handover-journal:v1','synthetic interrupted recovery'));const page=await context.newPage();await page.goto(base+'/#vet-home');await page.getByRole('button',{name:'Review issue',exact:true}).click();assert.match(await page.locator('#team-import-prompt').innerText(),/interrupted|recover/i);assert.equal(await page.evaluate(()=>localStorage.getItem('wwhs-team-handover-journal:v1')),'synthetic interrupted recovery');await context.close();
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'compact-backup-controls-browser.json'),JSON.stringify({pass:true,results,recoveryPreserved:true,errors},null,2));console.log('PASS compact backup controls: 12 desktop/mobile light/dark views, focused dialogs, correct area links and recovery visibility.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

