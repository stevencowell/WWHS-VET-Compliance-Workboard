import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normaliseTaskHelpContext} from '../assets/js/task-help.mjs';
import '../assets/js/task-review.js';

const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('assets/js/app-v2.js', root), 'utf8');
const key = 'wwhs-vet-compliance-workboard:v3';
const reviewKey = 'wwhs-task-register-review:v1';
const fixtureContext=vm.createContext({window:{}});
for(const file of ['config.js','tasks.js','term1-2027.js'])vm.runInContext(fs.readFileSync(new URL('assets/js/data/'+file,root),'utf8'),fixtureContext);
const fixtureData=fixtureContext.window.VET_WORKBOARD;
const fixtureRequirements=new Map([...fixtureData.taskRegister.tasks,...fixtureData.operatingCycle2027.tasks,...fixtureData.operatingCycle2027.eventTemplates].map(task=>[task.id,globalThis.WWHS_TASK_REVIEW.requirements(task)]));
const reviewStore = (id, completed = true, reviewedOn = '2026-09-18', year = 2026) => JSON.stringify({version:1,records:{[`vet:${year}:${encodeURIComponent(id)}`]:{completed,reviewedOn,...(fixtureRequirements.has(id)?{requirementsKey:globalThis.WWHS_TASK_REVIEW.requirementsKey(fixtureRequirements.get(id))}:{})}}});
const earlyReviewStore = (id, completed = true, reviewedOn = '2026-09-18', year = 2026) => {
  const value=JSON.parse(reviewStore(id,completed,reviewedOn,year));value.records[`vet:${year}:${encodeURIComponent(id)}`].completedEarly=true;return JSON.stringify(value);
};
const state = (records = {}, extra = {}) => ({schemaVersion:3, linkDefaultsVersion:2, records, ...extra});

