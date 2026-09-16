// Isolated local browser acceptance for scheduled VET/TAS work. No live profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const base='http://127.0.0.1:4173',key='morning-launchpad-summary:v1';
const outputs=path.resolve(__dirname,'../../../outputs'),errors=[],results=[];
let browser;
async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(error){results.push({name,passed:false,error:error.stack});console.log('FAIL '+name+'\n'+error.stack);}}
async function setup(date='2026-09-17T00:00:00Z'){
  const c=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Australia/Sydney'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const p=await c.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));
  await p.clock.setFixedTime(new Date(date));return {c,p};
}
async function go(p,route){if(p.url()===base+route)await p.reload();else await p.goto(base+route);await p.waitForFunction(()=>document.querySelector('summary-import')?.started);if(!route.startsWith('/morning-launchpad/'))await p.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true'||['unavailable','reference-only','paused'].includes(document.querySelector('.workspace-forecast')?.dataset.state));}
async function state(p){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{"items":[]}'),key);}
async function snapshot(p){return p.evaluate(()=>window.WWHS_WORKBOARD_ADAPTER.getForecast());}
async function refresh(p){await p.getByRole('button',{name:'Refresh schedule',exact:true}).click();await p.waitForTimeout(150);}

(async()=>{
  browser=await chromium.launch({headless:true});fs.mkdirSync(outputs,{recursive:true});
  await check('blank VET opens with assigned schedule cards; future cycle browsing cannot make 2027 current',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/#my-work');const s=await snapshot(p),saved=await state(p);
      assert.equal(s.context.date,'2026-09-17');assert.equal(s.context.mode,'current');assert.ok(s.entries.length>0);
      for(const entry of s.entries){const card=saved.items.find(i=>i.origin?.recordKey===entry.recordKey);assert.ok(card,entry.title);assert.ok(card.forecast);assert.equal(card.forecast.section,entry.forecast.section);}
      assert.ok(!saved.items.some(i=>i.origin?.cycle==='2027'));assert.ok(await p.locator('.workspace-forecast').isVisible());
      await go(p,'/#term1-2027');assert.ok(!(await snapshot(p)).entries.some(e=>e.cycle==='2027'));
      await go(p,'/#my-work');await p.screenshot({path:path.join(outputs,'forecast-vet-desktop.png'),fullPage:true});
    }finally{await c.close();}
  });
  await check('VET role change recalculates the schedule without creating duplicate task identities',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/#my-work');const before=await snapshot(p);await p.locator('#role-filter').selectOption('htvet');
      await p.waitForFunction(()=>document.querySelector('.workspace-forecast-count').textContent.includes('Head Teacher VET'));
      const after=await snapshot(p);assert.equal(after.context.role,'htvet');assert.ok(after.entries.length<=before.entries.length);
      const items=(await state(p)).items;assert.equal(new Set(items.map(i=>i.taskKey)).size,items.length);await refresh(p);assert.equal((await state(p)).items.length,items.length);
    }finally{await c.close();}
  });
  await check('TAS automatically includes recurring duties and honest date uncertainty; notes survive weekly rollover',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/head-teacher-tas/#my-work');const s=await snapshot(p);assert.ok(s.entries.length>0);
      const weekly=s.entries.find(e=>e.recordKey.includes('2026-09-14'));assert.ok(weekly,'current weekly duty present');
      assert.equal(s.context.schoolWeek,null);assert.ok(s.entries.some(e=>!e.dueDate),'undated recurring duties are not given fabricated deadlines');
      const item=(await state(p)).items.find(i=>i.origin?.recordKey===weekly.recordKey);
      await p.evaluate(({id})=>document.querySelector('summary-import').updateItem(id,{noteText:'Synthetic weekly note retained'},true),{id:item.id});
      const sourceBefore=await p.evaluate(()=>localStorage.getItem(window.HT_TAS_WORKBOARD.config.storageKey));
      await p.clock.setFixedTime(new Date('2026-09-21T00:00:00Z'));await refresh(p);
      const next=await state(p);assert.equal(next.items.find(i=>i.id===item.id).noteText,'Synthetic weekly note retained');
      assert.ok(next.items.some(i=>i.origin?.taskId===weekly.taskId&&i.origin.recordKey.includes('2026-09-21')),'new week has a separate occurrence');
      assert.equal(await p.evaluate(()=>localStorage.getItem(window.HT_TAS_WORKBOARD.config.storageKey)),sourceBefore);
      await p.screenshot({path:path.join(outputs,'forecast-tas-desktop.png'),fullPage:true});
    }finally{await c.close();}
  });
  await check('saved work assigned to another VET role cannot bypass automatic role filtering',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/#my-work');await p.evaluate(()=>{
        localStorage.removeItem('morning-launchpad-summary:v1');
        localStorage.setItem(window.VET_WORKBOARD.config.storageKey,JSON.stringify({schemaVersion:3,role:'htvet',assignments:{'a-01-confirm-authority-set':'Trainer/assessor'},records:{'a-01-confirm-authority-set':{status:'in-progress',stepChecks:{0:true}}}}));
      });await go(p,'/#my-work');assert.equal((await snapshot(p)).context.role,'htvet');assert.ok(!(await state(p)).items.some(i=>i.origin?.recordKey==='a-01-confirm-authority-set'));
    }finally{await c.close();}
  });
  await check('unavailable source labels existing cards as saved snapshots without modifying their stored work',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/#my-work');const before=await state(p);assert.ok(before.items.length);
      await p.evaluate(()=>localStorage.setItem(window.VET_WORKBOARD.config.storageKey,'{broken synthetic source'));await refresh(p);
      assert.equal((await snapshot(p)).context.mode,'unavailable');assert.deepEqual(await state(p),before);
      assert.match(await p.locator('.import-forecast').first().innerText(),/refresh unavailable|saved forecast/i);
    }finally{await c.close();}
  });
  await check('automatic task removal stays removed and native completion updates the linked card without verifying anything',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/head-teacher-tas/#my-work');const s=await snapshot(p),target=s.entries.find(e=>e.recordKey.includes('2026-09-14'));assert.ok(target);
      const item=(await state(p)).items.find(i=>i.origin?.recordKey===target.recordKey);
      await p.evaluate(({id,key})=>{const b=document.querySelector('summary-import');b.persist({...b.inbox,items:b.inbox.items.filter(i=>i.id!==id)});},{id:item.id,key});
      await refresh(p);assert.ok(!(await state(p)).items.some(i=>i.id===item.id));await go(p,'/head-teacher-tas/#my-work');assert.ok(!(await state(p)).items.some(i=>i.origin?.recordKey===target.recordKey));
      const second=(await snapshot(p)).entries.find(e=>e.recordKey!==target.recordKey);assert.ok(second);
      await p.evaluate(({taskId,recordKey})=>{const d=window.HT_TAS_WORKBOARD,t=d.tasks.find(t=>t.id===taskId),k=d.config.storageKey,state=JSON.parse(localStorage.getItem(k)||'{"schemaVersion":2,"records":{}}');state.records[recordKey]={status:'completed',steps:Object.fromEntries(t.steps.map((_,i)=>[i,true])),milestones:Object.fromEntries((t.milestones||[]).map((_,i)=>[i,true])),sourceChecked:true,doneConfirmed:true};localStorage.setItem(k,JSON.stringify(state));},second);
      await go(p,'/head-teacher-tas/#my-work');const completed=(await state(p)).items.find(i=>i.origin?.recordKey===second.recordKey);assert.equal(completed.forecast.sourceStatus,'completed');
      const section=await p.evaluate(async id=>{const {taskSection}=await import('/morning-launchpad/assets/summary-core.mjs?v=alignment-1');return taskSection(document.querySelector('summary-import').inbox.items.find(i=>i.id===id));},completed.id);assert.equal(section,'done');
    }finally{await c.close();}
  });
  await check('personal Launchpad defaults to Personal while All work keeps scheduled cards available',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/head-teacher-tas/#my-work');const count=(await state(p)).items.length;assert.ok(count>0);
      await go(p,'/morning-launchpad/');assert.equal(await p.evaluate(()=>document.querySelector('summary-import').workstream),'personal');assert.equal((await state(p)).items.length,count);
      await p.getByRole('navigation',{name:'Work area',exact:true}).getByRole('button',{name:/^All work \(/}).click();assert.equal(await p.evaluate(()=>document.querySelector('summary-import').workstream),'all');assert.ok(await p.locator('article.import-card').count());
    }finally{await c.close();}
  });
  await check('a forecast refresh does not replace a focused draft; damaged source data creates no automatic work',async()=>{
    const {c,p}=await setup();try{
      await go(p,'/head-teacher-tas/#my-work');const draft=p.locator('textarea.import-card-summary-text').first();
      await draft.waitFor();await draft.fill('Synthetic focused draft');await p.evaluate(()=>window.dispatchEvent(new CustomEvent('wwhs:forecast-updated')));await p.waitForTimeout(100);assert.equal(await draft.inputValue(),'Synthetic focused draft');
      await p.clock.setFixedTime(new Date('2026-09-18T00:00:00Z'));await p.evaluate(()=>window.dispatchEvent(new CustomEvent('wwhs:forecast-updated')));assert.equal(await draft.inputValue(),'Synthetic focused draft');
      await p.evaluate(()=>{localStorage.removeItem('morning-launchpad-summary:v1');localStorage.setItem(window.HT_TAS_WORKBOARD.config.storageKey,'{broken synthetic source');});
      await go(p,'/head-teacher-tas/#my-work');assert.equal((await snapshot(p)).context.mode,'unavailable');assert.equal((await state(p)).items.length,0);assert.match(await p.locator('.workspace-forecast').innerText(),/kept|reload|unavailable|read/i);
    }finally{await c.close();}
  });
  await check('scheduled cards fit a phone viewport in dark appearance',async()=>{
    const {c,p}=await setup();try{
      await p.setViewportSize({width:390,height:844});await go(p,'/head-teacher-tas/#my-work');await p.getByRole('button',{name:'Dark appearance',exact:true}).click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(outputs,'forecast-tas-mobile-dark.png'),fullPage:true});
    }finally{await c.close();}
  });
  await browser.close();console.log(JSON.stringify({results,errors},null,2));if(errors.length||results.some(r=>!r.passed))process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
