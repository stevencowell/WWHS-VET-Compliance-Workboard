'use strict';
// Read-only component review in a disposable blank local page.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Local preview only');
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],results=[];
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base)return route.abort();if(url.pathname==='/__backup-picker-review')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Synthetic picker review</title></head><body><main id="host"></main></body></html>'});return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/__backup-picker-review');
  await page.evaluate(async()=>{
   window.__events=[];window.__mode='picker';window.__readFinished=false;
   window.showDirectoryPicker=async()=>await navigator.storage.getDirectory();
   const deferred=()=>new Promise(resolve=>{window.__release=resolve;});
   const file=()=>({name:'synthetic-finance.json',size:100,text:async()=>{
    if(window.__mode.startsWith('text'))await deferred();window.__readFinished=true;
    return window.__mode==='text-invalid'?'{broken':JSON.stringify({format:'finance-studio-encrypted-vault',version:1,ciphertext:'synthetic'});
   }});
   window.showOpenFilePicker=async()=>{if(window.__mode==='picker')await deferred();return[{getFile:async()=>{if(window.__mode==='get-file')await deferred();return file();}}];};
   const {mountBackupFileBrowser}=await import('/assets/js/backup-file-browser.mjs?v=area-backups-1');
   window.__mount=()=>{window.__picker=mountBackupFileBrowser(document.querySelector('#host'),{scope:'finance',onFile:async file=>window.__events.push({file:file.name}),onError:error=>window.__events.push({error:error.message})});};window.__mount();
  });
  for(const mode of ['picker','get-file','text-valid','text-invalid']){
   await page.waitForFunction(()=>!document.querySelector('#host button:last-of-type').disabled);
   await page.evaluate(mode=>{window.__mode=mode;window.__release=null;window.__events=[];window.__readFinished=false;},mode);
   await page.getByRole('button',{name:'Browse files…',exact:true}).click();await page.waitForFunction(()=>typeof window.__release==='function');
   await page.evaluate(()=>{window.__picker.reset();window.__release();});
   await page.waitForFunction(()=>!document.querySelector('#host button:last-of-type').disabled);assert.deepEqual(await page.evaluate(()=>window.__events),[]);assert.equal(await page.locator('#host [role="status"]').textContent(),'');results.push(`Reset ignores late ${mode} selection and errors`);
  }
  await page.evaluate(()=>{window.__mode='text-valid';window.__release=null;window.__events=[];window.__readFinished=false;});await page.getByRole('button',{name:'Browse files…',exact:true}).click();await page.waitForFunction(()=>typeof window.__release==='function');
  await page.evaluate(()=>{window.__picker.setDisabled(true);window.__release();});await page.waitForFunction(()=>window.__readFinished);assert.deepEqual(await page.evaluate(()=>window.__events),[]);await page.evaluate(()=>window.__picker.setDisabled(false));results.push('Disabled restore controls cannot accept a file finishing in the background');
  await page.evaluate(()=>{window.__mode='text-invalid';window.__release=null;window.__events=[];window.__readFinished=false;});await page.getByRole('button',{name:'Browse files…',exact:true}).click();await page.waitForFunction(()=>typeof window.__release==='function');
  await page.evaluate(()=>{window.__picker.dispose();window.__release();});await page.waitForFunction(()=>window.__readFinished);assert.deepEqual(await page.evaluate(()=>window.__events),[]);assert.equal(await page.locator('#host .backup-file-browser').count(),0);results.push('Disposed controls ignore a late unreadable file');
  assert.deepEqual(errors,[]);await fs.writeFile(path.resolve(__dirname,'../../../outputs/backup-file-browser-review.json'),JSON.stringify({pass:true,results,errors},null,2));await context.close();
 }finally{await browser.close();}
 console.log(`PASS independent backup browser review: ${results.length} cancellation/busy/disposal checks.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