function harness(saved = null, options = {}) {
  const storage = new Map(saved === null ? [] : [[key, typeof saved === 'string' ? saved : JSON.stringify(saved)]]);
  // Ordinary regression fixtures describe today's instructions. Dedicated legacy
  // tests below opt out so migration is exercised against genuine old snapshots.
  if(!options.legacyNative&&storage.has(key))try{
    const value=JSON.parse(storage.get(key));
    for(const [id,record] of Object.entries(value.records||{}))if(record&&typeof record==='object'&&!record.requirements&&fixtureRequirements.has(id))record.requirements=fixtureRequirements.get(id);
    storage.set(key,JSON.stringify(value));
  }catch(_){}
  if(options.reviewRaw !== undefined) storage.set(reviewKey, options.reviewRaw);
  const events = [], notices = [], listeners = new Map(), windowListeners = new Map(), elements = new Map();
  let writes = 0;
  const TestDate = options.now ? class extends Date {
    constructor(...args){super(...(args.length?args:[options.now]));}
    static now(){return new Date(options.now).getTime();}
  } : Date;
  const element = () => {
    const handlers = new Map();
    return {
    innerHTML:'', textContent:'', open:false, hidden:false, dataset:{},
    classList:{toggle(){}, remove(){}, contains(){return false;}},
    setAttribute(){}, removeAttribute(){}, focus(){}, remove(){},
    querySelector(){return null;}, querySelectorAll(){return [];},
    addEventListener(name, listener){handlers.set(name, listener);}, appendChild(child){notices.push(child.textContent);},
    showModal(){this.open=true;}, close(){this.open=false;handlers.get('close')?.();}
    };
  };
  const get = id => { if(!elements.has(id)) elements.set(id,element()); return elements.get(id); };
  const guidance = element(); guidance.querySelector = () => element();
  const document = {
    body:element(), hidden:false,
    getElementById:get,
    querySelector(selector){return selector.includes('toggle-guidance') ? guidance : element();},
    querySelectorAll(){return [];}, createElement:element,
    addEventListener(name, listener){listeners.set(name, listener);}
  };
  const window = {
    addEventListener(name, listener){windowListeners.set(name, listener);}, setInterval(){},
    dispatchEvent(event){events.push(event);windowListeners.get(event.type)?.(event);return true;}
  };
  const context = vm.createContext({
    window, document, URLSearchParams, URL, Date: TestDate, console,
    location:new URL('https://example.edu/workboard/'+(options.hash || '#my-work')), history:{replaceState(){}},
    CSS:{escape:value=>value}, queueMicrotask:callback=>callback(), setTimeout(){},
    CustomEvent:class { constructor(type, init={}){this.type=type;this.detail=init.detail;} },
    localStorage:{
      getItem(name){if(options.readError) throw new Error('unavailable');return storage.get(name) ?? null;},
      setItem(name,value){if(options.writeError) throw new Error('quota');writes++;storage.set(name,value);},
      removeItem(name){storage.delete(name);}
    },
    FileReader:class {readAsText(value){this.result=value;this.onload();}},
    FormData:class {constructor(form){this.values=form.values;} get(name){return this.values.get(name) ?? null;}}
  });
  for(const file of ['config.js','tasks.js','term1-2027.js','reference.js']) {
    vm.runInContext(fs.readFileSync(new URL('assets/js/data/'+file,root),'utf8'),context);
  }
  for(const file of ['assets/js/data/task-source-links.js','assets/js/task-sources.js']) {
    vm.runInContext(fs.readFileSync(new URL(file,root),'utf8'),context);
  }
  vm.runInContext(fs.readFileSync(new URL('assets/js/vet-step-guidance.js',root),'utf8'),context);
  vm.runInContext(fs.readFileSync(new URL('assets/js/task-review.js',root),'utf8'),context);
  vm.runInContext(fs.readFileSync(new URL('assets/js/task-navigation.js',root),'utf8'),context);
  const initialisation = '  syncRoleFilters(); updateGuidanceToggle(); render();\n})();';
  assert.ok(source.includes(initialisation), 'test harness must replace the single final app initialisation');
  vm.runInContext(source.replace(initialisation, `  window.__test = {
    getState:()=>state, saveState, completeTask, undoTaskCompletion, importWorkspace,
    taskCard, focusTask, cycleFocusTask, workflowTaskButtons, openTask, currentView,
    isClosed, cycleGateState, taskById, createEventOccurrence, getRecord, getStatus, dependencyPanel,
    externalReview, externalReviewNote, reviewNotes, stripGeneratedReviewNote,
    statusPill, taskCompletionActions, completionForm, saveTaskForm,
    guidanceTarget, guidanceLinks, stepGuidance, sourceGuidance
  };\n})();`),context);
  return {
    adapter:window.WWHS_WORKBOARD_ADAPTER, api:window.__test, data:window.VET_WORKBOARD,
    storage, events, notices, elements, options, context, get writes(){return writes;},
    clickLink(href){
      const link={href,target:'',dataset:{},isConnected:true,focused:false,
        matches:selector=>selector==='a[href]',hasAttribute:()=>false,
        closest:selector=>selector==='a[href]'?link:null,
        getClientRects:()=>[{}],focus(){this.focused=true;}};
      const event={target:link,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
      listeners.get('click')(event);return {link,event};
    },
    dispatch(type, detail={}){window.dispatchEvent({type,...detail});},
    changeStep(task, index, checked){
      const target={dataset:{taskId:task.id,taskStep:String(index)},checked,matches:selector=>selector==='[data-task-step]'};
      listeners.get('change')({target});return target;
    },
    form(task, values={}){
      const error={textContent:'',hidden:true};
      const form={dataset:{taskId:task.id}, values:new Map(Object.entries(values)), error,
        querySelector:selector=>selector==='#task-form-error'?error:null};
      elements.set('task-record-form',form);return form;
    },
    click(action,taskId){const target={dataset:{action,taskId}};listeners.get('click')({target:{closest:selector=>selector==='[data-action]'?target:null}});}
  };
}

test('VET adapter exposes saved work only and retains stable native routes', () => {
  const h=harness();
  assert.equal(h.adapter.wing,'vet');
  assert.equal(h.adapter.getEntries().length,0);
  assert.ok(h.data.taskRegister.tasks.length>50 && h.data.operatingCycle2027.tasks.length>150);
  const task=h.data.taskRegister.tasks[0], entry=h.adapter.describeTask(task.id);
  assert.equal(entry.taskId,task.id);assert.equal(entry.recordKey,task.id);
  assert.equal(entry.route,'#task/'+encodeURIComponent(task.id));
  assert.equal(entry.action,task.actionSteps[0]);assert.equal(entry.cycle,'2026');
  assert.equal(h.adapter.describeTask('missing'),null);
  assert.equal(h.api.currentView(),'my-work');
  assert.equal(h.writes,0);
});

test('real source helper keeps every VET AI context bounded and excludes private saved links and evidence', () => {
  const base=harness();
  const links=Object.fromEntries(base.data.systems.map(system=>[system.id,`https://private.example.invalid/VET-PRIVATE-${system.id}`]));
  const cycle=base.data.operatingCycle2027;
  const eventOccurrences=cycle.eventTemplates.map((template,index)=>({id:`2027-event-${template.canonicalTaskId}-test${index}`,templateId:template.id,workflowId:cycle.interruptWorkflows[0],createdAt:'2027-03-01T01:00:00.000Z',term:1}));
  const h=harness(state({'a-08-publish-local-handbook':{status:'in-progress',exceptionSummary:'VET-PRIVATE-NOTE',evidenceRef:'VET-PRIVATE-EVIDENCE',verifier:'VET-PRIVATE-VERIFIER'}},{links,eventOccurrences}),{now:'2027-03-01T02:00:00Z'});
  const before=h.storage.get(key), writes=h.writes;
  const all=[...h.data.taskRegister.tasks,...h.data.operatingCycle2027.tasks,...eventOccurrences.map(event=>h.api.taskById(event.id))];
  for(const template of cycle.eventTemplates)assert.equal(h.adapter.describeTask(template.id),null,'Template itself is not an actionable occurrence');
  for(const task of all){
    const context=h.adapter.describeTask(task.id).taskHelp;
    assert.doesNotThrow(()=>normaliseTaskHelpContext(context),task.id);
    assert.equal(new Set(context.links.map(link=>link.url)).size,context.links.length,task.id+' deduplicates links');
    assert.doesNotMatch(JSON.stringify(context),/private\.example\.invalid|VET-PRIVATE/);
  }
  const handbook=h.adapter.describeTask('a-08-publish-local-handbook').taskHelp;
  assert.ok(handbook.links.some(link=>link.url.includes('/1nhUiViZFMjSbrn5aWuTiLSVwKUdwu--f/')),'Exact audited guide reaches AI context');
  assert.equal(h.storage.get(key),before);assert.equal(h.writes,writes);
});

test('VET task links close back to the same personal list or year scope without editing records', () => {
  for(const hash of ['#my-work','#year?year=2026']) {
    const h=harness(state({'a-02-build-live-calendar':{status:'in-progress',exceptionSummary:'Keep this note'}}),{hash});
    const before=h.storage.get(key), task=h.api.taskById('a-02-build-live-calendar');
    const underlying=h.elements.get('route-content');underlying.innerHTML='Existing filtered list';
    const {event,link}=h.clickLink('#task/'+task.id);
    assert.equal(event.defaultPrevented,true);
    assert.equal(h.context.location.hash,hash);
    assert.equal(h.elements.get('task-dialog').open,true);
    assert.ok(h.elements.get('task-dialog-content').innerHTML.includes(task.title));
    assert.equal(underlying.innerHTML,'Existing filtered list');
    h.click('close-dialog');
    assert.equal(h.elements.get('task-dialog').open,false);
    assert.equal(h.context.location.hash,hash);
    assert.equal(link.focused,true);
    assert.equal(h.storage.get(key),before);assert.equal(h.writes,0);
  }
});

test('VET unknown task links retain the normal navigation fallback', () => {
  const h=harness(), {event}=h.clickLink('#task/not-in-the-catalogue');
  assert.equal(event.defaultPrevented,false);
  assert.equal(h.elements.get('task-dialog').open,false);
  assert.equal(h.writes,0);
});

test('VET step resources render beside checks and preserve records across the entire catalogue', () => {
  const h=harness(state({'a-02-build-live-calendar':{status:'in-progress',stepChecks:{0:true},exceptionSummary:'Keep my calendar note'}}));
  const before=JSON.stringify(h.api.getState());
  const all=[...h.data.taskRegister.tasks,...h.data.operatingCycle2027.tasks,...h.data.operatingCycle2027.eventTemplates];
  for(const task of all) for(let index=0;index<task.actionSteps.length;index++) {
    const html=h.api.stepGuidance(task,index);
    assert.ok(html.includes('data-guidance-link')||html.includes('step-guidance-note'),`${task.id} step ${index+1}`);
    assert.doesNotMatch(html,/href="(?:undefined|null|javascript:|#sources)/i);
  }
  const task=h.api.taskById('a-02-build-live-calendar');h.api.openTask(task.id);
  const html=h.elements.get('task-dialog-content').innerHTML;
  assert.match(html,/data-task-step="0"[^>]*checked/);
  assert.match(html,/Keep my calendar note/);
  assert.match(html,/Useful places for step 1/);
  assert.match(html,/nesa\/key-dates\/timetable-of-actions/);
  for(const label of html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)) assert.doesNotMatch(label[1],/data-guidance-link/);
  assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.writes,0);
});

