'use strict';
// Complete capture and backup flows, with synthetic data in disposable Chrome only.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Local preview only.');
const source='Subject: Synthetic image note\n\nPlease review the workshop layout.\nhttps://example.test/document\nLiteral <img src=x onerror=alert(1)> stays text.';
async function ready(page){await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_STORAGE);}
async function saved(page){return page.evaluate(()=>document.querySelector('summary-import').inbox.items.find(item=>item.title==='Synthetic image note'));}
async function capture(page,image){
 await page.getByRole('button',{name:'Paste email',exact:true}).click();
 const form=page.locator('email-capture');await form.getByRole('textbox',{name:'Email text',exact:true}).fill(source);
 if(image){await form.locator('input[type=file]').setInputFiles(image);await page.waitForFunction(()=>!document.querySelector('email-capture').imageBusy);assert.equal(await form.locator('.email-image-list img').count(),1,await form.locator('[role=status]').innerText());}
 await form.getByRole('button',{name:'Suggest action and priority',exact:true}).click();await form.getByRole('button',{name:'Save to Launchpad',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('email-capture .email-panel').open);
}
async function openNote(page){const card=page.locator('.import-card-disclosure').filter({has:page.locator('.rich-note-editor[aria-label="Note for Synthetic image note"]')});await card.evaluate(node=>node.open=true);return card.getByRole('textbox',{name:'Note for Synthetic image note',exact:true});}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());await page.goto(base+'/morning-launchpad/');await ready(page);
  const data=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=960;canvas.height=480;const c=canvas.getContext('2d');c.fillStyle='#225c4b';c.fillRect(0,0,960,480);c.fillStyle='white';c.font='40px sans-serif';c.fillText('Synthetic workshop sketch',40,120);return canvas.toDataURL('image/png');});
  const file={name:'Workshop sketch.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')};
  await capture(page);let item=await saved(page);assert.equal(item.noteText,source);assert.ok(item.dirty.includes('noteText'));
  let editor=await openNote(page);assert.equal(await editor.innerText(),source);assert.equal(await editor.locator('img').count(),0);assert.equal(await editor.locator('a').count(),1);
  await capture(page,file);item=await saved(page);assert.equal(item.noteText,source);editor=await openNote(page);assert.equal(await editor.locator('img').count(),1);
  await capture(page,file);editor=await openNote(page);assert.equal(await editor.locator('img').count(),1);assert.equal(await page.evaluate(()=>document.querySelector('summary-import').inbox.items.length),1);
  // A screenshot pasted into Email text adds a preview without replacing the text.
  await page.getByRole('button',{name:'Paste email',exact:true}).click();await page.getByRole('textbox',{name:'Email text',exact:true}).fill(source);
  await page.evaluate(data=>{const bytes=atob(data.split(',')[1]),clipboard=new DataTransfer();clipboard.items.add(new File([Uint8Array.from(bytes,c=>c.charCodeAt(0))],'Pasted screenshot.png',{type:'image/png'}));document.querySelector('email-capture textarea').dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true,cancelable:true}));},data);
  await page.waitForFunction(()=>document.querySelector('email-capture').images.length===1&&!document.querySelector('email-capture').imageBusy);assert.equal(await page.getByRole('textbox',{name:'Email text',exact:true}).inputValue(),source);
  await page.locator('email-capture').getByRole('button',{name:'Remove image 1',exact:true}).click();assert.equal(await page.locator('.email-image-list img').count(),0);
  await page.locator('email-capture').getByRole('button',{name:'Suggest action and priority',exact:true}).click();await page.locator('email-capture').getByRole('button',{name:'Save to Launchpad',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('email-capture .email-panel').open);editor=await openNote(page);
  await editor.fill('My edited note');await editor.press('Tab');await page.waitForFunction(()=>document.querySelector('summary-import').inbox.items[0].noteText==='My edited note');
  // New images append to edited notes; repeated email text never replaces them.
  await capture(page,file);editor=await openNote(page);assert.match(await editor.innerText(),/My edited note/);assert.equal(await editor.locator('img').count(),1);assert.doesNotMatch(await editor.innerText(),/Please review/);
  await page.reload();await ready(page);editor=await openNote(page);assert.equal(await editor.locator('img').count(),1);assert.match(await editor.innerText(),/My edited note/);
  // Add an image directly through Note's real file picker, then wait for autosave.
  const noteSection=editor.locator('..');await noteSection.locator('input[type=file]').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('.import-working-note')?.dataset.noteUnsaved==='false'&&document.querySelectorAll('.rich-note-editor img').length===2);
  const backup=await page.evaluate(async()=>{const m=await import('/morning-launchpad/assets/launchpad-backup.mjs?v=plain-language-1');return JSON.stringify(m.createLaunchpadBackup(window.WWHS_STORAGE));});
  item=await saved(page);assert.equal((item.noteHtml.match(/<img /g)||[]).length,2);
  // Restore through the actual backup chooser in a second clean browser context.
  const fresh=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await fresh.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());const restored=await fresh.newPage();restored.on('pageerror',error=>errors.push(error.message));await restored.goto(base+'/morning-launchpad/');await ready(restored);
  await restored.locator('[data-backup-action="import"]').click();await restored.locator('#launchpad-backup-file').setInputFiles({name:'launchpad-backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});const dialog=restored.getByRole('dialog',{name:'Open backup',exact:true});await dialog.getByRole('button',{name:'Open backup',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const restoredEditor=await openNote(restored);assert.equal(await restoredEditor.locator('img').count(),2);assert.match(await restoredEditor.innerText(),/My edited note/);assert.equal(await restoredEditor.locator('img').first().evaluate(image=>image.getBoundingClientRect().width<=image.parentElement.getBoundingClientRect().width),true);
  // Image-only unsaved drafts stay visible when a conflicting saved list is reloaded.
  await page.evaluate(()=>{const board=document.querySelector('summary-import'),editor=board.querySelector('.rich-note-editor'),image=editor.querySelector('img').cloneNode();editor.replaceChildren(image);board.blocked=true;editor.dispatchEvent(new Event('input',{bubbles:true}));editor.blur();board.reloadSavedWork();});
  assert.equal(await page.locator('.import-draft-recovery img').count(),1);
  assert.deepEqual(errors,[]);await context.close();await fresh.close();console.log('PASS email notes/images: default text, safe rendering, duplicate edits/images, refresh, direct Note addition, desktop/mobile backup restore and image-only conflict recovery.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
