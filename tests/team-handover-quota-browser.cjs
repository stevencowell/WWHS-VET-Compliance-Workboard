// Real Chromium quota, isolated local origin, synthetic records only. Never use a saved profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const output=path.resolve(__dirname,'../../../outputs/team-handover-quota-browser-report.json');
const keys={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2',review:'wwhs-task-register-review:v1',inbox:'morning-launchpad-summary:v1',meta:'wwhs-team-handover:v1',journal:'wwhs-team-handover-journal:v1'};
const results=[],errors=[];
let browser;
async function contextPage(){
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Australia/Sydney',acceptDownloads:true,serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base&&route.request().method()==='GET'?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',error=>errors.push({type:'pageerror',message:error.message}));
  page.on('console',message=>{if(message.type()==='error')errors.push({type:'console',message:message.text()});});
  page.on('response',response=>{if(new URL(response.url()).origin===base&&response.status()>=400)errors.push({type:'http',url:response.url(),status:response.status()});});
  await page.clock.setFixedTime(new Date('2026-09-19T01:00:00.000Z'));
  await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.querySelector('#team-file').disabled);
  return {context,page};
}
async function seed(page){
  return page.evaluate(async keys=>{
    const {enrich,validateInbox}=await import('/morning-launchpad/assets/summary-core.mjs');
    const {snapshot,createBackup}=await import('/assets/js/team-handover-core.mjs');
    const privateItems=Array.from({length:4},(_,i)=>enrich({id:`synthetic-email-${i}`,taskKey:`email:synthetic-${i}`,title:`Synthetic private email ${i}`,action:'Keep this private',workstream:'personal',source:`PRIVATE_EMAIL_${i}`,sourceSummary:'PRIVATE_EMAIL_SUMMARY',noteText:`Private note ${i}`,noteHtml:`<p>PRIVATE_HTML_${i}${'x'.repeat(760000)}</p>`}));
    const shared=enrich({id:'synthetic-team-card',taskKey:'workboard:vet:a-01-confirm-authority-set',title:'Confirm controlling sources',action:'Review the source',workstream:'vet',origin:{wing:'vet',taskId:'a-01-confirm-authority-set',recordKey:'a-01-confirm-authority-set',route:'#task/a-01-confirm-authority-set',cycle:'2026'},createdOn:'2026-09-19',noteText:'Original shared card note'});
    const inbox=JSON.stringify({version:2,briefing:'PRIVATE_BRIEFING',items:[...privateItems,shared],workboardImports:['vet:a-01-confirm-authority-set']});
    validateInbox(inbox);
    localStorage.setItem(keys.inbox,inbox);
    localStorage.setItem(keys.vet,JSON.stringify({schemaVersion:3,role:'htvet',guidance:true,links:{staff:'https://private.example/vet'},records:{'a-01-confirm-authority-set':{status:'in-progress',exceptionSummary:'Original VET note',stepChecks:{0:true},sourceChecked:false}},assignments:{},gaps:{},eventOccurrences:[]}));
    localStorage.setItem(keys.tas,JSON.stringify({schemaVersion:2,mode:'guided',linkDefaultsVersion:2,links:{staff:'https://private.example/tas'},records:{'class-readiness::2026':{status:'in-progress',exceptionReason:'Original TAS note',steps:{0:true}}},weekly:{},scheduleOverrides:{}}));
    localStorage.setItem(keys.review,JSON.stringify({version:1,records:{}}));
    localStorage.setItem('synthetic-finance-secret','PRIVATE_FINANCE_DO_NOT_CHANGE');
    const data=snapshot(localStorage);
    data.vet.records['a-01-confirm-authority-set'].exceptionSummary='Incoming shared VET note';
    data.tas.records['class-readiness::2026'].exceptionReason='Incoming shared TAS note';
    data.inbox.items[0].noteText='Incoming shared card note';
    return {inboxCharacters:inbox.length,file:createBackup({snapshot:data,editor:'Synthetic colleague',workspaceId:'synthetic-quota-team',exportId:'synthetic-export-one',savedAt:'2026-09-19T01:00:00.000Z'})};
  },keys);
}
async function privateDigest(page){
  return page.evaluate(async keys=>{
    const inbox=JSON.parse(localStorage.getItem(keys.inbox));
    const text=JSON.stringify({briefing:inbox.briefing,items:inbox.items.filter(item=>item.workstream==='personal'),vet:JSON.parse(localStorage.getItem(keys.vet)).links,tas:JSON.parse(localStorage.getItem(keys.tas)).links,role:JSON.parse(localStorage.getItem(keys.vet)).role,mode:JSON.parse(localStorage.getItem(keys.tas)).mode,finance:localStorage.getItem('synthetic-finance-secret')});
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return {length:text.length,hash:[...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('')};
  },keys);
}
async function storageDigests(page){
  return page.evaluate(async()=>Object.fromEntries(await Promise.all(Object.keys(localStorage).sort().map(async key=>{
    const text=localStorage.getItem(key),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return [key,{length:text.length,hash:[...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}];
  }))));
}
async function choose(page,file){
  await page.locator('#team-file').setInputFiles({name:'WWHS-team-handover.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
  await page.waitForFunction(()=>!document.getElementById('view-file').disabled||document.getElementById('handover-message').classList.contains('is-error'));
  assert.equal(await page.locator('#view-file').isEnabled(),true,await page.locator('#handover-message').innerText());
}
async function download(page,selector){const pending=page.waitForEvent('download');await page.locator(selector).click();const file=await pending;return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
async function check(name,body){try{const details=await body();results.push({name,passed:true,details});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack||error.message});console.error(error);}}
async function compactMeta(page){
  const meta=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),keys.meta);
  assert.equal(Object.hasOwn(meta.recovery||{},'raw'),false,'No redundant private inbox recovery copy is stored in metadata');
  assert.doesNotMatch(JSON.stringify(meta),/PRIVATE_EMAIL_|PRIVATE_HTML_|PRIVATE_FINANCE|PRIVATE_BRIEFING|private\.example/);
  return meta;
}
async function noRetainedJournal(page){
  const state=await page.evaluate(async key=>{
    const count=await new Promise((resolve,reject)=>{
      const open=indexedDB.open('wwhs-team-handover-recovery',1);
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result,transaction=db.transaction('transactions','readonly'),request=transaction.objectStore('transactions').count();let count;
        request.onsuccess=()=>{count=request.result;};transaction.oncomplete=()=>{db.close();resolve(count);};transaction.onabort=()=>{db.close();reject(transaction.error);};
      };
    });
    return {marker:localStorage.getItem(key),count};
  },keys.journal);
  assert.deepEqual(state,{marker:null,count:0},'Successful completion removes the marker and its actual IndexedDB journal record');
}