test('VET source and step resources honour approved overrides and label source access honestly', () => {
  const h=harness(state({}, {links:{'document-library':'https://example.edu/approved-library','wwhs-drive':'https://example.edu/current-folder'}}));
  const task=h.api.taskById('a-02-build-live-calendar');
  const step=h.api.stepGuidance(task,0);
  assert.match(step,/https:\/\/example.edu\/approved-library/);
  assert.match(step,/approved replacement/);
  const source=h.api.sourceGuidance(h.data.operatingCycle2027.sourceFamilies['RTO-DOCUMENT-LIBRARY'],{operatingYear:2027},'RTO-DOCUMENT-LIBRARY');
  assert.match(source,/https:\/\/example.edu\/approved-library/);
  const local=h.api.guidanceTarget({systemId:'wwhs-drive',label:'Search VET action record',hint:'Drive search for old folder'},task);
  assert.equal(local.label,'Open VET action record');assert.doesNotMatch(local.hint,/old folder/);
  assert.equal(h.api.guidanceTarget({route:'javascript:alert(1)'},task),null);
  assert.equal(h.api.guidanceTarget({systemId:'unknown'},task),null);
  const original=harness();
  const search=original.api.guidanceTarget({sourceId:'WWHS-CALENDAR-2026'},task);
  assert.match(search.label,/Find in Drive/);assert.match(search.hint,/Search/);
  assert.doesNotMatch(original.api.focusTask(task),/Useful places for step 1/);
  assert.match(original.api.focusTask(task),/task-clarity-purpose/);
  assert.doesNotMatch(original.api.cycleFocusTask(original.data.operatingCycle2027.tasks[0]),/Useful places for step 1/);
  assert.match(original.api.cycleFocusTask(original.data.operatingCycle2027.tasks[0]),/task-clarity-purpose/);
});

test('full VET register distinguishes core duties, scheduled instances and procedures without saving', () => {
  const h=harness(null,{now:'2026-09-17T01:00:00Z'}), before=JSON.stringify(h.api.getState());
  const {items}=h.adapter.getTaskRegister(), counts={core:0,scheduled:0,procedure:0,event:0};
  for(const item of items)counts[item.entryKind]++;
  assert.deepEqual(counts,{core:h.data.taskRegister.tasks.length,scheduled:h.data.operatingCycle2027.tasks.length,procedure:h.data.operatingCycle2027.eventTemplates.length,event:0});
  assert.equal(items.find(item=>item.id==='t2-09-review-stage6-entry-cutoff').entryKind,'core');
  for(const template of h.data.operatingCycle2027.eventTemplates){
    const item=items.find(item=>item.id===template.id);
    assert.equal(item.entryKind,'procedure');assert.equal(item.procedureOnly,true);
  }
  assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.writes,0);
});

test('existing 2026 ticks complete the checklist and prerequisites without replacing native progress', () => {
  const initial=harness(), task=initial.data.taskRegister.tasks[0];
  const native={status:'in-progress',exceptionSummary:'Keep <source> & notes',stepChecks:{0:true},sourceChecked:false,doneWhenConfirmed:false};
  const h=harness(state({[task.id]:native}),{now:'2026-09-18T01:00:00Z',reviewRaw:reviewStore(task.id)});
  const raw=h.storage.get(key), before=JSON.stringify(h.api.getState()), descriptor=h.adapter.describeTask(task.id);
  assert.equal(descriptor.sourceStatus,'completed-externally');assert.equal(descriptor.taskHelp.sourceStatus,'completed-externally');
  assert.equal(descriptor.status,'done');assert.equal(h.api.getStatus(task),'in-progress');assert.equal(h.api.isClosed(task),true);
  assert.match(descriptor.notes,/Keep <source> & notes\n\nReviewed complete for 2026 on 2026-09-18/);
  assert.match(h.api.statusPill(task),/Task complete · reviewed/);assert.match(h.api.taskCompletionActions(task),/Task complete · reviewed/);
  const item=h.adapter.getTaskRegister().items.find(item=>item.id===task.id);
  assert.equal(item.complete,true);assert.equal(item.externallyReviewed,true);assert.equal(item.reviewedOn,'2026-09-18');
  h.api.openTask(task.id);
  const html=h.elements.get('task-dialog-content').innerHTML;
  assert.equal([...html.matchAll(/<input[^>]*data-task-step=[^>]*checked disabled/g)].length,task.actionSteps.length);
  assert.match(html,/name="evidenceRef" value=""/);assert.match(html,/name="verifier" value=""/);
  assert.match(html,/Keep &lt;source&gt; &amp; notes/);assert.doesNotMatch(html,/name="sourceChecked" type="checkbox" checked/);
  assert.equal(h.storage.get(key),raw);assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.writes,0);
  const reloaded=harness(raw,{now:'2026-09-18T01:00:00Z',reviewRaw:h.storage.get(reviewKey)});
  assert.equal(reloaded.adapter.describeTask(task.id).sourceStatus,'completed-externally');
  h.storage.set(reviewKey,reviewStore(task.id,false));
  assert.equal(h.adapter.describeTask(task.id).sourceStatus,'in-progress');assert.equal(h.adapter.describeTask(task.id).notes,native.exceptionSummary);
  assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.writes,0);
});

test('a review tick alone does not create a saved entry and removing or restoring it reversibly changes the forecast', () => {
  const initial=harness(null,{now:'2026-09-18T01:00:00Z'});
  const entry=initial.adapter.getForecast().entries.find(entry=>entry.forecast.kind!=='prerequisite');
  assert.ok(entry,'test needs a dated current forecast item');
  const h=harness(null,{now:'2026-09-18T01:00:00Z',reviewRaw:reviewStore(entry.taskId)});
  // Review ticks cannot complete work before its date, so use a date already reached.
  h.options.now='2026-12-30T01:00:00Z';h.storage.set(reviewKey,reviewStore(entry.taskId,true,'2026-12-30'));h.adapter.getForecast();
  const task=h.api.taskById(entry.taskId);
  assert.ok(h.api.externalReview(task));assert.equal(h.adapter.getEntries().length,0);
  assert.ok(!h.adapter.getForecast().entries.some(item=>item.taskId===task.id));
  h.storage.delete(reviewKey);assert.equal(h.api.externalReview(task),null);
  h.storage.set(reviewKey,reviewStore(task.id,true,'2026-12-30'));assert.ok(h.api.externalReview(task));
  assert.equal(h.writes,0);assert.deepEqual(Object.keys(h.api.getState().records),[]);
});

test('external review strictly rejects invalid, future, wrong-year and procedure ticks', () => {
  const h=harness(null,{now:'2026-09-18T01:00:00Z'}), task=h.data.taskRegister.tasks[0];
  for(const raw of ['{broken','null','[]',JSON.stringify({version:2,records:{}}),reviewStore(task.id,false),reviewStore(task.id,'true'),reviewStore(task.id,true,'2026-02-30'),reviewStore(task.id,true,'2026-09-19'),reviewStore(task.id,true,'2026-09-18',2027)]) {
    h.storage.set(reviewKey,raw);assert.equal(h.api.externalReview(task),null,raw);
  }
  const future=h.data.operatingCycle2027.tasks[0];h.storage.set(reviewKey,reviewStore(future.id,true,'2026-09-18',2027));
  assert.equal(h.api.externalReview(future),null);
  h.storage.set(reviewKey,reviewStore(task.id));
  assert.equal(h.api.externalReview({...task,windowStart:'2026-10-01'}),null);
  assert.equal(h.api.externalReview({...task,windowEnd:'2026-10-01'}),null);
  assert.equal(h.api.externalReview({...task,dueDate:'2026-10-01'}),null);
  assert.equal(h.api.externalReview({...task,procedureOnly:true}),null);
  assert.equal(h.api.externalReview({...task,occurrenceTemplate:true}),null);
  assert.ok(h.api.externalReview(task));
  h.options.readError=true;assert.equal(h.api.externalReview(task),null);assert.equal(h.writes,0);
});

