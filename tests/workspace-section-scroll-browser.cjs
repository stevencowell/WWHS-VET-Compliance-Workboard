// Disposable Chrome contexts and synthetic test state only; never a saved profile.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:43175').replace(/\/$/,'');
const outputs=path.resolve(__dirname,'../../../outputs');
const results=[];

async function atSection(page,selector,label){
 await page.waitForFunction(selector=>{
  const target=document.querySelector(selector);if(!target||!target.getClientRects().length)return false;
  const rect=target.getBoundingClientRect(),margin=parseFloat(getComputedStyle(target).scrollMarginTop)||0;
  const bottom=Math.abs(window.scrollY-(document.documentElement.scrollHeight-innerHeight))<3;
  return rect.top>=-3&&rect.top<innerHeight/2&&(Math.abs(rect.top-margin)<5||bottom);
 },selector);
 const status=await page.evaluate(selector=>{
  const target=document.querySelector(selector),heading=target.querySelector('h1,h2');
  return {focused:!heading||document.activeElement===heading,overflow:document.documentElement.scrollWidth>innerWidth+1};
 },selector);
 assert.equal(status.focused,true,label+': destination heading receives focus');
 assert.equal(status.overflow,false,label+': no horizontal overflow');
}

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1360,390])for(const wing of ['vet','tas']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:width===390?'reduce':'no-preference'});
   const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{
    window.sectionScrollCalls=[];
    const original=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(options){window.sectionScrollCalls.push({id:this.id,className:this.className,behaviour:options?.behavior});return original.call(this,options);};
   });
   const prefix=wing==='vet'?'/':'/head-teacher-tas/',home=wing==='vet'?'#vet-home':'#home';
   await page.goto(base+prefix+home);
   await page.locator('.workspace-task-link').waitFor();
   await page.waitForFunction(()=>document.querySelector('summary-import')?.started&&window.WWHS_WORKBOARD_ADAPTER);
   const hashes=wing==='vet'?['#year','#workflows','#systems','#issues','#today','#cycle-2027']:['#teaching','#faculty','#people','#reference','#today'];
   for(const hash of hashes){
    await page.locator(`.route-nav a[href="${hash}"]`).click();
    await page.waitForURL(base+prefix+hash);
    await atSection(page,'#route-content',`${wing} ${width} ${hash}`);
    if(hash==='#workflows'){
     assert.equal(await page.locator('.urgent-strip strong').innerText(),'Urgent help');
     await page.getByRole('button',{name:'Open urgent response',exact:true}).click();
     await page.locator('#task-dialog[open]').waitFor();
     await page.keyboard.press('Escape');
     await page.locator('#task-dialog[open]').waitFor({state:'hidden'});
    }
   }
   // Selecting the current route again should work even without a hashchange.
   const selected=hashes.at(-1);
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.locator(`.route-nav a[href="${selected}"]`).click();
   await atSection(page,'#route-content',`${wing} repeated route`);
   await page.locator('.workspace-my-work').click();
   await atSection(page,'.workspace-home',`${wing} personal work`);
   await page.locator('.workspace-task-link').click();
   await atSection(page,'#shared-work',`${wing} saved tasks`);
   await page.locator(`.route-nav a[href="${home}"]:not(.workspace-task-link)`).click();
   await atSection(page,'#dashboard-access',`${wing} wing home`);
   await page.locator('.workspace-register-link').click();
   await page.waitForFunction(()=>document.querySelector('.workspace-register').open);
   await page.waitForFunction(()=>{const r=document.querySelector('.workspace-register').getBoundingClientRect();return r.top>=0&&r.top<100;});
   await page.locator('.workspace-register .task-clarity-disclosure > summary').first().click();
   const task=page.locator('.workspace-register a[href^="#task/"]').first();
   await task.scrollIntoViewIfNeeded();
   const before=await page.evaluate(()=>({hash:location.hash,y:scrollY}));
   await task.click();await page.locator('#task-dialog[open]').waitFor();
   assert.equal(await page.evaluate(()=>location.hash),before.hash,'Task opens without routing away');
   await page.getByRole('button',{name:'Close task',exact:true}).click();
   assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before.y)<3,'Closing task preserves the underlying position');
   const calls=await page.evaluate(()=>sectionScrollCalls.filter(call=>call.id==='route-content'));
   assert.ok(calls.length>=hashes.length+1,'Each section and repeated section scrolled');
   assert.ok(calls.every(call=>call.behaviour===(width===390?'instant':'smooth')),'Respects reduced motion');

   // A later cancellation must win, including an already-selected menu item.
   await page.evaluate(selected=>{history.replaceState(null,'',selected);window.dispatchEvent(new HashChangeEvent('hashchange'));},selected);
   await page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});window.sectionScrollCalls=[];});
   await page.evaluate(selected=>{
    const link=document.querySelector(`.route-nav a[href="${selected}"]`);
    const cancel=event=>{if(event.target===link)event.preventDefault();};
    window.addEventListener('click',cancel,{once:true});link.click();
   },selected);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.evaluate(()=>sectionScrollCalls.length),0,'Cancelled click never scrolls');
   for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey']){
    await page.evaluate(({selected,modifier})=>{
     const link=document.querySelector(`.route-nav a[href="${selected}"]`);
     window.addEventListener('click',event=>event.preventDefault(),{once:true});
     link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,[modifier]:true}));
    },{selected,modifier});
   }
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.evaluate(()=>sectionScrollCalls.length),0,'Modified clicks never scroll current page');
   assert.deepEqual(errors,[],`${wing}: no runtime errors`);
   await page.locator(`.route-nav a[href="${selected}"]`).click();
   await atSection(page,'#route-content',`${wing} final section`);
   fs.mkdirSync(outputs,{recursive:true});
   await page.screenshot({path:path.join(outputs,`section-scroll-${wing}-${width}.png`)});
   const result={wing,width,sectionLinks:hashes.length,repeatedRoute:true,taskPositionPreserved:true,reducedMotion:width===390,cancelledClickPreserved:true,errors};
   results.push(result);console.log('PASS '+JSON.stringify(result));await context.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(outputs,'workspace-section-scroll-results.json'),JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
