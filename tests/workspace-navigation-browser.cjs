// Isolated browser storage and synthetic notes; no personal browser profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+decodeURIComponent(name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const {enrich}=await import('../morning-launchpad/assets/summary-core.mjs');
 const {KEYS,snapshot}=await import('../assets/js/team-handover-core.mjs');
 const metadata=JSON.stringify({version:1,lastFile:{kind:'WWHS-TEAM-HANDOVER',schemaVersion:1,workspaceId:'navigation-test',revision:1,parentRevision:null,parentExportId:null,exportId:'navigation-file',savedAt:'2026-09-20T00:00:00.000Z',savedBy:'Test user',note:'',changes:[]},active:{id:'navigation-session',editor:'Test user',startedAt:'2026-09-20T00:00:00.000Z',phase:'editing',baselineData:snapshot({getItem:()=>null})}});
 const note=enrich({id:'navigation-note',title:'Keep this saved note',action:'Synthetic follow-up',personal:true,taskKey:'personal:navigation',noteText:'Saved work stays here.'});
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),dialogs=[],errors=[];
   page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',async dialog=>{dialogs.push(dialog.type());await dialog.dismiss();});
   await context.addInitScript(({raw,metadata,keys})=>{if(!sessionStorage.getItem('navigation-seeded')){
    sessionStorage.setItem('navigation-seeded','1');localStorage.setItem('morning-launchpad-summary:v1',raw);
    localStorage.setItem(keys.vetMetadata,metadata);localStorage.setItem(keys.tasMetadata,metadata);
    localStorage.setItem(keys.review,JSON.stringify({version:1,records:Object.fromEntries(['vet','tas'].map(wing=>[`${wing}:2026:navigation-test`,{completed:true,reviewedOn:'2026-09-20'}]))}));
   }}, {raw:JSON.stringify({version:2,items:[note],briefing:''}),metadata,keys:KEYS});
   await page.goto(base+'/morning-launchpad/');
   await page.waitForFunction(()=>window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
   assert.equal(await page.evaluate(()=>window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup),true);
   const receipt=await page.evaluate(()=>localStorage.getItem('morning-launchpad-backup-reminder:v1'));
   for(const [name,destination] of [['VET','/#vet-home'],['TAS','/head-teacher-tas/#home'],['Team handover','/team-handover/?wing=tas'],['Launchpad','/morning-launchpad/'],['Finance','/finance/']]){
    await page.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name,exact:true}).click();
    assert.deepEqual(dialogs,[],`${width}: switching to ${name} must not invoke a close warning`);
    await page.waitForURL(base+destination);
    if(['VET','TAS'].includes(name)){
     const wing=name.toLowerCase();
     await page.waitForFunction(wing=>window.WWHS_TEAM_EXIT_GUARD?.status(wing)==='changed',wing);
     await page.getByRole('link',{name:'Task sources & 2027 checks →',exact:true}).click();
     assert.deepEqual(dialogs,[],`${width}: ${name} source link must open with pending shared changes`);
     await page.waitForURL(base+`/task-sources/?wing=${wing}`);
     await page.getByRole('heading',{name:'Where the tasks come from',exact:true}).waitFor();
     await page.waitForFunction(wing=>document.querySelector('#wing').value===wing.toUpperCase()&&document.querySelector('#task-list').children.length>0&&window.WWHS_TEAM_EXIT_GUARD?.status(wing)==='changed',wing);
     assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}),true,'Closing the sources page must still warn about pending shared backups');
     assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEYS[`${wing}Metadata`]),metadata,'Opening Sources must preserve the session and backup state');
     await page.getByRole('navigation',{name:'Workboard sections',exact:true}).getByRole('link',{name,exact:true}).click();
     await page.waitForURL(base+destination);assert.deepEqual(dialogs,[],'Returning from Sources must not trigger an exit warning');
    }
   }
   await page.goto(base+'/morning-launchpad/');
   await page.waitForFunction(()=>window.WWHS_PRIVATE_NOTES_BACKUP&&!window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
   assert.equal(await page.evaluate(()=>localStorage.getItem('morning-launchpad-backup-reminder:v1')),receipt,'Navigation must not acknowledge a backup');
   assert.equal(await page.evaluate(()=>JSON.parse((window.WWHS_STORAGE||localStorage).getItem('morning-launchpad-summary:v1')).items.find(item=>item.id==='navigation-note').noteText),note.noteText);
   assert.equal(await page.evaluate(()=>window.WWHS_PRIVATE_NOTES_BACKUP.state().needsBackup),true);
   const unloadWarns=()=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});Object.defineProperty(event,'returnValue',{value:undefined,writable:true});window.dispatchEvent(event);return event.defaultPrevented;});
   assert.equal(await unloadWarns(),true,'Actual exit still warns about an outstanding backup');
   // A genuine draft must keep its protection even during an internal click.
   await page.evaluate(()=>{const board=document.querySelector('summary-import');board.noteEditor.open=true;board.noteInputs.title.value='Unsaved draft';board.noteInputs.title.dispatchEvent(new Event('input',{bubbles:true}));});
   const before=page.url();await page.getByRole('navigation',{name:'Workspace areas',exact:true}).getByRole('link',{name:'VET',exact:true}).click();
   assert.deepEqual(dialogs,['beforeunload'],'Unsaved note must still warn on area change');assert.equal(page.url(),before);
   assert.equal(await page.evaluate(()=>document.querySelector('summary-import').noteInputs.title.value),'Unsaved draft');
   assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}: saved navigation, VET/TAS source links and return paths, draft protection, close warning and data preservation`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