test('native complete, verified and not-applicable records take priority over external reviews', () => {
  const h=harness(null,{now:'2026-09-18T01:00:00Z'}), task=h.data.taskRegister.tasks[0];
  h.storage.set(reviewKey,reviewStore(task.id));
  for(const status of ['completed','verified','not-applicable']) {
    h.api.getState().records[task.id]={status,exceptionSummary:'Native note',stepChecks:{0:true}};
    assert.equal(h.api.externalReview(task),null);assert.equal(h.adapter.describeTask(task.id).sourceStatus,status);
    assert.doesNotMatch(h.api.statusPill(task),/outside this app/);assert.equal(h.adapter.describeTask(task.id).notes,'Native note');
    assert.equal(h.adapter.getTaskRegister().items.find(item=>item.id===task.id).complete,true);
  }
  assert.equal(h.writes,0);
});

test('explicit early VET review completes later work and unticks without replacing native progress', () => {
  const id='t4-01-year11-final-outcomes';
  const native={status:'waiting',reviewDate:'2026-10-30',escalationDate:'2026-11-02',waitingForRole:'VET Coordinator',exceptionSummary:'Keep <existing> notes',stepChecks:{0:true},sourceChecked:false,doneWhenConfirmed:false};
  const h=harness(state({[id]:native}),{now:'2026-09-18T01:00:00Z',reviewRaw:earlyReviewStore(id)});
  const task=h.api.taskById(id), raw=h.storage.get(key), before=JSON.stringify(h.api.getState());
  assert.ok(task.dueDate>'2026-09-18');
  assert.equal(h.api.externalReview(task).completedEarly,true);
  assert.equal(h.adapter.describeTask(id).sourceStatus,'completed-externally');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.id===id).complete,true);
  h.api.openTask(id);
  assert.match(h.elements.get('task-dialog-content').innerHTML,/Task complete · reviewed/);
  assert.match(h.elements.get('task-dialog-content').innerHTML,/Keep &lt;existing&gt; notes/);
  assert.equal(h.storage.get(key),raw);assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.writes,0);
  const reloaded=harness(raw,{now:'2026-09-18T01:00:00Z',reviewRaw:h.storage.get(reviewKey)});
  assert.equal(reloaded.adapter.describeTask(id).status,'done');
  h.storage.set(reviewKey,earlyReviewStore(id,false));
  assert.equal(h.api.externalReview(task),null);
  assert.equal(h.adapter.describeTask(id).sourceStatus,'waiting');
  assert.equal(h.adapter.describeTask(id).notes,native.exceptionSummary);
  assert.equal(h.storage.get(key),raw);assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.writes,0);
});

test('explicit early VET review is limited to its future task and year and keeps legacy guards', () => {
  const h=harness(null,{now:'2026-09-18T01:00:00Z'}), [task,other]=h.data.operatingCycle2027.tasks;
  h.storage.set(reviewKey,earlyReviewStore(task.id,true,'2026-09-18',2027));
  assert.equal(h.api.externalReview(task).completedEarly,true);
  assert.equal(h.adapter.describeTask(task.id).status,'done');
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.id===task.id).complete,true);
  assert.equal(h.api.externalReview(other),null);
  assert.equal(h.api.externalReview({...task,operatingYear:2026,id:h.data.taskRegister.tasks[0].id}),null);
  for(const raw of [reviewStore(task.id,true,'2026-09-18',2027),earlyReviewStore(task.id,true,'2026-09-19',2027),earlyReviewStore(task.id,true,'2026-09-18',2026),earlyReviewStore(task.id,true,'2026-09-18',2027).replace('"completedEarly":true','"completedEarly":"true"')]) {
    h.storage.set(reviewKey,raw);assert.equal(h.api.externalReview(task),null);
  }
  h.storage.set(reviewKey,earlyReviewStore(task.id,true,'2026-09-18',2027));
  h.api.getState().records[task.id]={status:'verified',exceptionSummary:'Native verified result',stepChecks:{0:true}};
  assert.equal(h.api.externalReview(task),null);
  assert.equal(h.adapter.describeTask(task.id).sourceStatus,'verified');
  assert.equal(h.adapter.describeTask(task.id).notes,'Native verified result');
  assert.equal(h.writes,0);
});

test('saving external completion form preserves native status, checks and manual notes only', () => {
  const initial=harness(), task=initial.data.taskRegister.tasks[0];
  const h=harness(state({[task.id]:{status:'in-progress',exceptionSummary:'Existing note',stepChecks:{0:true}}}),{now:'2026-09-18T01:00:00Z',reviewRaw:reviewStore(task.id)});
  h.api.openTask(task.id);const note=h.api.externalReviewNote(task);
  const form=h.form(task,{status:'completed-externally',exceptionSummary:`Existing note\n\nAdditional note <kept>\n\n${note}`});
  h.api.saveTaskForm(form,'save');
  const record=JSON.parse(h.storage.get(key)).records[task.id];
  assert.equal(record.status,'in-progress');assert.equal(record.exceptionSummary,'Existing note\n\nAdditional note <kept>');
  assert.deepEqual(record.stepChecks,{'0':true});assert.equal(record.sourceChecked,false);assert.equal(record.doneWhenConfirmed,false);
  assert.equal(record.evidenceRef,'');assert.equal(record.verifier,'');assert.equal(record.independentVerifierConfirmed,false);
  assert.equal(h.writes,1);assert.equal(h.adapter.describeTask(task.id).sourceStatus,'completed-externally');
  h.storage.set(reviewKey,reviewStore(task.id,false));
  assert.equal(h.adapter.describeTask(task.id).notes,record.exceptionSummary);assert.equal(h.adapter.describeTask(task.id).sourceStatus,'in-progress');
  assert.equal(h.api.stripGeneratedReviewNote(`Original\n\n\nSpacing\n\n${note}\n\nAfter`,note),'Original\n\n\nSpacing\n\nAfter');
  assert.equal(h.api.stripGeneratedReviewNote(`Edited ${note}`,note),`Edited ${note}`);
  assert.equal(h.api.stripGeneratedReviewNote(`${note}\n\n${note}`,note),note);
});