(async()=>{
  browser=await chromium.launch({headless:true});
  await check('Real quota: large private inbox imports, edits and exports safely without whole-inbox journal duplication',async()=>{
    const {context,page}=await contextPage();
    try{
      const {file,inboxCharacters}=await seed(page),originalPrivate=await privateDigest(page);
      const old=await page.evaluate(async({keys,file})=>{
        const {buildImportPlan}=await import('/assets/js/team-handover-core.mjs');
        const plan=buildImportPlan(localStorage,file,{firstConnection:true});
        const raw=JSON.stringify({version:1,transactionId:'synthetic-old-layout',phase:'prepared',before:{...plan.before,[keys.meta]:null},after:{...plan.after,[keys.meta]:'{}'}});
        let errorName=null;try{localStorage.setItem(keys.journal,raw);}catch(error){errorName=error.name;}
        if(errorName===null)localStorage.removeItem(keys.journal);
        return {journalCharacters:raw.length,errorName,journalPresent:localStorage.getItem(keys.journal)!==null};
      },{keys,file});
      assert.equal(old.errorName,'QuotaExceededError','The old journal layout exceeds this actual Chromium origin quota');assert.equal(old.journalPresent,false);
      await page.reload({waitUntil:'networkidle'});await choose(page,file);await page.locator('#view-file').click();await page.waitForURL(base+'/head-teacher-tas/#home');
      await page.waitForLoadState('networkidle');assert.deepEqual(await privateDigest(page),originalPrivate);
      await noRetainedJournal(page);
      let meta=await compactMeta(page);assert.equal(meta.active,null);
      assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).records['class-readiness::2026'].exceptionReason,keys.tas),'Incoming shared TAS note');
      await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await choose(page,file);
      await page.locator('#editor-name').fill('Synthetic quota editor');await page.locator('#only-editor').check();await page.locator('#start-session').click();await page.waitForURL(base+'/head-teacher-tas/#home');
      await page.goto(base+'/head-teacher-tas/#task/class-readiness',{waitUntil:'networkidle'});await page.locator('#task-dialog[open]').waitFor();
      await page.locator('#task-dialog textarea[name="exceptionReason"]').fill('Updated TAS note after safe quota import.');await page.getByRole('button',{name:'Save progress',exact:true}).click();
      await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await page.locator('#notes-saved').check();
      const exported=await download(page,'#finish-session');assert.equal(exported.revision,2);assert.equal(exported.data.tas.records['class-readiness::2026'].exceptionReason,'Updated TAS note after safe quota import.');
      assert.doesNotMatch(JSON.stringify(exported),/PRIVATE_|private\.example/);await compactMeta(page);
      await page.locator('#confirm-finish').click();await page.waitForFunction(()=>document.querySelector('#status-title').textContent==='Viewing the last shared snapshot');
      assert.deepEqual(await privateDigest(page),originalPrivate);meta=await compactMeta(page);assert.equal(meta.pendingExport,null);assert.equal(meta.active,null);
      await page.locator('#recovery-section summary').click();const recovery=await download(page,'#download-recovery');assert.equal(recovery.data.tas.records['class-readiness::2026'].exceptionReason,'Incoming shared TAS note');assert.doesNotMatch(JSON.stringify(recovery),/PRIVATE_|private\.example/);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys.journal),null);
      await noRetainedJournal(page);
      return {inboxCharacters,oldJournalCharacters:old.journalCharacters,realOldError:old.errorName,privateBytesPreserved:true};
    }finally{await context.close();}
  });

  await check('True final-capacity failure preserves every previous storage value and reports a usable error',async()=>{
    const {context,page}=await contextPage();
    try{
      const {file}=await seed(page);file.data.vet.records['a-01-confirm-authority-set'].exceptionSummary='Incoming large shared note. '.repeat(6500);
      const capacity=await page.evaluate(()=>{
        const key='synthetic-unrelated-quota-fill';let low=0,high=7*1024*1024;
        while(low+1<high){const mid=Math.floor((low+high)/2);try{localStorage.setItem(key,'q'.repeat(mid));low=mid;}catch(error){if(error.name!=='QuotaExceededError')throw error;high=mid;}}
        localStorage.setItem(key,'q'.repeat(Math.max(0,low-4096)));return {fillerCharacters:low-4096,reservedCharacters:4096};
      });
      await page.reload({waitUntil:'networkidle'});await choose(page,file);const before=await storageDigests(page);
      await page.locator('#view-file').click();await page.waitForFunction(()=>document.querySelector('#handover-message').classList.contains('is-error'));
      const message=await page.locator('#handover-message').innerText();assert.match(message,/storage|space|quota/i);assert.match(message,/unchanged|restored|kept|safe|no.+changed/i);
      assert.deepEqual(await storageDigests(page),before,'Quota failure restores every original localStorage value, including unrelated fill and private mail');
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys.journal),null,'Completed rollback removes the temporary marker');
      await noRetainedJournal(page);
      return {...capacity,message};
    }finally{await context.close();}
  });
})().catch(error=>{results.push({name:'Browser setup',passed:false,error:error.stack||error.message});console.error(error);}).finally(async()=>{
  if(browser)await browser.close();const report={base,disposableContexts:true,syntheticDataOnly:true,realChromiumQuota:true,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,errors};
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.failed||errors.length)process.exitCode=1;
});
