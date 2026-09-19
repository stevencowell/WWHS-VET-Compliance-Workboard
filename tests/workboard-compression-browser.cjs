// Real Chromium capacity, disposable contexts and synthetic records only.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Use a disposable local preview.');
const output=path.resolve(__dirname,'../../../outputs/workboard-compression-browser-report.json');
const keys={vet:'wwhs-vet-compliance-workboard:v3',tas:'wwhs-head-teacher-tas-workboard:v2',review:'wwhs-task-register-review:v1',inbox:'morning-launchpad-summary:v1',calendar:'morning-launchpad-calendar:v1',meta:'wwhs-team-handover:v1',journal:'wwhs-team-handover-journal:v1'};
const fillKey='synthetic-unrelated-capacity-fill',results=[],errors=[];
const repeated=(label,length)=>`${label} — café 🐟\n`.repeat(Math.ceil(length/(label.length+12))).slice(0,length).trim();
function entropyText(length){let seed=0x13579bdf;return Array.from({length},()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return String.fromCharCode(33+((seed>>>0)%90));}).join('');}
let browser;
async function contextPage(route='/team-handover/'){
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Australia/Sydney',acceptDownloads:true,serviceWorkers:'block'});
  await context.addInitScript(()=>{window.showSaveFilePicker=undefined;sessionStorage.setItem('wwhs-team-import-prompt-seen:v1','yes');});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base&&route.request().method()==='GET'?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
  page.on('response',response=>{if(new URL(response.url()).origin===base&&response.status()>=400)errors.push({url:response.url(),status:response.status()});});
  await page.clock.setFixedTime(new Date('2026-09-19T01:00:00Z'));await page.goto(base+route,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.WWHS_STORAGE);return {context,page};
}
async function go(page,route){await page.goto(base+route,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.WWHS_STORAGE);}
async function read(page,key){return page.evaluate(key=>window.WWHS_STORAGE.getItem(key),key);}
async function parsed(page,key){return JSON.parse(await read(page,key));}
async function raw(page,key){return page.evaluate(key=>localStorage.getItem(key),key);}
async function download(page,locator){const pending=page.waitForEvent('download');await locator.click();const item=await pending;const text=await fs.readFile(await item.path(),'utf8');assert.ok(!text.startsWith('WWHS-LZ'),'Portable backup stays plain JSON');return JSON.parse(text);}
async function fillOrigin(page,reserve=0){return page.evaluate(({fillKey,reserve})=>{let low=0,high=7*1024*1024;while(low+1<high){const mid=Math.floor((low+high)/2);try{localStorage.setItem(fillKey,'q'.repeat(mid));low=mid;}catch(error){if(error.name!=='QuotaExceededError')throw error;high=mid;}}localStorage.setItem(fillKey,'q'.repeat(Math.max(0,low-reserve)));return {fillerCharacters:Math.max(0,low-reserve),reserve};},{fillKey,reserve});}
async function digest(page,logical=false){return page.evaluate(async logical=>Object.fromEntries(await Promise.all(Object.keys(localStorage).sort().map(async key=>{const text=(logical?window.WWHS_STORAGE:localStorage).getItem(key);const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [key,{length:text.length,hash:[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}];}))),logical);}
async function privateDigest(page){return page.evaluate(async keys=>{
  const store=window.WWHS_STORAGE,box=JSON.parse(store.getItem(keys.inbox)),vet=JSON.parse(store.getItem(keys.vet)),tas=JSON.parse(store.getItem(keys.tas));
  const text=JSON.stringify({private:box.items.filter(item=>item.personal),vetLinks:vet.links,tasLinks:tas.links,unrelated:localStorage.getItem('synthetic-finance-private')});
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return {length:text.length,hash:[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')};
},keys);}
async function seed(page){return page.evaluate(async keys=>{
  const {enrich,validateInbox}=await import('/morning-launchpad/assets/summary-core.mjs');
  const {normalEvent}=await import('/morning-launchpad/assets/calendar-core.mjs');
  const long=(label,count)=>(label+' café 🐟\n').repeat(count);
  const personal=enrich({id:'synthetic-private',taskKey:'personal:synthetic-private',title:'Synthetic private note',action:'',personal:true,status:'note',source:long('PRIVATE_SOURCE',6000),noteText:long('PRIVATE_NOTE',6000),noteHtml:'<p>'+long('PRIVATE_HTML',35000)+'</p>'});
  const shared=enrich({id:'synthetic-shared',taskKey:'workboard:vet:a-01-confirm-authority-set',title:'Confirm controlling sources',action:'Review controlling sources',workstream:'vet',origin:{wing:'vet',taskId:'a-01-confirm-authority-set',recordKey:'a-01-confirm-authority-set',route:'#task/a-01-confirm-authority-set',cycle:'2026'},noteText:long('Exact shared working note',4000),createdOn:'2026-09-19'});
  const inbox=JSON.stringify({version:2,items:[personal,shared],briefing:'Private briefing',pinWorkflowVersion:1,workboardImports:['vet:a-01-confirm-authority-set']});validateInbox(inbox);
  localStorage.setItem(keys.inbox,inbox);
  localStorage.setItem(keys.vet,JSON.stringify({schemaVersion:3,role:'htvet',linkDefaultsVersion:2,links:{'evidence-central':'https://private.example/vet'},records:{'a-01-confirm-authority-set':{status:'in-progress',exceptionSummary:long('Original VET note',6000),stepChecks:{0:true},sourceChecked:false}},assignments:{},gaps:{},eventOccurrences:[]}));
  localStorage.setItem(keys.tas,JSON.stringify({schemaVersion:2,mode:'guided',linkDefaultsVersion:2,links:{'tas-drive':'https://private.example/tas'},records:{'class-readiness::2026':{status:'in-progress',exceptionReason:long('Original TAS note',6000),steps:{0:true}}},weekly:{},eventOccurrences:{},scheduleOverrides:{}}));
  localStorage.setItem(keys.review,JSON.stringify({version:1,records:Object.fromEntries(Array.from({length:650},(_,i)=>['vet:2026:synthetic-review-'+i,{completed:false,reviewedOn:'2026-09-18'}]))}));
  const events=Array.from({length:20},(_,i)=>normalEvent({id:'synthetic-event-'+i,uid:'synthetic-uid-'+i,title:'Synthetic calendar '+i,startDate:'2026-09-19',endDate:'2026-09-19',description:long('Calendar preserved note '+i,550),origin:'manual'}));
  localStorage.setItem(keys.calendar,JSON.stringify({version:1,events}));localStorage.setItem('synthetic-finance-private','PRIVATE_FINANCE_UNCHANGED');
  return {calendarCount:events.length,sharedNote:shared.noteText};
},keys);}
async function compactKnown(page){await page.evaluate(keys=>{for(const key of [keys.inbox,keys.calendar,keys.vet,keys.tas,keys.review]){const text=window.WWHS_STORAGE.getItem(key);if(text!==null)window.WWHS_STORAGE.setItem(key,text);}},keys);}
async function check(name,body){if(process.env.WORKBOARD_COMPRESSION_MATCH&&!name.includes(process.env.WORKBOARD_COMPRESSION_MATCH))return;try{const details=await body();results.push({name,passed:true,details});console.log('PASS '+name);}catch(error){const message=(error.stack||error.message).slice(0,1000)+'\n'+(error.stack||error.message).slice(-1500);results.push({name,passed:false,error:message});console.error(message);}}

(async()=>{
  browser=await chromium.launch({headless:true});
  await check('VET and TAS native save, reload, export and restore at real browser capacity; shared handover keeps exact notes and privacy',async()=>{
    const {context,page}=await contextPage();
    try{
      const seeded=await seed(page),privateBefore=await privateDigest(page);const capacity=await fillOrigin(page);const unrelated=await raw(page,fillKey);
      const vetNote=repeated('Changed VET record',170000),tasNote=repeated('Changed TAS record',175000);
      for(const [wing,route,key,field,record,note] of [
        ['vet','/#task/a-01-confirm-authority-set',keys.vet,'exceptionSummary','a-01-confirm-authority-set',vetNote],
        ['tas','/head-teacher-tas/#task/class-readiness',keys.tas,'exceptionReason','class-readiness::2026',tasNote]
      ]){
        await go(page,route);await page.locator('#task-dialog[open]').waitFor();
        const noteField=page.locator(`#task-dialog textarea[name="${field}"]`);assert.equal(await noteField.isVisible(),true);assert.equal(await noteField.isEditable(),true);
        // Fixture setup avoids simulating a 170k-character paste; exercise the real Save control below.
        await noteField.evaluate((node,text)=>{node.value=text;node.dispatchEvent(new Event('input',{bubbles:true}));},note);
        await page.locator('#task-dialog').getByRole('button',{name:'Save progress',exact:true}).click();
        await page.waitForFunction(({key,record,field,note})=>JSON.parse(window.WWHS_STORAGE.getItem(key)).records[record]?.[field]===note,{key,record,field,note});
        assert.match(await raw(page,key),/^WWHS-LZ1:/,wing+' uses smaller physical storage');
        await page.reload({waitUntil:'networkidle'});await go(page,route);await page.locator('#task-dialog[open]').waitFor();assert.equal(await page.locator(`#task-dialog textarea[name="${field}"]`).inputValue(),note);
        await go(page,wing==='vet'?'/#issues':'/head-teacher-tas/#reference');
        const file=await download(page,page.locator('[data-action="export-workspace"]'));assert.equal(file.state.records[record][field],note);assert.doesNotMatch(JSON.stringify(file),/PRIVATE_|private\.example/);
        file.state.records[record][field]=note+'\nRestored through the file control.';
        await page.locator(wing==='vet'?'#workspace-import':'#backup-file').setInputFiles({name:wing+'-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
        await page.waitForFunction(({key,record,field,note})=>JSON.parse(window.WWHS_STORAGE.getItem(key)).records[record]?.[field]===note,{key,record,field,note:file.state.records[record][field]});
        assert.equal(await raw(page,fillKey),unrelated,'No other site records were discarded');
      }
      assert.deepEqual(await privateDigest(page),privateBefore);
      await go(page,'/#my-work');await page.locator('.workspace-register > summary').click();await page.locator('.register-backup > summary').click();
      const review=(await parsed(page,keys.review));review.records['vet:2026:synthetic-added-review']={completed:true,reviewedOn:'2026-09-19'};
      await page.getByLabel('Restore review ticks',{exact:true}).setInputFiles({name:'vet-tas-task-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(review))});
      await page.waitForFunction(key=>JSON.parse(window.WWHS_STORAGE.getItem(key)).records['vet:2026:synthetic-added-review']?.completed,keys.review);
      assert.match(await raw(page,keys.review),/^WWHS-LZ1:/);
      const reviewFile=await download(page,page.getByRole('button',{name:'Back up review ticks',exact:true}));assert.equal(reviewFile.records['vet:2026:synthetic-added-review'].completed,true);
      await go(page,'/team-handover/');await page.locator('#setup-section summary').click();await page.locator('#setup-editor').fill('Synthetic storage tester');
      const team=await download(page,page.locator('#create-team'));
      assert.equal(team.data.vet.records['a-01-confirm-authority-set'].exceptionSummary,vetNote+'\nRestored through the file control.');
      assert.equal(team.data.tas.records['class-readiness::2026'].exceptionReason,tasNote+'\nRestored through the file control.');
      assert.equal(team.data.inbox.items.find(item=>item.taskKey==='workboard:vet:a-01-confirm-authority-set').noteText,seeded.sharedNote);
      assert.doesNotMatch(JSON.stringify(team),/PRIVATE_|private\.example/);assert.deepEqual(await privateDigest(page),privateBefore);assert.equal(await raw(page,fillKey),unrelated);
      return {...capacity,nativeSaveAndRestore:true,reviewTicks:true,teamExactNotes:true,privateDataUnchanged:true};
    }finally{await context.close();}
  });

  await check('Calendar import, reload and portable restore preserve large notes; genuine quota and oversized input leave previous events intact',async()=>{
    const {context,page}=await contextPage();let restoreContext;
    try{
      const seeded=await seed(page),privateBefore=await privateDigest(page);await fillOrigin(page);
      await go(page,'/morning-launchpad/#calendar');const calendar=page.locator('launchpad-calendar');await calendar.waitFor({state:'visible'});
      const incoming={version:1,events:[{id:'synthetic-added-event',uid:'synthetic-added-event',title:'Calendar import at capacity',startDate:'2026-09-21',endDate:'2026-09-21',description:repeated('Long imported calendar note',19000),origin:'import'}]};
      await calendar.getByLabel('Calendar file',{exact:true}).setInputFiles({name:'launchpad-calendar-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
      await page.waitForFunction(({key,count})=>JSON.parse(window.WWHS_STORAGE.getItem(key)).events.length===count,{key:keys.calendar,count:seeded.calendarCount+1});
      assert.match(await raw(page,keys.calendar),/^WWHS-LZ1:/);await page.reload({waitUntil:'networkidle'});
      const exported=await download(page,page.locator('launchpad-calendar').getByRole('button',{name:'Export calendar backup',exact:true}));
      assert.equal(exported.events.find(event=>event.id==='synthetic-added-event').description,incoming.events[0].description);assert.deepEqual(await privateDigest(page),privateBefore);
      const restored=await contextPage('/morning-launchpad/#calendar');restoreContext=restored.context;const other=restored.page;await fillOrigin(other,16384);const filler=await raw(other,fillKey);
      await other.locator('launchpad-calendar').getByLabel('Calendar file',{exact:true}).setInputFiles({name:'launchpad-calendar-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
      await other.waitForFunction(({key,count})=>JSON.parse(window.WWHS_STORAGE.getItem(key)||'{"events":[]}').events.length===count,{key:keys.calendar,count:exported.events.length});
      assert.deepEqual(await parsed(other,keys.calendar),exported);assert.equal(await raw(other,fillKey),filler);
      await other.reload({waitUntil:'networkidle'});assert.equal(await other.locator('launchpad-calendar').evaluate(node=>node.data.events.length),exported.events.length);
      await compactKnown(other);await fillOrigin(other,2048);const before=await digest(other);
      const bad={version:1,events:[{...incoming.events[0],id:'too-long',uid:'too-long',description:'x'.repeat(20001)}]};
      await other.locator('launchpad-calendar').getByLabel('Calendar file',{exact:true}).setInputFiles({name:'oversized-event.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
      await other.locator('.cal-message').filter({hasText:'Could not import'}).waitFor();assert.deepEqual(await digest(other),before);
      const random=entropyText(19000),tooLarge={version:1,events:Array.from({length:8},(_,i)=>({...incoming.events[0],id:'random-event-'+i,uid:'random-event-'+i,title:'Genuine capacity '+i,description:random.slice(i)+random.slice(0,i)}))};
      await other.locator('launchpad-calendar').getByLabel('Calendar file',{exact:true}).setInputFiles({name:'real-capacity.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(tooLarge))});
      await other.locator('.cal-message').filter({hasText:'run out of storage'}).waitFor();assert.deepEqual(await digest(other),before,'Rejected import preserves exact physical records');
      return {events:exported.events.length,portableRestore:true,oversizedEventProtected:true,actualQuotaFailureProtected:true};
    }finally{await context.close();if(restoreContext)await restoreContext.close();}
  });

  await check('Compressed transaction orders physical shrink first; later actual quota failure rolls back without losing records',async()=>{
    const {context,page}=await contextPage();
    try{
      const random=entropyText(60000),repeat=repeated('Highly compressible record',180000);
      const before={[keys.vet]:JSON.stringify({schemaVersion:3,records:{synthetic:{exceptionSummary:repeat}}}),[keys.tas]:JSON.stringify({schemaVersion:2,records:{synthetic:{exceptionReason:random}}}),[keys.review]:null};
      const after={[keys.vet]:JSON.stringify({schemaVersion:3,records:{synthetic:{exceptionSummary:random}}}),[keys.tas]:JSON.stringify({schemaVersion:2,records:{synthetic:{exceptionReason:repeat}}}),[keys.review]:null};
      await page.evaluate(before=>{for(const [key,value]of Object.entries(before))if(value!==null)window.WWHS_STORAGE.setItem(key,value);},before);await fillOrigin(page,1024);
      const result=await page.evaluate(async({before,after,keys})=>{
        const {applyTeamTransaction}=await import('/assets/js/team-handover-transaction.mjs?v=compression-storage-1');const store=window.WWHS_STORAGE,writes=[];
        const watched={...store,setItem(key,value){if(key!==keys.journal)writes.push(key);store.setItem(key,value);}};
        await applyTeamTransaction(watched,before,after);return {writes,raw:Object.fromEntries(Object.keys(after).map(key=>[key,store.getItem(key)]))};
      },{before,after,keys});assert.deepEqual(result.writes,[keys.tas,keys.vet]);assert.deepEqual(result.raw,after);
      // Reverse the initial values, then force a third, physically growing write.
      await page.evaluate(before=>{for(const [key,value]of Object.entries(before))if(value!==null)window.WWHS_STORAGE.setItem(key,value);},before);await fillOrigin(page,1024);const original=await digest(page);
      const failure=await page.evaluate(async({before,after,keys,random})=>{
        const {applyTeamTransaction}=await import('/assets/js/team-handover-transaction.mjs?v=compression-storage-1');const store=window.WWHS_STORAGE,writes=[];
        const watched={...store,setItem(key,value){if(key!==keys.journal)writes.push(key);store.setItem(key,value);}};
        try{await applyTeamTransaction(watched,before,{...after,[keys.review]:JSON.stringify({version:1,random:random.repeat(3)})});throw Error('Unexpected successful oversized transaction');}
        catch(error){return {message:error.message,writes,raw:Object.fromEntries(Object.keys(before).map(key=>[key,store.getItem(key)])),marker:localStorage.getItem(keys.journal)};}
      },{before,after,keys,random});
      assert.match(failure.message,/previous progress has been restored/);assert.deepEqual(failure.raw,before);assert.equal(failure.marker,null);
      assert.deepEqual(failure.writes.slice(0,2),[keys.tas,keys.vet]);assert.deepEqual(failure.writes.slice(-2),[keys.vet,keys.tas]);assert.deepEqual(await digest(page),original);
      return {writeOrder:result.writes,rollbackOrder:failure.writes.slice(-2),realQuota:true,exactPhysicalRestore:true};
    }finally{await context.close();}
  });
})().catch(error=>{results.push({name:'Browser setup',passed:false,error:error.stack||error.message});console.error(error);}).finally(async()=>{
  if(browser)await browser.close();const report={base,disposableContexts:true,syntheticDataOnly:true,realChromiumQuota:true,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,errors};
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.failed||errors.length)process.exitCode=1;
});
