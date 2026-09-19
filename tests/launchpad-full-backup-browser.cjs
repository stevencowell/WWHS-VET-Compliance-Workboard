'use strict';
// Complete backup round-trips on fresh disposable desktop/mobile contexts only.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Local preview only.');
const output=path.resolve(__dirname,'../../../outputs/launchpad-full-backup-browser.json'),results=[],errors=[];
const inboxKey='morning-launchpad-summary:v1',calendarKey='morning-launchpad-calendar:v1',restoreKey='morning-launchpad-restore:v1';
async function ready(page){await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);}
async function open(page,text){await page.locator('[data-backup-action="import"]').click();const dialog=page.getByRole('dialog',{name:'Open backup',exact:true});await dialog.waitFor({state:'visible'});await page.locator('#launchpad-backup-file').setInputFiles({name:'launchpad-backup.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.waitForFunction(()=>!document.querySelector('#launchpad-backup-file').disabled);return dialog;}
async function apply(dialog){await dialog.getByRole('button',{name:'Open backup',exact:true}).click();await dialog.waitFor({state:'hidden'});}
async function snapshot(page){return page.evaluate(()=>Object.fromEntries(['morning-launchpad-summary:v1','morning-launchpad-calendar:v1','morning-launchpad-routine:v1','morning-launchpad-favourites:v1','morning-launchpad-theme'].map(key=>[key,window.WWHS_STORAGE.getItem(key)])));}
(async()=>{
 const root=path.resolve(__dirname,'..'),{enrich}=await import(pathToFileURL(path.join(root,'morning-launchpad/assets/summary-core.mjs'))),{normalEvent}=await import(pathToFileURL(path.join(root,'morning-launchpad/assets/calendar-core.mjs'))),{createLaunchpadBackup,BACKUP_KEYS:keys}=await import(pathToFileURL(path.join(root,'morning-launchpad/assets/launchpad-backup.mjs')));
 const task=enrich({id:'synthetic-task',taskKey:'personal:synthetic-task',title:'Synthetic completed note',action:'Current action',personal:true,status:'done',noteText:'Keep Unicode: café 日本語 🐟',noteHtml:'<p><strong>Keep rich text 🐟</strong></p>',pinnedDate:'2026-09-19',dirty:['noteText','noteHtml','action']});
 const event=normalEvent({id:'synthetic-event',uid:'synthetic-event',title:'Synthetic appointment',startDate:'2026-09-21',endDate:'2026-09-21',description:'Current event note'});
 const records={[keys.inbox]:JSON.stringify({version:2,items:[task],briefing:'Synthetic briefing',pinWorkflowVersion:1,workboardImports:[],forecastContexts:{}}),[keys.calendar]:JSON.stringify({version:1,events:[event]}),[keys.plans]:JSON.stringify({version:1,days:{'2026-09-18':{commitment:'Calm day',capacity:'small',closed:true,tasks:[{id:'old',title:'Old completed task',state:'done'}]}}}),[keys.links]:JSON.stringify([{id:'synthetic-link',name:'Synthetic saved link',url:'https://example.test/kept'}]),[keys.theme]:'dark'};
 const backup=JSON.stringify(createLaunchpadBackup({getItem:key=>records[key]??null}));
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'Australia/Sydney',acceptDownloads:true,serviceWorkers:'block'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   await context.addInitScript(()=>{window.showSaveFilePicker=undefined;window.showDirectoryPicker=undefined;});
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.accept());await page.clock.setFixedTime(new Date('2026-09-19T01:00:00Z'));
   await page.goto(base+'/morning-launchpad/');await ready(page);
   let dialog=await open(page,backup);assert.match(await dialog.innerText(),/1 tasks, 1 calendar events, 1 older daily plans, 1 saved links/);await apply(dialog);
   const first=await snapshot(page);assert.deepEqual(JSON.parse(first[inboxKey]).items,[task]);for(const key of [keys.calendar,keys.plans,keys.links,keys.theme])assert.equal(first[key],records[key]);
   await page.waitForFunction(()=>window.WWHS_PRIVATE_NOTES_BACKUP.state().confirmedAt!==null&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup);
   await page.reload();await ready(page);assert.deepEqual(await snapshot(page),first);
   const newer=structuredClone(JSON.parse(backup)),updatedTask={...task,action:'Action edited on another device',noteText:'Newer chosen note 🐟',status:'review'};
   newer.records[inboxKey]=JSON.stringify({...JSON.parse(newer.records[inboxKey]),items:[updatedTask]});newer.records[calendarKey]=JSON.stringify({version:1,events:[{...event,description:'Newer chosen event'}]});
   dialog=await open(page,JSON.stringify(newer));const choice=dialog.getByRole('checkbox',{name:'Use versions from this backup where records differ'});assert.equal(await choice.isVisible(),true);assert.equal(await choice.isChecked(),false);await apply(dialog);assert.deepEqual(await snapshot(page),first);
   dialog=await open(page,JSON.stringify(newer));await dialog.getByRole('checkbox',{name:'Use versions from this backup where records differ'}).check();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual(await snapshot(page),first);
   dialog=await open(page,JSON.stringify(newer));await dialog.getByRole('checkbox',{name:'Use versions from this backup where records differ'}).check();await apply(dialog);
   let changed=await snapshot(page);assert.equal(JSON.parse(changed[inboxKey]).items[0].noteText,updatedTask.noteText);assert.equal(JSON.parse(changed[calendarKey]).events[0].description,'Newer chosen event');
   await page.locator('[data-backup-action="save"]').click();const saveDialog=page.getByRole('dialog',{name:'Save your Launchpad backup',exact:true});
   await page.evaluate(()=>{window.showSaveFilePicker=async()=>{throw new DOMException('Cancelled','AbortError');};});await saveDialog.getByRole('button',{name:'Save backup…',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#launchpad-backup-options .private-backup-actions button').disabled);assert.match(await saveDialog.locator('.private-backup-status').innerText(),/Save cancelled/);assert.deepEqual(await snapshot(page),changed);
   await page.evaluate(()=>{window.showSaveFilePicker=async()=>({createWritable:async()=>{throw Error('Synthetic file write failed');}});});await saveDialog.getByRole('button',{name:'Save backup…',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#launchpad-backup-options .private-backup-actions button').disabled);assert.match(await saveDialog.locator('.private-backup-status').innerText(),/could not be saved.*browser data is unchanged/i);assert.deepEqual(await snapshot(page),changed);
   await saveDialog.getByText('More backup options',{exact:true}).click();const previous=saveDialog.getByRole('button',{name:'Save previous copy…',exact:true});await previous.waitFor({state:'visible'});
   await page.evaluate(()=>{window.showSaveFilePicker=async()=>{throw new DOMException('Cancelled','AbortError');};});await previous.click();assert.deepEqual(await snapshot(page),changed);
   await page.evaluate(()=>{window.showSaveFilePicker=undefined;});const previousDownload=page.waitForEvent('download');await previous.click();const previousFile=await previousDownload;assert.deepEqual(JSON.parse(await fs.readFile(await previousFile.path(),'utf8')).records,first);
   await saveDialog.getByRole('button',{name:'Close',exact:true}).click();
   await page.evaluate(()=>{const board=document.querySelector('summary-import');board.showCalendar(true);board.calendar.edit(null,'2026-09-23');});
   await page.getByRole('textbox',{name:'Event title',exact:true}).fill('Unsaved synthetic event');
   const calendarDialog=page.getByRole('dialog',{name:'Calendar event',exact:true});
   // A draft remains visible and must not be silently omitted from a backup.
   await page.evaluate(()=>document.querySelector('summary-import').exportTaskBackup());
   assert.equal(await calendarDialog.isVisible(),true);assert.equal(await page.getByRole('textbox',{name:'Event title',exact:true}).inputValue(),'Unsaved synthetic event');
   assert.match(await page.locator('summary-import > .import-message').innerText(),/Save or cancel.*calendar event/);
   await calendarDialog.getByRole('button',{name:'Cancel',exact:true}).click();
   await page.evaluate(()=>{const board=document.querySelector('summary-import');board.calendar.save([...board.calendar.data.events,{id:'added-event',uid:'added-event',title:'New saved event',startDate:'2026-09-23',endDate:'2026-09-23',startTime:'',endTime:'',description:'',location:'',url:'',origin:'manual'}]);});
   await page.waitForFunction(()=>window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup);
   await page.locator('[data-backup-action="save"]').click();const pending=page.waitForEvent('download');await saveDialog.getByRole('button',{name:'Save backup…',exact:true}).click();const download=await pending;assert.match(download.suggestedFilename(),/^launchpad-backup.*\.json$/);const saved=await fs.readFile(await download.path(),'utf8');
   await page.getByRole('button',{name:'I’ve saved this backup',exact:true}).waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup),true);
   await page.keyboard.press('Escape');assert.match(await page.locator('.backup-toolbar-status').innerText(),/Confirm your downloaded copy/);await page.locator('[data-backup-action="save"]').click();assert.match(await saveDialog.locator('.private-backup-status').innerText(),/Download requested/);
   assert.deepEqual(JSON.parse(saved).records,await snapshot(page));await page.getByRole('button',{name:'I’ve saved this backup',exact:true}).click();await page.waitForFunction(()=>!window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),restoreKey),null);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   results.push({width,completeFreshDeviceRestore:true,defaultKeepsCurrent:true,cancelKeepsCurrent:true,explicitFileVersionWorks:true,previousPrivateCopyReopens:true,calendarDraftProtected:true,downloadRequiresConfirmation:true,reloadExact:true});await context.close();
  }
  // A missing recovery database must leave useful recovery controls available.
  const context=await browser.newContext({acceptDownloads:true});await context.addInitScript(({records,restoreKey})=>{for(const[key,raw]of Object.entries(records))localStorage.setItem(key,raw);localStorage.setItem(restoreKey,JSON.stringify({version:2,transactionId:'synthetic-missing',phase:'prepared'}));window.showSaveFilePicker=undefined;window.showDirectoryPicker=undefined;},{records,restoreKey});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));await page.goto(base+'/morning-launchpad/');await page.getByRole('button',{name:'Retry recovery',exact:true}).waitFor({state:'visible'});
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save recovery copy…',exact:true}).click();const file=await pending,recovery=JSON.parse(await fs.readFile(await file.path(),'utf8'));assert.equal(recovery.format,'wwhs-launchpad-recovery');assert.ok(recovery.current[inboxKey]);assert.match(recovery.recoveryError,/missing/);assert.ok(await page.evaluate(key=>localStorage.getItem(key),restoreKey));await context.close();results.push({missingRecoveryCopyExportsCurrentState:true});
  assert.deepEqual(errors,[]);await fs.writeFile(output,JSON.stringify({pass:true,results,errors},null,2));console.log('PASS complete Launchpad backup: desktop/mobile restore, explicit conflicts, calendar draft, confirmed downloads and missing-database recovery export.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
