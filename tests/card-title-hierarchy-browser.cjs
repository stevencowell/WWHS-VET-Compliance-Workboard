// Disposable synthetic browser storage only; never opens a saved user profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:43175',outputs=path.resolve(__dirname,'../../../outputs');
const key='morning-launchpad-summary:v1',errors=[];
const longAction='Before practical work, check the room, equipment condition, guards, controls, footwear and known hazards. Confirm teacher authorisation before use. Stop, isolate and report any fault or unsafe condition through the current school maintenance and WHS process. Keep students away from the affected equipment. Use the approved alternate learning arrangement until the equipment has been checked. Track the fault to verified repair or authorised disposal. Do not restart the activity just because an earlier checklist was ticked. The final safety instruction must remain fully visible.';
const card=(page,id)=>page.locator(`.import-card[data-task-key="${id}"]`);
const saved=(page,id)=>page.evaluate(({key,id})=>JSON.parse((window.WWHS_STORAGE||localStorage).getItem(key)).items.find(x=>x.taskKey===id),{key,id});
async function ready(page){await page.waitForFunction(()=>document.querySelector('summary-import')?.started);}
async function selectFixtures(page,all=false){
  if(all)await page.locator('summary-import').getByRole('button',{name:/^All work \(/}).click();
  await page.locator('summary-import').getByRole('searchbox',{name:'Search notes',exact:true}).fill('Hierarchycheck');
}
async function titleFirst(page,id,title,action,label='Next step:'){
  const row=card(page,id);await row.waitFor({state:'visible'});
  assert.equal(await row.locator('summary .import-card-title').innerText(),title);
  assert.equal(await row.locator('.import-card-next-label').innerText(),label);
  assert.equal(await row.locator('.import-card-summary-text').inputValue(),action);
  assert.equal(await row.locator('.import-card-disclosure').getAttribute('open'),null);
}
(async()=>{
  fs.mkdirSync(outputs,{recursive:true});const browser=await chromium.launch({headless:true});
  try{for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Australia/Sydney',serviceWorkers:'block'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push({url:page.url(),error:e.stack}));page.on('dialog',d=>d.accept());
    await page.clock.setFixedTime(new Date('2026-09-21T00:00:00Z'));
    await page.goto(base+'/morning-launchpad/');await ready(page);
    const records=await page.evaluate(async({longAction,theme})=>{
      const {enrich,createTrackedWork,todaySydney}=await import('./assets/summary-core.mjs?v=plain-language-1');
      const make=async(wing,id,title,action,status='review')=>{
        const context={version:1,wing,taskId:id,canonicalTaskId:id,title,recordKey:id,cycle:'2026',asOf:todaySydney(),sourceAsAt:'Synthetic acceptance fixture',sourceStatus:status,objective:'Synthetic task identity acceptance',nextStep:action,steps:[action],roles:['Teacher'],sources:['Synthetic source'],links:[]};
        const item=await createTrackedWork({wing,taskId:id,recordKey:id,route:'#task/'+id,cycle:'2026',title,action,status,taskHelp:context});
        item.dirty=['action'];return item;
      };
      const items=[await make('vet','hierarchy-vet','Hierarchycheck VET weekly updates','Open the original authenticated communication.'),await make('tas','hierarchy-tas','Hierarchycheck TAS practical-area safety',longAction),await make('vet','hierarchy-done','Hierarchycheck completed VET task','The source checklist has been completed.','done'),enrich({id:'hierarchy-note',taskKey:'personal:hierarchy-note',title:'Hierarchycheck own note',personal:true,status:'note',action:'',source:'Keep this original note unchanged.'}),enrich({id:'hierarchy-email',taskKey:'email:hierarchy-email',title:'Hierarchycheck FW: Update',action:'Meet Chris to discuss the signage plan.',workstream:'vet',source:'Original synthetic email text',status:'review'})];
      const moved=await make('vet','hierarchy-moved','Hierarchycheck VET task in Head Teacher','Keep the task identity after changing work area.');moved.workstream='personal';items.push(moved);
      const b=document.querySelector('summary-import');if(!b.persist({...b.inbox,items,workboardImports:[],forecastContexts:{}}))throw Error('Fixture could not save');b.renderItems();
      (window.WWHS_STORAGE||localStorage).setItem('morning-launchpad-theme',theme);document.documentElement.dataset.theme=theme;
      return Object.fromEntries(items.map(item=>[item.taskKey,{title:item.title,action:item.action}]));
    },{longAction,theme});
    await selectFixtures(page,true);
    for(const id of ['workboard:vet:hierarchy-vet','workboard:tas:hierarchy-tas','workboard:vet:hierarchy-moved'])await titleFirst(page,id,records[id].title,records[id].action);
    await titleFirst(page,'workboard:vet:hierarchy-done',records['workboard:vet:hierarchy-done'].title,records['workboard:vet:hierarchy-done'].action,'Recorded action:');
    const note=card(page,'personal:hierarchy-note');assert.equal(await note.locator('summary .import-card-title').innerText(),records['personal:hierarchy-note'].title);assert.equal(await note.locator('summary .import-card-next').count(),0);assert.equal(await note.locator('summary textarea').count(),0);
    const email=card(page,'email:hierarchy-email');assert.equal(await email.locator('summary .import-card-title').count(),0);assert.equal(await email.locator('summary textarea').inputValue(),records['email:hierarchy-email'].action);
    await email.locator('.import-card-chevron').click();await email.getByText('Source and links',{exact:true}).click();assert.equal(await email.locator('.import-source-title').innerText(),records['email:hierarchy-email'].title);
    await email.locator('.import-card-chevron').click();
    const safety=card(page,'workboard:tas:hierarchy-tas');await safety.scrollIntoViewIfNeeded();
    const dimensions=await safety.locator('summary textarea').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight,rect:el.getBoundingClientRect().toJSON(),font:getComputedStyle(el).fontSize}));
    assert.ok(dimensions.client>=dimensions.scroll-2,JSON.stringify(dimensions));assert.ok(dimensions.rect.right<=390);assert.equal(dimensions.font,'15px');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await safety.screenshot({path:path.join(outputs,`card-title-safety-${theme}-390.png`)});
    for(const [wing,id]of [['vet','workboard:vet:hierarchy-vet'],['tas','workboard:tas:hierarchy-tas']]){
      const edited=`Hierarchycheck edited ${wing.toUpperCase()} next action; preserve the original task title.`;
      await card(page,id).locator('summary textarea').fill(edited);await card(page,id).locator('summary textarea').blur();
      await page.waitForFunction(({key,id,edited})=>JSON.parse((window.WWHS_STORAGE||localStorage).getItem(key)).items.find(x=>x.taskKey===id)?.action===edited,{key,id,edited});
      assert.equal((await saved(page,id)).title,records[id].title);
      await card(page,id).getByRole('button',{name:`Prepare with AI: ${records[id].title}`,exact:true}).click();
      const prompt=await page.getByRole('textbox',{name:'AI help request',exact:true}).inputValue();assert.ok(prompt.includes(`Personal card action: ${edited}`));assert.ok(prompt.includes(`Title: ${records[id].title}`));
      await page.getByRole('button',{name:'Close AI help',exact:true}).click();records[id].action=edited;
    }
    await page.reload();await ready(page);await selectFixtures(page,true);
    for(const id of ['workboard:vet:hierarchy-vet','workboard:tas:hierarchy-tas'])await titleFirst(page,id,records[id].title,records[id].action);
    for(const [wing,route,id]of [['vet','/#vet-home','workboard:vet:hierarchy-vet'],['tas','/head-teacher-tas/#home','workboard:tas:hierarchy-tas']]){
      await page.goto(base+route);await ready(page);await selectFixtures(page);
      await titleFirst(page,id,records[id].title,records[id].action);
      if(wing==='vet'){const row=card(page,'email:hierarchy-email');assert.equal(await row.locator('summary .import-card-title').count(),0);assert.equal(await row.locator('summary textarea').inputValue(),records['email:hierarchy-email'].action);}
      await card(page,id).locator('.import-card-chevron').click();assert.equal(await card(page,id).locator('.import-card-top strong').innerText(),records[id].title);await card(page,id).locator('.import-card-chevron').click();
      assert.equal((await saved(page,id)).title,records[id].title);assert.equal((await saved(page,id)).action,records[id].action);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await card(page,id).screenshot({path:path.join(outputs,`card-title-${wing}-${theme}-390.png`)});
    }
    console.log(`PASS ${theme} 390px: Launchpad/VET/TAS identity, editable actions, AI context, reload, notes, email source, completed label and full safety text`);
    await context.close();
  }assert.deepEqual(errors,[]);}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
