// Disposable local Chromium and synthetic records only. Picker files are held
// in memory; this test never opens a personal profile or touches Google Drive.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const suffix=process.env.WORKBOARD_BACKUP_MATCH?'-'+process.env.WORKBOARD_BACKUP_MATCH.replace(/[^a-z0-9]+/gi,'-'):'';
const output=path.resolve(__dirname,`../../../outputs/team-backup-flow-browser-report${suffix}.json`);
const results=[],errors=[],when='2026-09-19T07:00:00.000Z';
const keys={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2',inbox:'morning-launchpad-summary:v1',review:'wwhs-task-register-review:v1',meta:'wwhs-team-handover:vet:v1'};
let browser;
async function ready(page){await page.waitForFunction(()=>document.getElementById('status-title')?.textContent!=='Checking this browser…'&&document.querySelector('#team-file-browser input[type=file]')&&!document.querySelector('#team-file-browser button').disabled);}
async function values(page){return page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>!key.startsWith('wwhs-team-safety-receipt:v1')).sort().map(key=>[key,(window.WWHS_STORAGE||localStorage).getItem(key)])));}
async function picker(page,mode='save',existing=''){await page.evaluate(({mode,existing})=>Object.assign(window.__save,{mode,existing,files:[],calls:[],reads:0,writers:0}),{mode,existing});}
async function press(page,selector){await page.locator(selector).click();await ready(page);}
async function downloaded(page,selector){const promise=page.waitForEvent('download');await press(page,selector);const file=await promise;return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
async function choose(page,file){await page.locator('#handover-import-link').click();await page.locator('#team-file-browser input[type=file]').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});await ready(page);}
async function fileSaved(page){return page.evaluate(()=>{const text=window.__save.files.at(-1);return text?JSON.parse(text):null;});}
async function newPage(){
  const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,serviceWorkers:'block',timezoneId:'Australia/Sydney'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base&&route.request().method()==='GET'?route.continue():route.abort());
  await context.addInitScript(()=>{
    sessionStorage.setItem('wwhs-team-import-prompt-seen:v1','yes');
    window.__save={mode:'save',existing:'',calls:[],files:[],reads:0,writers:0,aborts:0};
    window.showSaveFilePicker=async options=>{
      const mock=window.__save;mock.calls.push({suggestedName:options.suggestedName,activated:navigator.userActivation.isActive});
      if(mock.mode==='cancel')throw new DOMException('Synthetic cancellation','AbortError');
      if(mock.mode==='blocked')throw new DOMException('Synthetic blocked picker','SecurityError');
      if(mock.mode==='concurrent')localStorage.setItem('wwhs-task-register-review:v1',JSON.stringify({version:1,records:{'vet:2026:other-tab':{completed:true,reviewedOn:'2026-09-19'}}}));
      let staged;
      return {async getFile(){mock.reads++;return new File([mock.existing],'synthetic.json',{type:'application/json'});},async createWritable(){mock.writers++;return {
        async write(blob){staged=await blob.text();if(mock.mode==='write-fail')throw Error('Synthetic write failure');},
        async close(){if(mock.mode==='close-fail')throw Error('Synthetic close failure');mock.files.push(staged);mock.existing=staged;},
        async abort(){mock.aborts++;}
      };}};
    };
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
  page.on('dialog',dialog=>dialog.accept());
  page.on('response',response=>{if(new URL(response.url()).origin===base&&response.status()>=400)errors.push({url:response.url(),status:response.status()});});
  await page.goto(base+'/team-handover/?wing=vet#save-backup');await ready(page);return {context,page};
}
async function seed(page,mode){
  const fixture=await page.evaluate(async({keys,when,mode})=>{
    const core=await import('/assets/js/team-handover-core.mjs'),payloads=await import('/assets/js/team-handover-payloads.mjs'),recovery=await import('/assets/js/team-handover-recovery.mjs');
    const {enrich}=await import('/morning-launchpad/assets/summary-core.mjs');
    const store=window.WWHS_STORAGE||localStorage,info=({kind,schemaVersion,data,...value})=>value;
    const privateCard=enrich({id:'private-card',taskKey:'private-card',title:'Private synthetic note',personal:true,status:'note',action:'',noteText:'PRIVATE_NOTE',source:'PRIVATE_MAIL'});
    const team=enrich({id:'shared-card',taskKey:'workboard:vet:a-01-confirm-authority-set',title:'Shared synthetic note',action:'Check saved note',workstream:'vet',noteText:'CURRENT_SHARED_NOTE café 🛠️',
      origin:{wing:'vet',taskId:'a-01-confirm-authority-set',recordKey:'a-01-confirm-authority-set',route:'#task/a-01-confirm-authority-set',cycle:'2026'}});
    store.setItem(keys.vet,JSON.stringify({schemaVersion:3,records:{'a-01-confirm-authority-set':{status:'in-progress',exceptionSummary:'CURRENT_VET_NOTE café 🛠️',stepChecks:{0:true},sourceChecked:false}},assignments:{},gaps:{},eventOccurrences:[],links:{private:'https://private.example/vet'}}));
    store.setItem(keys.tas,JSON.stringify({schemaVersion:2,records:{'class-readiness::2026':{status:'in-progress',exceptionReason:'CURRENT_TAS_NOTE 澳洲',steps:{0:true}}},weekly:{'2026-09-14':{0:true}},eventOccurrences:{},scheduleOverrides:{},links:{private:'https://private.example/tas'}}));
    store.setItem(keys.inbox,JSON.stringify({version:2,items:[privateCard,team],briefing:'PRIVATE_BRIEFING'}));
    store.setItem(keys.review,JSON.stringify({version:1,records:{'vet:2026:a-01-confirm-authority-set':{completed:true,reviewedOn:'2026-09-19'}}}));
    localStorage.setItem('synthetic-finance','PRIVATE_FINANCE');
    const current=core.snapshot(store),baseline=structuredClone(current);baseline.vet.records['a-01-confirm-authority-set'].exceptionSummary='BASELINE_VET_NOTE';
    const first=core.createBackup({scope:'vet',snapshot:baseline,editor:'Synthetic colleague',workspaceId:'test-shared-team',exportId:'team-one',savedAt:when});
    const nextData=structuredClone(current);nextData.vet.records['a-01-confirm-authority-set'].exceptionSummary='LATEST_VET_NOTE';nextData.tas.records['class-readiness::2026'].exceptionReason='LATEST_TAS_NOTE';nextData.inbox.items[0].noteText='LATEST_SHARED_NOTE';
    const next=core.createBackup({snapshot:nextData,previous:first,editor:'Synthetic colleague',exportId:'team-two',savedAt:when});
    const safety=recovery.createSafetyBackup({scope:'vet',snapshot:nextData,editor:'Synthetic colleague',snapshotId:'selected-safety',savedAt:when});
    const meta={version:1,lastFile:info(first),active:{id:'test-session',phase:'editing',editor:'Synthetic editor',startedAt:when,baseExportId:first.exportId,baselineData:baseline},pendingExport:null,
      recovery:{capturedAt:when,lastFile:null,data:baseline,raw:{[keys.inbox]:'PRIVATE_OLD_HISTORY'}}};
    if(mode==='view')meta.active=null;
    if(['pending','missingpending'].includes(mode)){meta.active.phase='exporting';meta.pendingExport=core.createBackup({snapshot:current,previous:first,editor:'Synthetic editor',exportId:'pending-two',savedAt:when});}
    if(mode==='missingpendingrecord')meta.active.phase='exporting';
    if(mode==='individual')store.removeItem(keys.meta);
    else if(mode==='corruptmeta')store.setItem(keys.meta,'{PRIVATE_CORRUPT_HISTORY');
    else if(mode==='badheader'){meta.lastFile.changes={broken:true};meta.active.editor={broken:true};store.setItem(keys.meta,JSON.stringify(meta));}
    else{
      const compact=await payloads.prepareTeamMetadata(meta);store.setItem(keys.meta,JSON.stringify(compact));
      const ref=mode==='missingbaseline'?compact.active.baselineRef:mode==='missingrecovery'?compact.recovery.dataRef:mode==='missingpending'?compact.pendingExport.payloadRef:null;
      if(ref)await new Promise((resolve,reject)=>{const request=indexedDB.open('wwhs-team-handover-payloads',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('payloads','readwrite');tx.objectStore('payloads').delete(ref.id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
    }
    return {current,first,next,safety,metadataRaw:store.getItem(keys.meta)};
  },{keys,when,mode});
  await page.reload();await ready(page);return fixture;
}
function privateFree(file){assert.doesNotMatch(JSON.stringify(file),/PRIVATE_|private\.example/);}
function notes(file,expected){assert.equal(file.data.vet.records['a-01-confirm-authority-set'].exceptionSummary,expected.vet.records['a-01-confirm-authority-set'].exceptionSummary);if(file.scope==='vet')assert.deepEqual(file.data.tas.records,{});assert.equal(file.data.inbox.items[0].noteText,expected.inbox.items[0].noteText);}
async function check(name,body){if(process.env.WORKBOARD_BACKUP_MATCH&&!name.includes(process.env.WORKBOARD_BACKUP_MATCH))return;try{const detail=await body();results.push({name,passed:true,detail});console.log('PASS '+name);}catch(error){const message=(error.stack||error.message).slice(0,2500);results.push({name,passed:false,error:message});console.error('FAIL '+name+'\n'+message);}}

(async()=>{
  browser=await chromium.launch({headless:true});
  try{
    for(const mode of ['individual','active','view','pending','missingbaseline','missingrecovery','missingpending','missingpendingrecord','corruptmeta','badheader'])await check(`Open and Save stay distinct with ${mode} history; exact private-safe saved file`,async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,mode),before=await values(page);
        await page.locator('#handover-import-link').click();assert.equal(await page.locator('#start-section').isVisible(),true);assert.equal(await page.locator('#save-panel').isVisible(),false);
        await page.locator('#handover-save-link').click();assert.equal(await page.locator('#save-panel').isVisible(),true);assert.equal(await page.locator('#start-section').isVisible(),false);assert.deepEqual(await values(page),before);
        const button=mode==='individual'?'#create-team':mode==='active'?'#finish-session':mode==='pending'?'#download-again':'#save-safety';
        await picker(page,'cancel');await press(page,button);assert.deepEqual(await values(page),before);assert.match(await page.locator('#handover-message').innerText(),/cancelled/i);
        await picker(page);await press(page,button);const saved=await fileSaved(page);assert.ok(saved,'visible Save produces a file');privateFree(saved);notes(saved,f.current);
        assert.equal(saved.kind,['individual','active','pending'].includes(mode)?'WWHS-TEAM-HANDOVER':'WWHS-TEAM-SAFETY-BACKUP');
        const mock=await page.evaluate(()=>({calls:window.__save.calls,reads:window.__save.reads,writers:window.__save.writers}));assert.equal(mock.calls[0].activated,true);assert.ok(mock.reads>=1);assert.equal(mock.writers,1);
        if(saved.kind==='WWHS-TEAM-SAFETY-BACKUP'){assert.deepEqual(await values(page),before);assert.match(await page.locator('#save-receipt').innerText(),/Safety backup saved/);assert.equal(await page.evaluate(()=>window.WWHS_TEAM_EXIT_GUARD.hasSafetyBackup()),true);}
        else{assert.equal(await page.locator('#pending-session').isVisible(),true);assert.equal(await page.locator('#confirm-finish').isDisabled(),false);assert.equal(JSON.parse((await values(page))[keys.meta]).active.phase,'exporting');}
        for(const width of [390,1440]){await page.setViewportSize({width,height:1050});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}px overflow`);}
        return {kind:saved.kind,pickerRead:mock.reads};
      }finally{await context.close();}
    });
    await check('blocked picker and explicit download keep safety receipt and browser records intact',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'missingbaseline'),before=await values(page);await picker(page,'blocked');
        const first=await downloaded(page,'#save-safety');privateFree(first);notes(first,f.current);assert.equal(first.kind,'WWHS-TEAM-SAFETY-BACKUP');
        assert.equal(await page.locator('#safety-receipt').isVisible(),true);assert.match(await page.locator('#save-receipt').innerText(),/download started/);assert.deepEqual(await values(page),before);
        assert.equal(await page.evaluate(()=>window.WWHS_TEAM_EXIT_GUARD.hasSafetyBackup()),false,'download request alone does not confirm a usable file');
        await press(page,'#confirm-safety');assert.equal(await page.locator('#safety-receipt').isVisible(),false);assert.deepEqual(await values(page),before);assert.equal(await page.evaluate(()=>window.WWHS_TEAM_EXIT_GUARD.hasSafetyBackup()),true);
        await page.locator('#backup-settings > summary').click();const count=await page.evaluate(()=>window.__save.calls.length);
        const explicit=await downloaded(page,'#download-current');privateFree(explicit);notes(explicit,f.current);assert.equal(await page.evaluate(()=>window.__save.calls.length),count);assert.deepEqual(await values(page),before);
      }finally{await context.close();}
    });
    await check('normal save rejects newer, different and non-team existing files before any write',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'active'),before=await values(page);
        for(const existing of [JSON.stringify(f.next),JSON.stringify({...f.first,workspaceId:'different-team'}),'{"other":"file"}']){
          await picker(page,'save',existing);await press(page,'#finish-session');assert.deepEqual(await values(page),before);assert.equal(await fileSaved(page),null);
          assert.equal(await page.evaluate(()=>window.__save.writers),0);assert.match(await page.locator('#handover-message').innerText(),/not been overwritten|not been changed/);
        }
        await picker(page,'save',JSON.stringify(f.first));await press(page,'#finish-session');const saved=await fileSaved(page);assert.equal(saved.parentExportId,f.first.exportId);notes(saved,f.current);
        await picker(page,'save',JSON.stringify(saved));await press(page,'#download-again');assert.deepEqual(await fileSaved(page),saved);
      }finally{await context.close();}
    });
    await check('safety save never replaces an existing file; failed normal write keeps retryable pending data',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'view'),before=await values(page);await picker(page,'save',JSON.stringify(f.first));await press(page,'#save-safety');
        assert.deepEqual(await values(page),before);assert.equal(await page.evaluate(()=>window.__save.writers),0);assert.match(await page.locator('#handover-message').innerText(),/new filename/);
        await seed(page,'active');await picker(page,'close-fail');await press(page,'#finish-session');assert.equal(await fileSaved(page),null);assert.equal(await page.locator('#pending-session').isVisible(),true);
        assert.equal(await page.locator('#confirm-finish').isDisabled(),true);assert.match(await page.locator('#handover-message').innerText(),/prepared backup are kept/);
        const pending=await values(page);await picker(page);await press(page,'#download-again');notes(await fileSaved(page),f.current);assert.deepEqual(await values(page),pending);
      }finally{await context.close();}
    });
    await check('aborted private payload preparation leaves every record intact and the visible safety fallback still saves',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'active'),before=await values(page);
        await page.evaluate(()=>{window.__payloadAborts=0;const add=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(...args){const request=add.apply(this,args);if(this.name==='payloads'){window.__payloadAborts++;this.transaction.abort();}return request;};});
        await picker(page);await press(page,'#finish-session');assert.equal(await fileSaved(page),null);assert.deepEqual(await values(page),before);
        assert.equal(await page.evaluate(()=>window.__payloadAborts),1);assert.equal(await page.locator('#save-fallback').isVisible(),true);assert.equal(await page.locator('#save-current-safety').isEnabled(),true);
        await picker(page);await press(page,'#save-current-safety');const file=await fileSaved(page);assert.equal(file.kind,'WWHS-TEAM-SAFETY-BACKUP');privateFree(file);notes(file,f.current);
        assert.deepEqual(await values(page),before);assert.equal(await page.evaluate(()=>window.__payloadAborts),1,'safety file needs no private payload writes');assert.equal(await page.evaluate(()=>window.WWHS_TEAM_EXIT_GUARD.hasSafetyBackup()),true);
      }finally{await context.close();}
    });
    for(const type of ['normal','safety','unverified'])await check(`${type} preview cancellation then explicit Open archives exact old records and restores selected notes`,async()=>{
      const {context,page}=await newPage();try{
        const mode=type==='unverified'?'corruptmeta':'missingbaseline',f=await seed(page,mode),file=type==='safety'?f.safety:f.next,before=await values(page);
        await choose(page,file);assert.equal(await page.locator('#file-preview').isVisible(),true);assert.deepEqual(await values(page),before);
        if(type==='safety')assert.match(await page.locator('#preview-warning').innerText(),/new shared starting point/);
        if(type==='unverified')assert.match(await page.locator('#preview-warning').innerText(),/cannot be checked.*trusted shared file/);
        await press(page,'#cancel-open');assert.equal(await page.locator('#save-panel').isVisible(),true);assert.deepEqual(await values(page),before);
        const editing=type!=='normal';await choose(page,file);await Promise.all([page.waitForURL(url=>url.pathname==='/'&&url.hash==='#vet-home'),page.locator(editing?'#start-session':'#view-file').click()]);
        const restored=await page.evaluate(async keys=>{
          const store=window.WWHS_STORAGE||localStorage,core=await import('/assets/js/team-handover-core.mjs'),payloads=await import('/assets/js/team-handover-payloads.mjs');
          const meta=JSON.parse(store.getItem(keys.meta));return {data:core.snapshot(store),meta,archive:await payloads.readTeamArchive(meta.archiveRef),inbox:JSON.parse(store.getItem(keys.inbox)),finance:localStorage.getItem('synthetic-finance')};
        },keys);
        notes({data:restored.data},file.data);assert.deepEqual(restored.data.tas,f.current.tas);assert.equal(restored.archive.metadataRaw,f.metadataRaw);assert.deepEqual(restored.archive.data,f.current);
        assert.equal(restored.inbox.items.find(item=>item.id==='private-card').noteText,'PRIVATE_NOTE');assert.equal(restored.finance,'PRIVATE_FINANCE');assert.equal(restored.meta.active?.phase||null,editing?'editing':null);
        if(type==='safety'){assert.equal(restored.meta.lineage.type,'safety-restored');assert.notEqual(restored.meta.lastFile.workspaceId,f.first.workspaceId);}
        else assert.equal(restored.meta.lastFile.exportId,f.next.exportId);
        await page.goto(base+'/team-handover/?wing=vet#save-backup');await ready(page);assert.equal(await page.locator(editing?'#active-session':'#snapshot-session').isVisible(),true);assert.equal(await page.locator('#history-warning').isVisible(),false);
      }finally{await context.close();}
    });
    await check('known older and conflicting normal files are blocked despite missing history',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'missingrecovery');await page.evaluate(({keys,next})=>{const store=window.WWHS_STORAGE,meta=JSON.parse(store.getItem(keys.meta));const {kind,schemaVersion,data,...info}=next;meta.lastFile=info;store.setItem(keys.meta,JSON.stringify(meta));},{keys,next:f.next});
        await page.reload();await ready(page);const before=await values(page);
        for(const file of [f.first,{...f.next,exportId:'conflicting-two'},{...f.next,workspaceId:'different-team'}]){
          await choose(page,file);assert.equal(await page.locator('#file-preview').isVisible(),false);assert.equal(await page.locator('#start-session').isDisabled(),true);assert.deepEqual(await values(page),before);
          assert.match(await page.locator('#handover-message').innerText(),/older|same revision|different team/);
        }
      }finally{await context.close();}
    });
    await check('same-tab races and another-tab edits invalidate saves or selected previews without replacing work',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'missingbaseline'),before=await values(page);await picker(page,'concurrent');await press(page,'#save-safety');
        assert.equal(await fileSaved(page),null);assert.equal(await page.evaluate(()=>window.__save.writers),0);assert.match(await page.locator('#handover-message').innerText(),/changed in another tab/);
        const afterRace=await values(page);for(const key of Object.keys(before).filter(key=>key!==keys.review))assert.equal(afterRace[key],before[key]);
        await choose(page,f.next);assert.equal(await page.locator('#file-preview').isVisible(),true);
        const other=await context.newPage();await other.goto(base+'/team-handover/');await ready(other);
        await other.evaluate(keys=>{const store=window.WWHS_STORAGE,vet=JSON.parse(store.getItem(keys.vet));vet.records['a-01-confirm-authority-set'].exceptionSummary='NEW_OTHER_TAB_NOTE';store.setItem(keys.vet,JSON.stringify(vet));},keys);
        await page.waitForFunction(()=>document.getElementById('file-preview').hidden&&document.getElementById('start-session').disabled);
        assert.equal(JSON.parse((await values(page))[keys.vet]).records['a-01-confirm-authority-set'].exceptionSummary,'NEW_OTHER_TAB_NOTE');assert.equal((await values(page))[keys.meta],before[keys.meta]);
      }finally{await context.close();}
    });
    for(const scope of ['vet','tas'])for(const legacy of [false,true])await check(`${scope} ${legacy?'legacy combined':'scoped'} Open preserves the other area and legacy history`,async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'individual');
        const setup=await page.evaluate(async({keys,f,scope,legacy,when})=>{
          const core=await import('/assets/js/team-handover-core.mjs'),store=window.WWHS_STORAGE;
          const first=core.createBackup({snapshot:f.current,editor:'Synthetic',workspaceId:'area-team',exportId:'area-one',savedAt:when});
          const {kind,schemaVersion,data,...header}=first;
          const oldMeta=JSON.stringify({version:1,lastFile:header,active:{id:'old-combined-session',phase:'editing',editor:'Synthetic',startedAt:when,baselineData:f.current},pendingExport:null});
          store.setItem('wwhs-team-handover:v1',oldMeta);store.removeItem('wwhs-team-handover:vet:v1');store.removeItem('wwhs-team-handover:tas:v1');
          const incoming=structuredClone(f.current),id=scope==='vet'?'a-01-confirm-authority-set':'class-readiness::2026';
          incoming[scope].records[id][scope==='vet'?'exceptionSummary':'exceptionReason']='IMPORTED_AREA_NOTE';
          const file=core.createBackup({snapshot:incoming,previous:first,scope:legacy?undefined:scope,editor:'Synthetic',exportId:'area-two',savedAt:when});
          return {file,oldMeta,otherRaw:store.getItem(keys[scope==='vet'?'tas':'vet'])};
        },{keys,f,scope,legacy,when});
        await page.goto(base+`/team-handover/?wing=${scope}#import-backup`);await ready(page);await choose(page,setup.file);
        assert.equal(await page.locator('#file-preview').isVisible(),true);
        await Promise.all([page.waitForURL(url=>url.pathname===(scope==='vet'?'/':'/head-teacher-tas/')),page.locator('#view-file').click()]);
        const result=await page.evaluate(({keys,scope})=>{const store=window.WWHS_STORAGE;return {legacy:store.getItem('wwhs-team-handover:v1'),own:JSON.parse(store.getItem(`wwhs-team-handover:${scope}:v1`)),other:store.getItem(`wwhs-team-handover:${scope==='vet'?'tas':'vet'}:v1`),otherRaw:store.getItem(keys[scope==='vet'?'tas':'vet']),native:JSON.parse(store.getItem(keys[scope]))};},{keys,scope});
        assert.equal(result.legacy,setup.oldMeta);assert.equal(result.other,null);assert.equal(result.otherRaw,setup.otherRaw);assert.equal(result.own.lastFile.scope,scope);
        const id=scope==='vet'?'a-01-confirm-authority-set':'class-readiness::2026';assert.equal(result.native.records[id][scope==='vet'?'exceptionSummary':'exceptionReason'],'IMPORTED_AREA_NOTE');
        await page.goto(base+`/team-handover/?wing=${scope}#import-backup`);await ready(page);
        const wrong={...setup.file,scope:scope==='vet'?'tas':'vet'};await choose(page,wrong);assert.equal(await page.locator('#file-preview').isVisible(),false);assert.equal(await page.locator('#start-session').isDisabled(),true);
      }finally{await context.close();}
    });
    await check('first scoped save keeps combined legacy metadata and excludes the other area',async()=>{
      const {context,page}=await newPage();try{
        const f=await seed(page,'individual');
        const legacy=await page.evaluate(async({keys,f,when})=>{
          const core=await import('/assets/js/team-handover-core.mjs'),store=window.WWHS_STORAGE;
          const first=core.createBackup({snapshot:f.current,editor:'Synthetic',workspaceId:'legacy-team',exportId:'legacy-one',savedAt:when});
          const {kind,schemaVersion,data,...header}=first;
          const raw=JSON.stringify({version:1,lastFile:header,active:{id:'legacy-active',editor:'Synthetic',phase:'editing',startedAt:when,baselineData:f.current},pendingExport:null});
          store.setItem('wwhs-team-handover:v1',raw);store.removeItem(keys.meta);return raw;
        },{keys,f,when});
        await page.reload();await ready(page);await picker(page);await press(page,'#finish-session');const saved=await fileSaved(page);notes(saved,f.current);assert.equal(saved.scope,'vet');assert.equal(saved.parentExportId,'legacy-one');
        assert.equal(await page.evaluate(()=>window.WWHS_STORAGE.getItem('wwhs-team-handover:v1')),legacy);
        assert.equal(await page.evaluate(()=>window.WWHS_STORAGE.getItem('wwhs-team-handover:tas:v1')),null);
      }finally{await context.close();}
    });
    await check('remembered shared folder writes real OPFS files directly, preserves safety copies and checks existing handover',async()=>{
      const {context,page}=await newPage();try{
        await context.addInitScript(()=>{window.showDirectoryPicker=async()=> (await navigator.storage.getDirectory()).getDirectoryHandle('Synthetic team backups',{create:true});});
        const f=await seed(page,'active');
        await page.evaluate(async file=>{const folder=await(await navigator.storage.getDirectory()).getDirectoryHandle('Synthetic team backups',{create:true});const handle=await folder.getFileHandle('WWHS-VET-backup.json',{create:true});const writer=await handle.createWritable();await writer.write(JSON.stringify(file));await writer.close();},f.first);
        const files=()=>page.evaluate(async()=>{const folder=await(await navigator.storage.getDirectory()).getDirectoryHandle('Synthetic team backups'),result={};for await(const [name,handle]of folder.entries())if(handle.kind==='file')result[name]=await(await handle.getFile()).text();return result;});
        await page.locator('#backup-settings > summary').click();await page.locator('[data-backup-scope="vet"] [data-folder-action="select"]').click();
        await page.waitForFunction(()=>document.querySelector('[data-backup-scope="vet"]').textContent.includes('Selected: Synthetic team backups'));
        await press(page,'#finish-session');const saved=await files(),shared=JSON.parse(saved['WWHS-VET-backup.json']);notes(shared,f.current);privateFree(shared);assert.equal(shared.parentExportId,f.first.exportId);
        assert.equal(await page.evaluate(()=>window.__save.calls.length),0,'remembered folder uses direct real file writes');
        await press(page,'#confirm-finish');await press(page,'#save-safety');const withSafety=await files();assert.equal(withSafety['WWHS-VET-backup.json'],saved['WWHS-VET-backup.json']);
        const names=Object.keys(withSafety).filter(name=>name.startsWith('WWHS-VET-safety-'));assert.equal(names.length,1);privateFree(JSON.parse(withSafety[names[0]]));
        await page.reload();await ready(page);await press(page,'#save-safety');const twice=await files();assert.equal(Object.keys(twice).filter(name=>name.startsWith('WWHS-VET-safety-')).length,2);for(const [name,text]of Object.entries(withSafety))assert.equal(twice[name],text);
        assert.equal(await page.evaluate(()=>window.__save.calls.length),0,'stored native directory handle survives reload');
        // Replace only the disposable OPFS file with a competing synthetic file.
        await seed(page,'active');await page.evaluate(async file=>{const folder=await(await navigator.storage.getDirectory()).getDirectoryHandle('Synthetic team backups'),handle=await folder.getFileHandle('WWHS-VET-backup.json'),writer=await handle.createWritable();await writer.write(JSON.stringify(file));await writer.close();},f.next);
        const before=await values(page),existing=await files();await press(page,'#finish-session');assert.deepEqual(await files(),existing);assert.deepEqual(await values(page),before);assert.match(await page.locator('#handover-message').innerText(),/not been overwritten/);
      }finally{await context.close();}
    });
  }finally{
    await browser.close();await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({base,results,errors},null,2));
  }
  assert.deepEqual(errors,[],'No page errors or missing preview resources');assert.equal(results.every(result=>result.passed),true,'Some browser scenarios failed; see report');
  console.log(`PASS ${results.length} shared backup flow scenarios. Report: ${output}`);
})().catch(error=>{console.error((error.stack||error.message).slice(0,3000));process.exitCode=1;});