test('review updates refresh the views and protect an open draft against stale save and checklist changes', () => {
  const h=harness(null,{now:'2026-09-18T01:00:00Z'}), task=h.data.taskRegister.tasks[0];
  h.storage.set(reviewKey,reviewStore(task.id));h.api.openTask(task.id);
  const form=h.form(task,{status:'completed-externally',exceptionSummary:`Unsaved draft\n\n${h.api.externalReviewNote(task)}`});
  const html=h.elements.get('task-dialog-content').innerHTML;
  h.storage.set(reviewKey,reviewStore(task.id,false));h.dispatch('storage',{key:reviewKey});
  assert.equal(h.elements.get('task-dialog-content').innerHTML,html);assert.match(form.error.textContent,/draft is still here/);
  assert.ok(h.events.some(event=>event.type==='wwhs:records-updated'));assert.ok(h.events.some(event=>event.type==='wwhs:forecast-updated'));
  h.api.saveTaskForm(form,'save');assert.equal(h.writes,0);assert.equal(h.api.getState().records[task.id],undefined);
  assert.equal(h.changeStep(task,0,true).checked,false);assert.equal(h.writes,0);
  assert.match(form.values.get('exceptionSummary'),/^Unsaved draft/);
  h.dispatch('wwhs:review-updated');assert.equal(h.writes,0);
  h.api.openTask(task.id);const reopened=h.form(task,{status:'not-started',exceptionSummary:'Recovered draft'});
  h.api.saveTaskForm(reopened,'save');assert.equal(h.writes,1);assert.equal(h.api.getRecord(task.id).exceptionSummary,'Recovered draft');
});

test('an old recurring review does not complete a later follow-up when that date arrives', () => {
  const h=harness(null,{now:'2026-09-18T01:00:00Z'}), task=h.data.taskRegister.tasks.find(task=>task.phase==='continuous');
  assert.ok(task);h.storage.set(reviewKey,reviewStore(task.id));assert.ok(h.api.externalReview(task));
  h.api.getState().records[task.id]={status:'waiting',reviewDate:'2026-09-25',waitingForRole:'VET Coordinator',stepChecks:{}};
  assert.equal(h.api.externalReview(task),null);
  h.options.now='2026-09-25T01:00:00Z';h.adapter.getForecast();
  assert.equal(h.api.externalReview(task),null);assert.equal(h.adapter.describeTask(task.id).sourceStatus,'waiting');
  h.storage.set(reviewKey,reviewStore(task.id,true,'2026-09-25'));assert.ok(h.api.externalReview(task));
  assert.equal(h.adapter.describeTask(task.id).status,'done');assert.equal(h.writes,0);
});

test('saved notes, waiting owner and chase date project without changing native records', () => {
  const initial=harness(), task=initial.data.taskRegister.tasks[0];
  const record={status:'waiting',waitingForRole:'VET Coordinator',reviewDate:'2027-03-10',escalationDate:'2027-03-12',exceptionSummary:'Confirm source with coordinator',stepChecks:{0:true}};
  const h=harness(state({[task.id]:record})), raw=h.storage.get(key);
  const [entry]=h.adapter.getEntries();
  assert.equal(entry.status,'waiting');assert.equal(entry.sourceStatus,'waiting');
  assert.equal(entry.notes,record.exceptionSummary);assert.equal(entry.waitingOn,record.waitingForRole);
  assert.equal(entry.dueDate,record.reviewDate);assert.equal(entry.action,task.actionSteps[1]);
  assert.equal(h.storage.get(key),raw);assert.equal(h.writes,0);
});

test('native task completion counts in the gate without inventing independent verification', () => {
  const h=harness(), task=h.data.operatingCycle2027.tasks[0], before=h.api.cycleGateState(task.gate).closed;
  h.api.completeTask(task.id);
  assert.equal(h.adapter.getEntries().length,1);
  assert.equal(h.adapter.describeTask(task.id).status,'done');
  assert.equal(h.adapter.describeTask(task.id).sourceStatus,'completed');
  assert.equal(h.api.isClosed(task),true);assert.equal(h.api.cycleGateState(task.gate).closed,before+1);
  assert.equal(h.api.getState().records[task.id].verifier,undefined);
  assert.equal(h.events.filter(e=>e.type==='wwhs:records-updated').length,1);
  const loaded=harness(h.storage.get(key));
  assert.equal(loaded.adapter.describeTask(task.id).sourceStatus,'completed');
  h.api.undoTaskCompletion(task.id);
  assert.equal(h.adapter.getEntries().length,0);
  assert.equal(h.events.filter(e=>e.type==='wwhs:records-updated').length,2);
});

test('separate event occurrences keep separate planning identities', () => {
  const initial=harness(), cycle=initial.data.operatingCycle2027, template=cycle.eventTemplates[0];
  const occurrences=['alpha','beta'].map(suffix=>({id:`2027-event-${template.canonicalTaskId}-${suffix}`,templateId:template.id,workflowId:cycle.interruptWorkflows[0],createdAt:'2027-03-01T01:00:00.000Z',term:1}));
  const h=harness(state(Object.fromEntries(occurrences.map(e=>[e.id,{status:'in-progress'}])),{eventOccurrences:occurrences}));
  const entries=h.adapter.getEntries();assert.equal(entries.length,2);
  assert.notEqual(entries[0].recordKey,entries[1].recordKey);
  for(const entry of entries){assert.equal(entry.taskId,entry.recordKey);assert.equal(entry.cycle,'2027');assert.ok(entry.route.includes(entry.taskId));}
  const {items}=h.adapter.getTaskRegister();
  assert.equal(items.filter(item=>item.entryKind==='event').length,2);
  for(const occurrence of occurrences){
    const item=items.find(item=>item.id===occurrence.id);
    assert.equal(item.entryKind,'event');assert.equal(item.recordKey,occurrence.id);
    assert.equal(item.procedureOnly,false);assert.equal(h.api.taskById(item.id).occurrenceOf,template.id);
  }
  assert.equal(items.find(item=>item.id===template.id).entryKind,'procedure');
  assert.equal(h.writes,0);
});

test('Add to my work emits a descriptor without writing or completing native work', () => {
  const h=harness(), task=h.data.taskRegister.tasks[0];
  h.click('track-work-task',task.id);
  assert.equal(h.writes,0);assert.equal(h.adapter.getEntries().length,0);
  const [event]=h.events;assert.equal(event.type,'wwhs:track-task');assert.equal(event.detail.taskId,task.id);
  for(const html of [h.api.taskCard(task),h.api.focusTask(task),h.api.workflowTaskButtons([task]),h.api.cycleFocusTask(h.data.operatingCycle2027.tasks[0])]) {
    assert.match(html,/type="button" data-action="track-work-task"/);
  }
  h.adapter.openTask(task.id);
  assert.match(h.elements.get('task-dialog-content').innerHTML,/type="button" data-action="track-work-task"/);
});

test('native writes refuse another tab change and roll back personal completion', () => {
  const h=harness(), task=h.data.taskRegister.tasks[0];
  const other=JSON.stringify(state({[task.id]:{status:'in-progress',exceptionSummary:'Saved in other tab'}}));
  h.storage.set(key,other);h.api.completeTask(task.id);
  assert.equal(h.storage.get(key),other);assert.equal(h.writes,0);
  assert.equal(h.adapter.getEntries().length,0);
  assert.equal(h.events.length,0);assert.match(h.notices.join(' '),/another tab/);
});

