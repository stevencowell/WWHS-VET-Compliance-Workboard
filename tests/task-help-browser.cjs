// Isolated local acceptance. No user profile or external requests.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:4173',key='morning-launchpad-summary:v1',outputs=path.resolve(__dirname,'../../../outputs');
const results=[],errors=[];let browser;
async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.stack});console.log('FAIL '+name+'\n'+e.stack);}}
async function setup(date='2026-09-17T00:00:00Z'){
  const c=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Australia/Sydney'});
  await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const p=await c.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date(date));
  await p.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedHelp=text;}}}));return {c,p};
}
async function go(p,route){if(p.url()===base+route)await p.reload();else await p.goto(base+route);await p.waitForFunction(()=>document.querySelector('summary-import')?.started);if(!route.startsWith('/morning-launchpad/'))await p.waitForFunction(()=>document.querySelector('.workspace-forecast')?.dataset.ready==='true'||['unavailable','reference-only','paused'].includes(document.querySelector('.workspace-forecast')?.dataset.state));}
async function saved(p){return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
async function open(p,id){await p.evaluate(id=>document.querySelector('summary-import').taskHelpDialog.open(id),id);assert.ok(await p.getByRole('dialog',{name:'Prepare with AI',exact:true}).isVisible());}
async function prompt(p){return p.getByRole('textbox',{name:'AI help request',exact:true}).inputValue();}
async function close(p){await p.getByRole('button',{name:'Close AI help',exact:true}).click();}
async function source(p){return p.evaluate(()=>localStorage.getItem((window.VET_WORKBOARD||window.HT_TAS_WORKBOARD).config.storageKey));}
(async()=>{
  browser=await chromium.launch({headless:true});fs.mkdirSync(outputs,{recursive:true});
  await check('all native VET and TAS task contexts validate and offer specific preparation',async()=>{
    const {c,p}=await setup();try{for(const route of ['/#my-work','/head-teacher-tas/#my-work']){
      await go(p,route);const result=await p.evaluate(async()=>{
        const {normaliseTaskHelpContext,getTaskHelpProfile}=await import('/assets/js/task-help.mjs?v=task-help-1');
        const data=window.VET_WORKBOARD||window.HT_TAS_WORKBOARD;
        const tasks=window.VET_WORKBOARD?[...data.taskRegister.tasks,...data.operatingCycle2027.tasks]:data.tasks.filter(t=>!t.historyOnly&&!t.procedureOnly);
        return tasks.map(t=>{const descriptor=window.WWHS_WORKBOARD_ADAPTER.describeTask(t.id),context=normaliseTaskHelpContext(descriptor.taskHelp);return {id:t.id,profile:getTaskHelpProfile({taskHelp:context}).profileId};});
      });assert.ok(result.length>=41);assert.ok(result.every(r=>r.profile!=='source-task-preparation'));
      const items=(await saved(p)).items.filter(i=>i.origin?.wing===(route.startsWith('/head')?'tas':'vet'));assert.ok(items.length);assert.ok(items.every(i=>i.taskHelp));
    }}finally{await c.close();}
  });
  await check('scheduled VET card opens useful source-specific help; copying changes no records',async()=>{
    const {c,p}=await setup();try{await go(p,'/#my-work');const item=(await saved(p)).items.find(i=>i.origin.taskId==='a-01-confirm-authority-set');
      const before=await source(p),sharedBefore=await saved(p);
      await p.getByRole('button',{name:`Prepare with AI: ${item.title}`,exact:true}).click();
      const text=await prompt(p);assert.match(text,/source.*register|currency/i);assert.ok(text.includes(item.taskHelp.nextStep));assert.ok(text.includes(item.origin.recordKey));assert.match(text,/current sources you can actually inspect/i);
      await p.getByRole('button',{name:'Copy help request',exact:true}).click();assert.equal(await p.evaluate(()=>window.copiedHelp),text);
      assert.equal(await source(p),before);assert.deepEqual(await saved(p),sharedBefore);
      await p.screenshot({path:path.join(outputs,'task-ai-help-vet-desktop.png'),fullPage:true});
      await p.getByRole('button',{name:'Open ChatGPT',exact:true}).click();assert.ok(await p.getByRole('dialog',{name:'Open ChatGPT',exact:true}).isVisible());
      assert.equal(await p.getByRole('link',{name:'Web app',exact:true}).getAttribute('href'),'https://chatgpt.com/');await p.getByRole('button',{name:'Cancel',exact:true}).click();await close(p);
    }finally{await c.close();}
  });
  await check('visible edits and subsequent saved changes produce fresh requests; notes require opt-in',async()=>{
    const {c,p}=await setup();try{await go(p,'/head-teacher-tas/#my-work');const item=(await saved(p)).items.find(i=>i.forecast?.section==='ready');
      await p.evaluate(id=>{const b=document.querySelector('summary-import');b.openCalendarTask(id);b.updateItem(id,{noteText:'PRIVATE_WORKING_NOTE_739'},true);},item.id);
      const card=p.locator('.import-card').filter({has:p.getByRole('button',{name:`Prepare with AI: ${item.title}`,exact:true})});
      await card.locator('.import-card-summary-text').fill('UNSAVED_LATEST_ACTION_842');await open(p,item.id);assert.ok((await prompt(p)).includes('UNSAVED_LATEST_ACTION_842'));assert.ok(!(await prompt(p)).includes('PRIVATE_WORKING_NOTE_739'));
      await p.getByRole('checkbox',{name:'Include my working note',exact:true}).check();assert.ok((await prompt(p)).includes('PRIVATE_WORKING_NOTE_739'));
      await p.evaluate(id=>document.querySelector('summary-import').updateItem(id,{action:'SAVED_LATEST_ACTION_843'},false),item.id);
      // Disconnected/draft text remains visible: update both mirrored inputs as the normal card save does.
      await p.evaluate(()=>document.querySelectorAll('[data-help-field="action"]').forEach(el=>{el.value='SAVED_LATEST_ACTION_843';}));
      await p.getByRole('button',{name:'Copy help request',exact:true}).click();assert.ok((await p.evaluate(()=>window.copiedHelp)).includes('SAVED_LATEST_ACTION_843'));
      await close(p);await open(p,item.id);assert.equal(await p.getByRole('checkbox',{name:'Include my working note',exact:true}).isChecked(),false);
    }finally{await c.close();}
  });
  await check('native private exception notes and overridden links are excluded from requests',async()=>{
    const {c,p}=await setup();try{await go(p,'/head-teacher-tas/#my-work');const task=(await saved(p)).items.find(i=>i.origin.recordKey.includes('2026-09-14'));
      await p.evaluate(({recordKey})=>{const k=window.HT_TAS_WORKBOARD.config.storageKey;const s=JSON.parse(localStorage.getItem(k)||'{}');s.schemaVersion=2;s.linkDefaultsVersion=2;s.records={...(s.records||{}),[recordKey]:{status:'waiting',steps:{},milestones:{},exceptionReason:'PRIVATE_NATIVE_EXCEPTION_520'}};s.links={sentral:'https://example.org/PRIVATE_OVERRIDE_900'};localStorage.setItem(k,JSON.stringify(s));},task.origin);
      await go(p,'/head-teacher-tas/#my-work');const item=(await saved(p)).items.find(i=>i.id===task.id);await open(p,item.id);const text=await prompt(p);
      assert.ok(!text.includes('PRIVATE_NATIVE_EXCEPTION_520'));assert.ok(!text.includes('PRIVATE_OVERRIDE_900'));assert.match(text,/blocked \/ waiting state: Yes/);
    }finally{await c.close();}
  });
  await check('source step refresh is independent of personally edited next action',async()=>{
    const {c,p}=await setup();try{await go(p,'/#my-work');const item=(await saved(p)).items.find(i=>i.origin.taskId==='a-01-confirm-authority-set');
      await p.evaluate(id=>document.querySelector('summary-import').updateItem(id,{action:'PERSONAL_NEXT_STEP_550'},false),item.id);
      await p.evaluate(id=>{const k=window.VET_WORKBOARD.config.storageKey;const s=JSON.parse(localStorage.getItem(k)||'{}');s.schemaVersion=3;s.records={...(s.records||{}),[id]:{status:'in-progress',stepChecks:{0:true},history:[]}};localStorage.setItem(k,JSON.stringify(s));},item.origin.taskId);
      await go(p,'/#my-work');await open(p,item.id);const text=await prompt(p);assert.ok(text.includes('PERSONAL_NEXT_STEP_550'));assert.ok(text.includes('Recorded source next step: '+item.taskHelp.steps[1]));
    }finally{await c.close();}
  });
  await check('saved native help remains available in Launchpad and another work area',async()=>{
    const {c,p}=await setup();try{await go(p,'/#my-work');const item=(await saved(p)).items[0];
      for(const route of ['/morning-launchpad/','/head-teacher-tas/#my-work']){await go(p,route);await open(p,item.id);const text=await prompt(p);assert.ok(text.includes(item.origin.recordKey));assert.match(text,/saved VET task snapshot/);await close(p);}
    }finally{await c.close();}
  });
  await check('weekly occurrences stay separate and old source progress is not assumed current',async()=>{
    const {c,p}=await setup();try{await go(p,'/head-teacher-tas/#my-work');const first=(await saved(p)).items.find(i=>i.origin.recordKey.includes('2026-09-14'));
      await p.clock.setFixedTime(new Date('2026-09-21T00:00:00Z'));await p.getByRole('button',{name:'Refresh schedule',exact:true}).click();await p.waitForTimeout(120);
      const next=(await saved(p)).items.find(i=>i.origin.taskId===first.origin.taskId&&i.origin.recordKey.includes('2026-09-21'));assert.ok(next);
      await open(p,first.id);const oldText=await prompt(p);assert.ok(oldText.includes(first.origin.recordKey));assert.ok(!oldText.includes(next.origin.recordKey));assert.match(oldText,/saved task snapshot/);await close(p);
      await open(p,next.id);assert.ok((await prompt(p)).includes(next.origin.recordKey));
    }finally{await c.close();}
  });
  await check('existing imported help is retained, copy uses current data, and manual copy fallback works',async()=>{
    const {c,p}=await setup();try{await go(p,'/morning-launchpad/');await p.evaluate(()=>{const b=document.querySelector('summary-import');b.importText(JSON.stringify({version:2,items:[{id:'custom-help',title:'Imported email work',action:'Prepare draft A',source:'Source text',help:'CUSTOM_GUIDANCE_812: write a concise reply.',links:['https://example.org/source']}]}));});
      const customId=(await saved(p)).items.find(i=>i.title==='Imported email work').id;await open(p,customId);assert.match(await prompt(p),/CUSTOM_GUIDANCE_812/);await p.evaluate(id=>document.querySelector('summary-import').updateItem(id,{action:'Prepare draft B'},false),customId);
      await p.getByRole('button',{name:'Copy help request',exact:true}).click();assert.match(await p.evaluate(()=>window.copiedHelp),/Prepare draft B/);
      await p.evaluate(()=>navigator.clipboard.writeText=async()=>{throw new Error('blocked');});await p.getByRole('button',{name:'✓ Copied',exact:true}).click();
      assert.match(await p.locator('.task-help-state').innerText(),/press Ctrl \+ C/);assert.ok(await p.getByRole('textbox',{name:'AI help request',exact:true}).evaluate(el=>el.selectionEnd===el.value.length&&el.selectionStart===0));
    }finally{await c.close();}
  });
  await check('unavailable native source warns honestly and conflicting shared work blocks copying',async()=>{
    const {c,p}=await setup();try{await go(p,'/#my-work');const item=(await saved(p)).items[0];await p.evaluate(()=>localStorage.setItem(window.VET_WORKBOARD.config.storageKey,'{broken'));await open(p,item.id);
      assert.match(await prompt(p),/CURRENT SOURCE CHECK UNAVAILABLE/);assert.match(await p.locator('.task-help-state').innerText(),/saved task snapshot/);await close(p);
      await p.evaluate(k=>localStorage.setItem(k,localStorage.getItem(k)+' '),key);await open(p,item.id);assert.equal(await prompt(p),'');assert.ok(await p.getByRole('button',{name:'Copy help request',exact:true}).isDisabled());
    }finally{await c.close();}
  });
  await check('mobile dark help stays readable and keyboard close returns to the task',async()=>{
    const {c,p}=await setup();try{await p.setViewportSize({width:390,height:844});await go(p,'/head-teacher-tas/#my-work');await p.getByRole('button',{name:'Dark appearance',exact:true}).click();
      const control=p.getByRole('button',{name:/^Prepare with AI:/}).first();await control.click();const dialog=p.getByRole('dialog',{name:'Prepare with AI',exact:true});
      const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await p.screenshot({path:path.join(outputs,'task-ai-help-tas-mobile-dark.png'),fullPage:true});await p.keyboard.press('Escape');assert.ok(!(await dialog.isVisible()));assert.ok(await control.evaluate(el=>el===document.activeElement));
    }finally{await c.close();}
  });
  await check('AI button opens on the first click after editing a detail field',async()=>{
    const {c,p}=await setup();try{await go(p,'/head-teacher-tas/#my-work');const item=(await saved(p)).items.find(i=>i.forecast?.section==='ready');
      await p.evaluate(id=>document.querySelector('summary-import').openCalendarTask(id),item.id);
      const card=p.locator('.import-card').filter({has:p.getByRole('button',{name:`Prepare with AI: ${item.title}`,exact:true})});
      await card.getByText('Edit priority, dates and tasks',{exact:true}).click();await card.getByRole('textbox',{name:`Responsible person for ${item.title}`,exact:true}).fill('Synthetic reviewer');
      await card.getByRole('button',{name:`Prepare with AI: ${item.title}`,exact:true}).click();assert.ok(await p.getByRole('dialog',{name:'Prepare with AI',exact:true}).isVisible());assert.ok((await prompt(p)).length>100);
    }finally{await c.close();}
  });
  await check('delayed clipboard feedback never marks a different reopened task as copied',async()=>{
    const {c,p}=await setup();try{await go(p,'/head-teacher-tas/#my-work');const items=(await saved(p)).items;
      await p.evaluate(()=>navigator.clipboard.writeText=text=>new Promise(resolve=>{window.finishCopy=()=>{window.copiedHelp=text;resolve();};}));
      await open(p,items[0].id);await p.getByRole('button',{name:'Copy help request',exact:true}).click();await close(p);await open(p,items[1].id);
      await p.evaluate(()=>window.finishCopy());assert.ok(await p.getByRole('button',{name:'Copy help request',exact:true}).isVisible());assert.ok(!(await p.locator('.task-help-state').innerText()).startsWith('Copied.'));
    }finally{await c.close();}
  });
  if(errors.length){results.push({name:'No browser runtime errors',passed:false,errors});console.log(errors);}
  fs.writeFileSync(path.join(outputs,'task-ai-help-browser-results.json'),JSON.stringify({results,errors},null,2));await browser.close();if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
