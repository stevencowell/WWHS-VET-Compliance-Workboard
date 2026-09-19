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
  await context.addInitScript(()=>{window.showSaveFilePicker=undefined;});
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
  assert.equal(Object.hasOwn(meta.recovery||{},'data'),false,'Shared recovery data is stored outside localStorage');
  assert.equal(Object.hasOwn(meta.active||{},'baselineData'),false,'The baseline is stored outside localStorage');
  assert.equal(Object.hasOwn(meta.pendingExport||{},'data'),false,'Pending file contents are stored outside localStorage');
  assert.ok(JSON.stringify(meta).length<12000,'Routine handover metadata remains small');
  assert.doesNotMatch(JSON.stringify(meta),/PRIVATE_EMAIL_|PRIVATE_HTML_|PRIVATE_FINANCE|PRIVATE_BRIEFING|private\.example/);
  return meta;
}
async function noRetainedJournal(page){
  const state=await page.evaluate(async key=>{
    if(!(await indexedDB.databases()).some(db=>db.name==='wwhs-team-handover-recovery'))return {marker:localStorage.getItem(key),count:0};
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
async function fillOrigin(page,reserve=8192){
  return page.evaluate(reserve=>{
    const key='synthetic-unrelated-quota-fill';let low=0,high=7*1024*1024;
    while(low+1<high){const mid=Math.floor((low+high)/2);try{localStorage.setItem(key,'q'.repeat(mid));low=mid;}catch(error){if(error.name!=='QuotaExceededError')throw error;high=mid;}}
    localStorage.setItem(key,'q'.repeat(Math.max(0,low-reserve)));return {fillerCharacters:low-reserve,reservedCharacters:reserve};
  },reserve);
}
async function seedUnchangedFile(page){
  await seed(page);
  // Keep forecast refresh outside its source calendar so this test isolates
  // metadata growth from separately generated scheduled cards.
  await page.clock.setFixedTime(new Date('2035-01-01T01:00:00.000Z'));
  return page.evaluate(async keys=>{
    const {snapshot,createBackup,buildImportPlan}=await import('/assets/js/team-handover-core.mjs');
    const vet=JSON.parse(localStorage.getItem(keys.vet)),inbox=JSON.parse(localStorage.getItem(keys.inbox));
    vet.records['a-01-confirm-authority-set'].exceptionSummary='V'.repeat(100000);
    inbox.items.find(item=>item.id==='synthetic-team-card').noteText='C'.repeat(100000);
    localStorage.setItem(keys.vet,JSON.stringify(vet));localStorage.setItem(keys.inbox,JSON.stringify(inbox));
    const file=createBackup({snapshot:snapshot(localStorage),editor:'Synthetic colleague',workspaceId:'synthetic-near-full-team',exportId:'synthetic-large-export',savedAt:'2026-09-19T01:00:00.000Z'});
    // Store the same canonical representation an import uses. The following
    // import should change only handover metadata, not live task values.
    const plan=buildImportPlan(localStorage,file,{firstConnection:true});
    for(const [key,raw] of Object.entries(plan.after))if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw);
    return file;
  },keys);
}
async function assertPrivateAndUnrelated(page,privateBefore,unrelatedBefore){
  assert.deepEqual(await privateDigest(page),privateBefore);
  assert.deepEqual((await storageDigests(page))['synthetic-unrelated-quota-fill'],unrelatedBefore,'Unrelated origin data is byte-for-byte unchanged');
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

  await check('Near-full origin: unchanged large team data supports all handover actions using compact metadata',async()=>{
    const {context,page}=await contextPage();
    try{
      const file=await seedUnchangedFile(page),capacity=await fillOrigin(page),originalPrivate=await privateDigest(page),unrelated=(await storageDigests(page))['synthetic-unrelated-quota-fill'];
      const old=await page.evaluate(({keys,file})=>{
        const lastFile=Object.fromEntries(Object.entries(file).filter(([key])=>key!=='data'));
        const inline={version:1,lastFile,active:{id:'synthetic-inline',phase:'editing',baselineData:file.data},pendingExport:null,recovery:{capturedAt:'2026-09-19T01:00:00.000Z',data:file.data}};
        let errorName=null;try{localStorage.setItem(keys.meta,JSON.stringify(inline));}catch(error){errorName=error.name;}
        if(errorName===null)localStorage.removeItem(keys.meta);return {errorName,inlineCharacters:JSON.stringify(inline).length};
      },{keys,file});
      assert.equal(old.errorName,'QuotaExceededError','Inline baseline and recovery copies exceed the remaining real browser capacity');
      await page.reload({waitUntil:'networkidle'});await choose(page,file);await page.locator('#view-file').click();await page.waitForURL(base+'/head-teacher-tas/#home');await page.waitForLoadState('networkidle');
      await compactMeta(page);await assertPrivateAndUnrelated(page,originalPrivate,unrelated);
      await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await choose(page,file);await page.locator('#editor-name').fill('Synthetic near-full editor');await page.locator('#only-editor').check();await page.locator('#start-session').click();await page.waitForURL(base+'/head-teacher-tas/#home');
      await compactMeta(page);await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await page.locator('#notes-saved').check();
      const first=await download(page,'#finish-session');assert.equal(first.revision,2);assert.deepEqual(first.data,file.data);await compactMeta(page);
      await page.reload({waitUntil:'networkidle'});const repeat=await download(page,'#download-again');assert.deepEqual(repeat,first,'Reloaded pending export downloads the exact same complete file');
      await page.locator('#resume-editing').click();await page.waitForURL(base+'/head-teacher-tas/#home');assert.equal((await compactMeta(page)).active.phase,'editing');
      await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await page.locator('#notes-saved').check();const final=await download(page,'#finish-session');assert.equal(final.revision,2);assert.notEqual(final.exportId,first.exportId);assert.deepEqual(final.data,file.data);
      await page.locator('#confirm-finish').click();await page.waitForFunction(()=>document.querySelector('#status-title').textContent==='Viewing the last shared snapshot');
      const meta=await compactMeta(page);assert.equal(meta.active,null);assert.equal(meta.pendingExport,null);
      await page.locator('#recovery-section summary').click();const recovery=await download(page,'#download-recovery');assert.deepEqual(recovery.data,file.data);
      await assertPrivateAndUnrelated(page,originalPrivate,unrelated);await noRetainedJournal(page);
      return {...capacity,inlineMetadataCharacters:old.inlineCharacters,compactMetadataCharacters:JSON.stringify(meta).length,liveDataUnchanged:true,allHandoverActionsPassed:true};
    }finally{await context.close();}
  });

  await check('Missing IndexedDB handover payload blocks controls and preserves local progress',async()=>{
    const {context,page}=await contextPage();
    try{
      const {file}=await seed(page);await page.reload({waitUntil:'networkidle'});await choose(page,file);await page.locator('#view-file').click();await page.waitForURL(base+'/head-teacher-tas/#home');
      const meta=await compactMeta(page);assert.ok(meta.recovery.dataRef.id);
      const before=await storageDigests(page);
      await page.evaluate(async id=>new Promise((resolve,reject)=>{
        const open=indexedDB.open('wwhs-team-handover-payloads',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{
          const db=open.result,transaction=db.transaction('payloads','readwrite');transaction.objectStore('payloads').delete(id);transaction.oncomplete=()=>{db.close();resolve();};transaction.onabort=()=>{db.close();reject(transaction.error);};
        };
      }),meta.recovery.dataRef.id);
      await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#handover-message').classList.contains('is-error'));
      assert.equal(await page.locator('button:not([disabled]),input:not([disabled]),textarea:not([disabled])').count(),0,'A missing payload never becomes an empty recovery or editable session');
      assert.deepEqual(await storageDigests(page),before);
      const message=await page.locator('#handover-message').innerText();assert.match(message,/missing|could not|cannot|unavailable|not found/i);return {message,progressUnchanged:true};
    }finally{await context.close();}
  });

  await check('Legacy inline metadata keeps complete downloads and migrates payloads on the next successful change',async()=>{
    const {context,page}=await contextPage();
    try{
      const file=await seedUnchangedFile(page),originalPrivate=await privateDigest(page);
      await page.evaluate(({keys,file})=>{
        const lastFile=Object.fromEntries(Object.entries(file).filter(([key])=>key!=='data'));
        localStorage.setItem(keys.meta,JSON.stringify({version:1,lastFile,active:{id:'synthetic-legacy-session',editor:'Synthetic legacy editor',startedAt:'2026-09-19T01:00:00.000Z',phase:'exporting',baseExportId:file.exportId,baselineData:file.data},pendingExport:file,recovery:{capturedAt:'2026-09-19T01:00:00.000Z',lastFile:null,data:file.data,raw:{unused:'legacy redundant data'}}}));
      },{keys,file});
      await page.reload({waitUntil:'networkidle'});const legacy=await download(page,'#download-again');assert.deepEqual(legacy,file,'Legacy pending file hydrates without dropping content');
      await page.locator('#resume-editing').click();await page.waitForURL(base+'/head-teacher-tas/#home');const compact=await compactMeta(page);assert.ok(compact.active.baselineRef.id);assert.ok(compact.recovery.dataRef.id);assert.equal(compact.pendingExport,null);
      await page.goto(base+'/team-handover/?wing=tas',{waitUntil:'networkidle'});await page.locator('#notes-saved').check();const migrated=await download(page,'#finish-session');assert.deepEqual(migrated.data,file.data);
      await page.locator('#recovery-section summary').click();const recovered=await download(page,'#download-recovery');assert.deepEqual(recovered.data,file.data);assert.deepEqual(await privateDigest(page),originalPrivate);
      return {legacyDataRetained:true,compactMetadataCharacters:JSON.stringify(compact).length};
    }finally{await context.close();}
  });

  await check('True final-capacity failure preserves every previous storage value and reports a usable error',async()=>{
    const {context,page}=await contextPage();
    try{
      const {file}=await seed(page);file.data.vet.records['a-01-confirm-authority-set'].exceptionSummary='Incoming large shared note. '.repeat(6500);
      const capacity=await fillOrigin(page,4096);
      await page.reload({waitUntil:'networkidle'});await choose(page,file);const before=await storageDigests(page);
      await page.locator('#view-file').click();await page.waitForFunction(()=>document.querySelector('#handover-message').classList.contains('is-error'));
      const message=await page.locator('#handover-message').innerText();assert.match(message,/storage|space|quota/i);assert.match(message,/unchanged|restored|kept|safe|no.+changed/i);
      const details=page.locator('#handover-storage-details');await details.waitFor({state:'visible'});
      if(!await details.evaluate(node=>node.open))await details.locator('summary').click();
      const diagnostics=await details.innerText();assert.match(diagnostics,/Other saved website data/);assert.match(diagnostics,/\d/);
      assert.doesNotMatch(diagnostics,/PRIVATE_|private\.example|synthetic-email|synthetic-finance-secret|synthetic-unrelated-quota-fill/,'Diagnostics contain sizes and labels only');
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