test('unreadable, malformed and unsupported native storage cannot be overwritten', () => {
  for(const saved of ['{broken', 'null', '[]', JSON.stringify({schemaVersion:99,records:{keep:'me'}})]) {
    const h=harness(saved);h.api.completeTask(h.data.taskRegister.tasks[0].id);
    assert.equal(h.storage.get(key),saved);assert.equal(h.writes,0);assert.equal(h.adapter.getEntries().length,0);
    assert.match(h.notices.join(' '),/Nothing has been overwritten/);
  }
  const h=harness(null,{readError:true});h.api.completeTask(h.data.taskRegister.tasks[0].id);
  assert.equal(h.writes,0);assert.equal(h.events.length,0);
});

test('successive own saves advance the comparison baseline; failures do not publish', () => {
  const h=harness();h.api.completeTask(h.data.taskRegister.tasks[0].id);h.api.completeTask(h.data.taskRegister.tasks[1].id);
  assert.equal(h.writes,2);assert.equal(h.adapter.getEntries().length,2);
  h.options.writeError=true;h.api.completeTask(h.data.taskRegister.tasks[2].id);
  assert.equal(h.writes,2);assert.equal(h.adapter.getEntries().length,2);assert.equal(h.events.length,2);
});

test('backup restore publishes success and preserves existing state on conflict', () => {
  const h=harness(), task=h.data.taskRegister.tasks[0];
  const backup=JSON.stringify({kind:'WWHS-VET-COMPLIANCE-WORKBOARD-BACKUP',productId:h.data.config.productId,schemaVersion:3,buildId:h.data.config.buildId,state:state({[task.id]:{status:'in-progress',exceptionSummary:'Restored note'}})});
  h.api.importWorkspace(backup);
  assert.equal(h.adapter.getEntries()[0].notes,'Restored note');assert.equal(h.events.length,1);
  const before=JSON.stringify(h.api.getState()), external=JSON.stringify(state({}));h.storage.set(key,external);
  h.api.importWorkspace(backup);
  assert.equal(JSON.stringify(h.api.getState()),before);assert.equal(h.storage.get(key),external);assert.equal(h.events.length,1);
});

test('event creation rolls back when storage has changed elsewhere', () => {
  const h=harness(), cycle=h.data.operatingCycle2027;
  h.storage.set(key,JSON.stringify(state()));
  h.api.createEventOccurrence(cycle.eventTemplates[0].id,cycle.interruptWorkflows[0]);
  assert.equal(h.api.getState().eventOccurrences.length,0);assert.equal(h.adapter.getEntries().length,0);assert.equal(h.writes,0);
});

test('VET forecast automatically projects current-year dates without importing the undated catalogue', () => {
  const h=harness(state({}, {activeCycle:'2027',selected2027Term:4}),{now:'2026-09-17T01:00:00Z'});
  const forecast=h.adapter.getForecast();
  assert.equal(forecast.context.date,'2026-09-17');assert.equal(forecast.context.year,2026);
  assert.equal(forecast.context.sourceYear,2026);assert.equal(forecast.context.sourceAsAt,'2026-08-26');
  assert.equal(forecast.context.sourceStateKey,key);assert.equal(forecast.context.horizonDays,21);
  assert.equal(forecast.entries.filter(entry=>entry.forecast.kind!=='prerequisite').length,9);
  assert.equal(forecast.entries.find(entry=>entry.taskId==='t3-10-principal-hsc-certification')?.dueDate,'2026-09-18');
  assert.ok(!forecast.entries.some(entry=>entry.taskId==='t2-09-review-stage6-entry-cutoff'),'Historical cutoff review stays outside current forecast');
  assert.ok(forecast.entries.every(entry=>entry.cycle==='2026'));
  assert.ok(!forecast.entries.some(entry=>entry.taskId==='a-08-publish-local-handbook'));
  assert.ok(!forecast.entries.some(entry=>entry.taskId==='t4-01-year11-final-outcomes'));
  const estimates=forecast.entries.find(entry=>entry.taskId==='t3-05-hsc-estimates');
  assert.equal(estimates.forecast.kind,'source-check');assert.equal(estimates.dueDate,'2026-09-15');
  assert.match(estimates.forecast.reason,/not been confirmed here/);assert.equal(estimates.sourceStatus,'not-started');
  assert.equal(h.adapter.getEntries().length,0);assert.equal(h.writes,0);
});

test('forecast respects the exact 21-day horizon, source roles and explicit assignments', () => {
  const early=harness(null,{now:'2026-10-01T01:00:00Z'}).adapter.getForecast();
  assert.ok(!early.entries.some(entry=>entry.taskId==='t4-01-year11-final-outcomes'));
  const h=harness(state({}, {role:'trainer'}),{now:'2026-10-02T01:00:00Z'});
  const forecast=h.adapter.getForecast();
  assert.ok(forecast.entries.some(entry=>entry.taskId==='t4-01-year11-final-outcomes'&&entry.forecast.scheduledDate==='2026-10-23'));
  assert.ok(!forecast.entries.some(entry=>entry.taskId==='t1-01-usi-verification'));
  assert.ok(forecast.entries.some(entry=>entry.taskId==='t3-05-hsc-estimates'));
  const assigned=harness(state({}, {role:'trainer',assignments:{'t1-01-usi-verification':'Trainer/assessor','t3-05-hsc-estimates':'VET Coordinator Assistant'}}),{now:'2026-10-02T01:00:00Z'}).adapter.getForecast();
  assert.ok(assigned.entries.some(entry=>entry.taskId==='t1-01-usi-verification'));
  assert.ok(!assigned.entries.some(entry=>entry.taskId==='t3-05-hsc-estimates'));
  const coordinator=harness(state({}, {role:'coordinator',assignments:{'t1-01-usi-verification':'VET Coordinator Assistant'}}),{now:'2026-10-02T01:00:00Z'}).adapter.getForecast();
  assert.ok(!coordinator.entries.some(entry=>entry.taskId==='t1-01-usi-verification'));
});

test('2027 forecast follows actual week windows and gates without inventing a setup deadline', () => {
  const h=harness(null,{now:'2027-02-04T01:00:00Z'}),forecast=h.adapter.getForecast();
  assert.equal(forecast.context.sourceYear,2027);assert.ok(forecast.entries.length>1);
  assert.ok(forecast.entries.every(entry=>entry.cycle==='2027'));
  const setup=forecast.entries.find(entry=>entry.taskId==='2027-g00-rollover');
  assert.equal(setup.forecast.kind,'prerequisite');assert.equal(setup.forecast.section,'ready');assert.equal(setup.dueDate,null);
  assert.ok(!forecast.entries.some(entry=>entry.taskId==='2027-g04-profile'));
  const week=forecast.entries.find(entry=>entry.taskId==='2027-w01-updates');
  assert.equal(week.forecast.windowStart,'2027-02-03');assert.equal(week.forecast.windowEnd,'2027-02-05');
  assert.equal(week.forecast.period,'Term 1 · Week 1 · 2027');assert.equal(week.forecast.section,'waiting');assert.equal(week.forecast.blocked,true);
  assert.match(week.forecast.blockerReason,/earlier task|stage/i);
  assert.ok(forecast.entries.every(entry=>!entry.forecast.windowStart||entry.forecast.windowStart<='2027-02-25'));
  assert.equal(h.writes,0);
});

