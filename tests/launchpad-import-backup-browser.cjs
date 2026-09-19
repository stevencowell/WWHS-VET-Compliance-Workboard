// Exercise the real import/save controls with synthetic files in disposable browsers.
// No real profiles, user backups or Drive folders are opened.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const output=process.env.WORKBOARD_TEST_ARTIFACTS_DIR||path.resolve(__dirname,'../../../outputs/launchpad-import-backup');
const key='morning-launchpad-summary:v1',json=JSON.stringify;
const inbox=items=>({version:2,items,briefing:'',pinWorkflowVersion:1});
async function read(page){return page.evaluate(key=>window.WWHS_STORAGE.getItem(key),key);}
async function openImport(page){
  await page.locator('[aria-label="Private Launchpad backup"] [data-backup-action="import"]').click();
  const dialog=page.getByRole('dialog',{name:'Open backup',exact:true});await dialog.waitFor({state:'visible'});return dialog;
}
async function choose(page,payload,name='launchpad-task-backup.json'){
  await page.locator('#launchpad-backup-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof payload==='string'?payload:json(payload))});
}
async function submit(dialog){await dialog.getByRole('button',{name:'Open backup',exact:true}).click();}

(async()=>{
  const {enrich}=await import(pathToFileURL(path.resolve(__dirname,'../morning-launchpad/assets/summary-core.mjs')));
  const original=enrich({id:'existing-private',taskKey:'personal:existing',title:'Synthetic existing task',action:'Keep my edited action',personal:true,status:'done',source:'Current personal wording',dirty:['action','source'],createdOn:'2026-09-18'});
  const incoming=enrich({id:'imported-old-id',taskKey:'personal:existing',title:'Synthetic existing task',action:'Old action from backup',personal:true,status:'review',source:'Old wording'});
  const addition=enrich({id:'new-private',taskKey:'personal:new',title:'Synthetic added note',action:'',personal:true,status:'note',source:'New private reference note'});
  const payload=inbox([incoming,addition]),errors=[],results=[];
  await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true});
  try{
    for(const width of [1440,390]){
      const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'Australia/Sydney',acceptDownloads:true});
      await context.addInitScript(({key,raw})=>{
        if(!sessionStorage.getItem('synthetic-fixture')){localStorage.setItem(key,raw);sessionStorage.setItem('synthetic-fixture','yes');}
        window.__backupWrites=[];window.__backupEvents=[];window.__pickerCalls=[];window.__pickerMode='save';
        window.showSaveFilePicker=async options=>{
          window.__pickerCalls.push(options);
          if(window.__pickerMode==='cancel')throw new DOMException('Synthetic cancel','AbortError');
          return {createWritable:async()=>({write:async blob=>window.__backupWrites.push(await blob.text()),close:async()=>{window.__closed=true;}})};
        };
        window.addEventListener('launchpad:task-backup-requested',event=>window.__backupEvents.push(event.detail));
      },{key,raw:json(inbox([original]))});
      const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push({width,message:error.message}));page.on('dialog',dialog=>dialog.accept());
      await page.clock.setFixedTime(new Date('2026-09-19T01:00:00Z'));await page.goto(base+'/morning-launchpad/');
      await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
      const panel=page.locator('[aria-label="Private Launchpad backup"]');
      assert.equal(await panel.getByRole('button',{name:'Open backup…',exact:true}).isVisible(),true);
      assert.equal(await panel.getByRole('button',{name:'Save backup…',exact:true}).isVisible(),true);
      await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`launchpad-import-save-${width}.png`)});
      let dialog=await openImport(page);
      const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,'dialog fits viewport width');assert.ok(box.y>=0&&box.y+box.height<=1001,'dialog fits viewport height');
      assert.equal(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,'dialog has no horizontal overflow');
      await page.screenshot({path:path.join(output,`launchpad-import-dialog-${width}.png`)});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});

      dialog=await openImport(page);
      await page.evaluate(()=>{
        const originalText=File.prototype.text;
        File.prototype.text=function(){
          const file=this;File.prototype.text=originalText;window.__fileReadStarted=true;
          return new Promise(resolve=>{window.__releaseFileRead=async()=>resolve(await originalText.call(file));});
        };
      });
      await choose(page,payload);await page.waitForFunction(()=>window.__fileReadStarted);
      assert.equal(await dialog.getByRole('button',{name:'Open backup',exact:true}).isDisabled(),true);
      assert.equal(await dialog.getByRole('button',{name:'Cancel',exact:true}).isDisabled(),true);
      assert.equal(await page.locator('#launchpad-backup-file').isDisabled(),true);
      await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true,'Escape cannot leave an active file import hidden');
      await page.evaluate(()=>window.__releaseFileRead());await submit(dialog);await dialog.waitFor({state:'hidden'});
      let saved=JSON.parse(await read(page));const kept=saved.items.find(item=>item.taskKey==='personal:existing');
      assert.equal(kept.status,'done');assert.equal(kept.action,original.action);assert.equal(kept.source,original.source);assert.equal(kept.id,original.id);
      assert.equal(saved.items.filter(item=>item.taskKey==='personal:new').length,1);assert.equal(saved.items.find(item=>item.taskKey==='personal:new').source,addition.source);
      dialog=await openImport(page);await choose(page,payload);await submit(dialog);await dialog.waitFor({state:'hidden'});
      saved=JSON.parse(await read(page));assert.equal(saved.items.filter(item=>item.taskKey==='personal:new').length,1);assert.equal(saved.items.filter(item=>item.taskKey==='personal:existing').length,1);

      for(const [name,wrong]of [['finance-backup.json',{schema:'finance-studio',version:1,accounts:[],transactions:[]}],['WWHS-team-handover.json',{format:'wwhs-team-handover',version:1,data:{vet:{},tas:{},review:{},inbox:{}}}],['broken.json','{"version":2,"items":']]){
        const before=await read(page);dialog=await openImport(page);await choose(page,wrong,name);
        await dialog.getByRole('alert').filter({hasText:'Could not open this backup.'}).waitFor({state:'visible'});
        assert.equal(await dialog.isVisible(),true);assert.equal(await read(page),before,`${name} leaves saved notes byte-for-byte unchanged`);await page.keyboard.press('Escape');
      }

      await page.getByRole('button',{name:'Add my note',exact:true}).click();
      await page.getByRole('textbox',{name:'Note title',exact:true}).fill('Synthetic unsaved draft');
      await page.getByRole('textbox',{name:'My note',exact:true}).fill('Keep this unsaved text intact.');
      const beforeDraft=await read(page);dialog=await openImport(page);await choose(page,inbox([enrich({...addition,id:'third-note',taskKey:'personal:third',title:'Must not import yet'})]));await submit(dialog);
      await dialog.getByText('Save or cancel your open note or calendar event first. Your draft is still here.',{exact:true}).waitFor({state:'visible'});
      assert.equal(await read(page),beforeDraft);await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('textbox',{name:'Note title',exact:true}).inputValue(),'Synthetic unsaved draft');
      assert.equal(await page.getByRole('textbox',{name:'My note',exact:true}).inputValue(),'Keep this unsaved text intact.');
      await page.locator('summary-import details').filter({has:page.getByRole('textbox',{name:'Note title',exact:true})}).getByRole('button',{name:'Cancel',exact:true}).click();

      await page.evaluate(()=>{window.__pickerMode='cancel';});const beforeCancel=await read(page);
      await panel.locator('[data-backup-action="save"]').click();
      await page.waitForFunction(()=>document.querySelector('summary-import').message.textContent.includes('Save cancelled.'));
      assert.equal(await read(page),beforeCancel);assert.deepEqual(await page.evaluate(()=>window.__backupWrites),[]);assert.deepEqual(await page.evaluate(()=>window.__backupEvents),[]);
      await page.evaluate(()=>{window.__pickerMode='save';});await panel.locator('[data-backup-action="save"]').click();
      await page.waitForFunction(()=>window.__backupEvents.length===1);
      const evidence=await page.evaluate(()=>({closed:window.__closed,pickers:window.__pickerCalls,writes:window.__backupWrites,events:window.__backupEvents}));
      assert.equal(evidence.pickers.length,2);assert.equal(evidence.pickers[1].suggestedName,'launchpad-backup.json');assert.equal(evidence.closed,true);assert.equal(evidence.events[0].saved,true);
      assert.equal(JSON.parse(JSON.parse(evidence.writes[0]).records[key]).items.find(item=>item.taskKey==='personal:existing').status,'done');assert.equal(JSON.parse(JSON.parse(evidence.writes[0]).records[key]).items.filter(item=>item.taskKey==='personal:new').length,1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'page has no horizontal overflow');
      results.push({width,importPreservesEditsAndCompletion:true,reimportNoDuplicates:true,invalidFilesProtected:3,draftPreserved:true,keyboardClose:true,busyImportLocked:true,cancellationNoEvent:true,savePicker:true,dialogFits:true});await context.close();
    }
    assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),json({results,errors},null,2));
    console.log('PASS Launchpad desktop/mobile Import & save: real file input, safe merge, no duplicates, wrong/malformed file rejection, draft preservation, keyboard close, picker cancellation and successful save.');console.log(`Screenshots and report: ${output}`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
