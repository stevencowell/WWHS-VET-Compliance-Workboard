// Disposable browser data only; never uses the user's saved browser profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.WORKSPACE_BASE_URL||'http://127.0.0.1:4173';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  try{
    const launchpad=await context.newPage();await launchpad.goto(base+'/morning-launchpad/');
    await launchpad.waitForFunction(()=>document.querySelector('summary-import')?.started);
    const original=await launchpad.evaluate(async()=>{
      const {enrich}=await import('./assets/summary-core.mjs?v=task-help-1');
      const board=document.querySelector('summary-import');
      const items=['personal','vet','tas'].flatMap(wing=>['ready','upcoming','waiting','notes','done'].map(section=>enrich({id:`qa-${wing}-${section}`,taskKey:`qa-${wing}-${section}`,workstream:wing,title:`Tasklistcheck ${wing} ${section}`,action:section==='notes'?'':'Review sample',status:section==='done'?'done':section==='notes'?'note':'review',sectionOverride:section==='done'?'':section,personal:true,source:`Sample ${wing} note`})));
      board.persist({...board.inbox,items,briefing:'PRIVATE PERSONAL BRIEFING'});board.renderItems();
      return JSON.stringify(board.inbox.items.filter(x=>x.workstream==='personal'));
    });
    for(const wing of ['vet','tas']){
      const page=await context.newPage();await page.goto(base+(wing==='vet'?'/#vet-home':'/head-teacher-tas/#home'));
      await page.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true');
      const board=page.locator('summary-import');assert.equal(await board.isVisible(),true);
      assert.equal(await board.getByRole('heading',{name:wing.toUpperCase()+' task list',exact:true}).count(),1);
      assert.equal(await board.locator('.import-workstreams').isVisible(),false);
      assert.equal(await board.getByRole('button',{name:'Clear all notes',exact:true}).isVisible(),false);
      assert.equal(await board.locator('.import-briefing').textContent(),'');
      assert.equal(await page.locator('#dashboard-access').isVisible(),true);
      assert.equal(await page.locator('#route-content h1').isVisible(),true);
      const expected=await page.evaluate(async()=>{
        const b=document.querySelector('summary-import');const {taskSection}=await import(new URL('morning-launchpad/assets/summary-core.mjs?v=task-help-1',document.querySelector('.workspace-brand').href));
        return b.inbox.items.filter(x=>x.workstream===b.scope&&taskSection(x)!=='done').length;
      });
      assert.equal(await page.locator('.workspace-task-link').innerText(),`${wing.toUpperCase()} tasks (${expected})`);
      const search=board.getByRole('searchbox',{name:'Search notes',exact:true});await search.fill('Tasklistcheck '+wing);
      assert.equal(await board.locator('.import-card').count(),5,JSON.stringify(await board.locator('.import-card-top strong').allTextContents()));
      assert.ok((await board.locator('.import-card-top strong').allTextContents()).every(t=>t.startsWith('Tasklistcheck '+wing+' ')));
      const card=board.locator('.import-card').filter({has:page.locator('.import-card-top strong',{hasText:`Tasklistcheck ${wing} ready`})});
      await card.locator('.import-card-chevron').click();await card.getByRole('button',{name:'Mark done',exact:true}).click();
      assert.equal(await page.locator('.workspace-task-link').innerText(),`${wing.toUpperCase()} tasks (${expected-1})`);
      await board.getByRole('button',{name:/^Done \(/}).click();assert.ok((await board.locator('.import-card-top strong').allTextContents()).includes(`Tasklistcheck ${wing} ready`));
      await board.getByRole('button',{name:'Add a note',exact:true}).click();
      await board.getByRole('textbox',{name:'Note title',exact:true}).fill(`New ${wing} note`);
      await board.getByRole('textbox',{name:'My note',exact:true}).fill('Saved from the wing');
      await board.getByRole('button',{name:'Save note',exact:true}).click();
      assert.equal(await board.getByRole('button',{name:/^My Notes \(/}).getAttribute('aria-pressed'),'true');
      assert.ok(await page.evaluate(wing=>document.querySelector('summary-import').inbox.items.some(x=>x.title===`New ${wing} note`&&x.workstream===wing),wing));
      assert.equal(await page.evaluate(()=>JSON.stringify(document.querySelector('summary-import').inbox.items.filter(x=>x.workstream==='personal'))),original);
      await page.reload();await page.waitForFunction(()=>document.querySelector('summary-import')?.started);
      await board.getByRole('button',{name:/^My Notes \(/}).click();assert.ok((await board.locator('.import-card-top strong').allTextContents()).includes(`New ${wing} note`));
      await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:`../../outputs/${wing}-task-list-mobile.png`,fullPage:true});
      await page.locator('.workspace-my-work').click();await board.locator('.import-workstreams').waitFor({state:'visible'});
      await board.getByRole('button',{name:/^Personal \(/}).click();await search.fill('Tasklistcheck personal');assert.equal(await board.locator('.import-card').count(),5,JSON.stringify(await board.locator('.import-card-top strong').allTextContents()));
      await page.locator('.workspace-task-link').click();await board.locator('.import-workstreams').waitFor({state:'hidden'});await search.fill('Tasklistcheck personal');assert.equal(await board.locator('.import-card').count(),0);
      await page.evaluate(()=>location.hash='#today');await page.locator('.workspace-home').waitFor({state:'hidden'});
      await page.close();console.log(`PASS ${wing}: scoped tabs, counts, completion, notes, persistence, personal records preserved, mobile, route switching`);
    }
    await launchpad.reload();await launchpad.waitForFunction(()=>document.querySelector('summary-import')?.started);
    assert.equal(await launchpad.evaluate(()=>JSON.stringify(document.querySelector('summary-import').inbox.items.filter(x=>x.workstream==='personal'))),original);
    assert.deepEqual(errors,[]);console.log('PASS shared Launchpad data and no runtime errors');
  }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