test('saved chase dates drive due and waiting follow-ups without inventing task dates', () => {
  const h=harness(state({
    'c-01-rto-updates':{status:'waiting',waitingForRole:'VET Coordinator',reviewDate:'2026-09-22',escalationDate:'2026-09-25'},
    'a-01-confirm-authority-set':{status:'in-progress',reviewDate:'2026-09-17'},
    'c-02-team-meetings':{status:'in-progress',reviewDate:'2026-11-01'}
  }),{now:'2026-09-17T01:00:00Z'});
  const {entries}=h.adapter.getForecast();
  const waiting=entries.find(entry=>entry.taskId==='c-01-rto-updates');
  assert.equal(waiting.forecast.kind,'follow-up');assert.equal(waiting.forecast.section,'waiting');assert.equal(waiting.dueDate,'2026-09-22');
  const due=entries.find(entry=>entry.taskId==='a-01-confirm-authority-set');
  assert.equal(due.forecast.section,'ready');assert.equal(due.forecast.scheduledDate,'2026-09-17');
  assert.ok(!entries.some(entry=>entry.taskId==='c-02-team-meetings'));
});

test('completion removes automatic forecast while source status remains resolvable', () => {
  const h=harness(null,{now:'2026-09-17T01:00:00Z'}),id='t3-05-hsc-estimates';
  assert.ok(h.adapter.getForecast().entries.some(entry=>entry.taskId===id));
  h.api.completeTask(id);
  assert.ok(!h.adapter.getForecast().entries.some(entry=>entry.taskId===id));
  assert.equal(h.adapter.describeRecord(id).status,'done');assert.equal(h.adapter.describeRecord(id).sourceStatus,'completed');
  assert.equal(h.api.isClosed(h.api.taskById(id)),true);
});

test('unavailable, stale and future-year source data cannot generate an automatic forecast', () => {
  for(const raw of ['{broken',JSON.stringify({schemaVersion:8})]) {
    const h=harness(raw,{now:'2026-09-17T01:00:00Z'}),forecast=h.adapter.getForecast();
    assert.equal(forecast.context.mode,'unavailable');assert.equal(forecast.entries.length,0);assert.equal(h.storage.get(key),raw);
  }
  const stale=harness(null,{now:'2026-09-17T01:00:00Z'});stale.storage.set(key,JSON.stringify(state()));
  assert.equal(stale.adapter.getForecast().context.mode,'unavailable');assert.equal(stale.adapter.getForecast().entries.length,0);
  const absent=harness(null,{now:'2028-02-05T01:00:00Z'}).adapter.getForecast();
  assert.equal(absent.context.mode,'unavailable');assert.equal(absent.context.sourceYear,null);assert.equal(absent.entries.length,0);
  const actual=harness(state({}, {activeCycle:'2027',selected2027Term:4}),{now:'2026-09-17T01:00:00Z'}).adapter.getForecast({date:'2027-11-01'});
  assert.equal(actual.context.simulation,false);assert.ok(actual.entries.every(entry=>entry.cycle==='2026'));
});

test('forecast refresh uses the Sydney day and reports role/date changes', () => {
  const options={now:'2026-09-16T13:59:00Z'},h=harness(null,options);
  assert.equal(h.adapter.getForecast().context.date,'2026-09-16');
  options.now='2026-09-16T14:01:00Z';assert.equal(h.adapter.getForecast().context.date,'2026-09-17');
  assert.equal(h.events.filter(event=>event.type==='wwhs:forecast-updated').length,1);
  h.api.getState().role='trainer';h.api.saveState();
  assert.equal(h.events.filter(event=>event.type==='wwhs:forecast-updated').length,2);
  assert.equal(h.adapter.getForecast().context.roleLabel,'Trainer / assessor');
});

test('All VET tasks remains complete for every saved role without changing the role-specific forecast or saved work', () => {
  const options={now:'2026-09-22T01:00:00Z'};
  const all=harness(null,options).adapter.getTaskRegister();
  for(const role of ['htvet','coordinator','assistant','trainer','principal','workplace','nesa']){
    const h=harness(state({'c-01-rto-updates':{status:'in-progress',stepChecks:{0:true},exceptionSummary:'Keep this saved note'}},{role,assignments:{'c-01-rto-updates':'VET Coordinator'}}),options);
    const saved=h.storage.get(key),before=JSON.stringify(h.adapter.getForecast());
    const catalogue=h.adapter.getTaskRegister();
    assert.deepEqual(Array.from(catalogue.items,item=>item.id),Array.from(all.items,item=>item.id),role+' must not hide catalogue tasks');
    assert.equal(catalogue.items.filter(item=>item.year==='2026').length,h.data.taskRegister.tasks.length);
    assert.equal(catalogue.roleLabel,'All VET roles');
    assert.equal(JSON.stringify(h.adapter.getForecast()),before,'Daily forecast remains role-specific');
    assert.equal(h.api.getState().role,role);
    assert.equal(h.storage.get(key),saved,'Saved role, notes, assignments and ticks are unchanged');
    assert.equal(h.writes,0);
  }
});

test('blocked 2026 dates automatically expose one next source prerequisite, not the whole chain', () => {
  const h=harness(null,{now:'2026-09-17T01:00:00Z'}),{entries}=h.adapter.getForecast();
  const next=entries.filter(entry=>entry.forecast.kind==='prerequisite');
  assert.equal(next.length,1);assert.equal(next[0].taskId,'a-01-confirm-authority-set');
  assert.equal(next[0].forecast.section,'ready');assert.equal(next[0].dueDate,null);
  assert.match(next[0].forecast.reason,/Needed before/);assert.match(next[0].forecast.reason,/official status/);
  assert.ok(next[0].forecast.prerequisiteFor.length>1);assert.equal(new Set(entries.map(entry=>entry.recordKey)).size,entries.length);
  assert.ok(!entries.some(entry=>entry.taskId==='a-02-build-live-calendar'));
  assert.equal(h.writes,0);
});

test('a role never receives another role prerequisite or a future-window prerequisite', () => {
  const h=harness(state({}, {role:'trainer'}),{now:'2026-09-17T01:00:00Z'});
  const {entries}=h.adapter.getForecast();
  assert.ok(!entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'));
  assert.ok(entries.some(entry=>entry.forecast.section==='waiting'&&/belongs to/.test(entry.forecast.blockerReason)));
  const assigned=harness(state({}, {role:'trainer',assignments:{'a-01-confirm-authority-set':'Trainer/assessor'}}),{now:'2026-09-17T01:00:00Z'});
  assert.ok(assigned.adapter.getForecast().entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'&&entry.forecast.kind==='prerequisite'));
  const future=harness(null,{now:'2026-09-17T01:00:00Z'});future.api.taskById('a-01-confirm-authority-set').windowStart='2026-12-01';
  assert.ok(!future.adapter.getForecast().entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'));
});

test('completed prerequisites advance the next action and cyclic chains terminate', () => {
  const h=harness(null,{now:'2026-09-17T01:00:00Z'});h.api.completeTask('a-01-confirm-authority-set');
  const {entries}=h.adapter.getForecast();
  assert.ok(!entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'));
  assert.ok(!entries.some(entry=>/verify the completed checklist/.test(entry.forecast.blockerReason)));
  assert.match(h.api.dependencyPanel([h.api.taskById('a-01-confirm-authority-set')]),/Prerequisites complete/);
  const cyclic=harness(null,{now:'2026-09-17T01:00:00Z'});cyclic.api.taskById('a-01-confirm-authority-set').dependencies=['t3-05-hsc-estimates'];
  const result=cyclic.adapter.getForecast();assert.ok(result.entries.length<cyclic.data.taskRegister.tasks.length);
  assert.ok(!result.entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'));
});

test('saved verified work still recognises an overall prerequisite sign-off after reload', () => {
  const seed=harness(null,{now:'2026-09-18T01:00:00Z'});
  const parent=seed.data.taskRegister.tasks[0], child=seed.data.taskRegister.tasks.find(task=>task.dependencies?.length===1 && task.dependencies[0]===parent.id);
  assert.ok(child);
  const record={status:'verified',evidenceRef:'Actual reference',verifier:'Actual verifier',sourceChecked:true,doneWhenConfirmed:true,independentVerifierConfirmed:true,stepChecks:Object.fromEntries(child.actionSteps.map((_,index)=>[index,true]))};
  const h=harness(state({[child.id]:record}),{now:'2026-09-18T01:00:00Z',reviewRaw:reviewStore(parent.id)});
  assert.equal(h.api.getStatus(h.api.taskById(child.id)),'verified');
  assert.equal(h.writes,0);
});

test('legacy canonical and scheduled progress keeps old ticks and history while new audit steps need review',()=>{
  const seed=harness(),amended=[seed.data.taskRegister.tasks.find(task=>task.legacyRequirements&&task.actionSteps.length>task.legacyRequirements.steps.length),seed.data.operatingCycle2027.tasks.find(task=>task.legacyRequirements&&task.actionSteps.length>task.legacyRequirements.steps.length)];
  assert.ok(amended.every(Boolean),'Both canonical and scheduled legacy baselines are required');
  for(const task of amended){
    const previous={status:'completed',sourceChecked:true,doneWhenConfirmed:true,stepChecks:Object.fromEntries(task.legacyRequirements.steps.map((_,index)=>[index,true])),exceptionSummary:'My edited note and https://example.test/evidence',evidenceRef:'Original location',history:[{when:'2026-09-23T00:00:00.000Z',action:'Task checklist completed'}]};
    const saved=state({[task.id]:previous}),raw=JSON.stringify(saved),h=harness(raw,{legacyNative:true,now:'2027-09-24T01:00:00Z'}),record=h.api.getRecord(task.id);
    assert.equal(record.status,'in-progress',task.id);assert.equal(record.requirementsReview,true);assert.equal(record.exceptionSummary,previous.exceptionSummary);
    assert.equal(record.evidenceRef,previous.evidenceRef);assert.deepEqual(JSON.parse(JSON.stringify(record.history)),previous.history);
    task.actionSteps.forEach((step,index)=>assert.equal(record.stepChecks[index]===true,task.legacyRequirements.steps.includes(step),`${task.id} step ${index+1}`));
    assert.equal(record.requirementsHistory[0].status,'completed');assert.equal(h.storage.get(key),raw,'Opening the upgraded card does not overwrite stored data');
    h.api.openTask(task.id);assert.match(h.elements.get('task-dialog-content').innerHTML,/Updated steps need review/);
    assert.ok(h.api.saveState());const reloaded=harness(h.storage.get(key),{legacyNative:true,now:'2027-09-24T01:00:00Z'});
    assert.equal(reloaded.api.getRecord(task.id).requirementsHistory.length,1);assert.equal(reloaded.api.getRecord(task.id).exceptionSummary,previous.exceptionSummary);
    const backup=JSON.stringify({kind:'WWHS-VET-COMPLIANCE-WORKBOARD-BACKUP',productId:h.data.config.productId,schemaVersion:3,buildId:h.data.config.buildId,state:JSON.parse(h.storage.get(key))});
    const restored=harness(null,{now:'2027-09-24T01:00:00Z'});restored.api.importWorkspace(backup);
    assert.deepEqual(JSON.parse(JSON.stringify(restored.api.getRecord(task.id).requirementsHistory)),JSON.parse(JSON.stringify(record.requirementsHistory)));
  }
});

test('unstamped old overall reviews do not cover amended steps; current sign-off restores completion',()=>{
  const seed=harness(),task=seed.data.taskRegister.tasks.find(task=>task.legacyRequirements),reviewRaw=JSON.stringify({version:1,records:{[`vet:2026:${encodeURIComponent(task.id)}`]:{completed:true,reviewedOn:'2026-09-24'}}});
  const h=harness(null,{reviewRaw,now:'2026-09-24T01:00:00Z'});
  assert.equal(h.api.externalReview(h.api.taskById(task.id)),null);assert.equal(h.storage.get(reviewKey),reviewRaw);
  assert.equal(h.adapter.getTaskRegister().items.find(item=>item.id===task.id).requirementsReview,true);
  h.storage.set(reviewKey,reviewStore(task.id,true,'2026-09-24'));
  assert.ok(h.api.externalReview(h.api.taskById(task.id)));
});

test('saved event occurrences upgrade their own checklist without changing occurrence identity or notes',()=>{
  const seed=harness(),cycle=seed.data.operatingCycle2027,template=cycle.eventTemplates.find(task=>task.legacyRequirements&&task.actionSteps.length>task.legacyRequirements.steps.length);
  assert.ok(template,'An amended event template is required');
  const occurrence={id:`2027-event-${template.canonicalTaskId}-saved`,templateId:template.id,workflowId:cycle.interruptWorkflows[0],createdAt:'2027-03-01T01:00:00.000Z',term:1};
  const h=harness(state({[occurrence.id]:{status:'completed',sourceChecked:true,doneWhenConfirmed:true,stepChecks:Object.fromEntries(template.legacyRequirements.steps.map((_,index)=>[index,true])),exceptionSummary:'Occurrence-specific working note'}},{eventOccurrences:[occurrence]}),{legacyNative:true,now:'2027-03-02T01:00:00Z'});
  const task=h.api.taskById(occurrence.id),record=h.api.getRecord(occurrence.id);
  assert.equal(task.occurrenceOf,template.id);assert.equal(record.requirementsReview,true);assert.equal(record.status,'in-progress');assert.equal(record.exceptionSummary,'Occurrence-specific working note');
  assert.equal(record.requirementsHistory[0].status,'completed');assert.equal(Object.keys(record.stepChecks).length,template.legacyRequirements.steps.length);
  assert.equal(h.api.getState().eventOccurrences.length,1);assert.equal(h.writes,0);
});
