import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('assets/js/app-v2.js', root), 'utf8');
const key = 'wwhs-vet-compliance-workboard:v3';
const state = (records = {}, extra = {}) => ({schemaVersion:3, linkDefaultsVersion:2, records, ...extra});

function harness(saved = null, options = {}) {
  const storage = new Map(saved === null ? [] : [[key, typeof saved === 'string' ? saved : JSON.stringify(saved)]]);
  const events = [], notices = [], listeners = new Map(), elements = new Map();
  let writes = 0;
  const TestDate = options.now ? class extends Date {
    constructor(...args){super(...(args.length?args:[options.now]));}
    static now(){return new Date(options.now).getTime();}
  } : Date;
  const element = () => ({
    innerHTML:'', textContent:'', open:false, hidden:false, dataset:{},
    classList:{toggle(){}, remove(){}, contains(){return false;}},
    setAttribute(){}, removeAttribute(){}, focus(){}, remove(){},
    querySelector(){return null;}, querySelectorAll(){return [];},
    addEventListener(){}, appendChild(child){notices.push(child.textContent);},
    showModal(){this.open=true;}, close(){this.open=false;}
  });
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
    addEventListener(){}, setInterval(){},
    dispatchEvent(event){events.push(event);return true;}
  };
  const context = vm.createContext({
    window, document, URLSearchParams, URL, Date: TestDate, console,
    location:{hash:'#my-work',search:''}, history:{replaceState(){}},
    CSS:{escape:value=>value}, queueMicrotask:callback=>callback(), setTimeout(){},
    CustomEvent:class { constructor(type, init={}){this.type=type;this.detail=init.detail;} },
    localStorage:{
      getItem(name){if(options.readError) throw new Error('unavailable');return storage.get(name) ?? null;},
      setItem(name,value){if(options.writeError) throw new Error('quota');writes++;storage.set(name,value);},
      removeItem(name){storage.delete(name);}
    },
    FileReader:class {readAsText(value){this.result=value;this.onload();}}
  });
  for(const file of ['config.js','tasks.js','term1-2027.js','reference.js']) {
    vm.runInContext(fs.readFileSync(new URL('assets/js/data/'+file,root),'utf8'),context);
  }
  const initialisation = '  syncRoleFilters(); updateGuidanceToggle(); render();\n})();';
  assert.ok(source.includes(initialisation), 'test harness must replace the single final app initialisation');
  vm.runInContext(source.replace(initialisation, `  window.__test = {
    getState:()=>state, saveState, completeTask, undoTaskCompletion, importWorkspace,
    taskCard, focusTask, cycleFocusTask, workflowTaskButtons, openTask, currentView,
    isClosed, cycleGateState, taskById, createEventOccurrence
  };\n})();`),context);
  return {
    adapter:window.WWHS_WORKBOARD_ADAPTER, api:window.__test, data:window.VET_WORKBOARD,
    storage, events, notices, elements, options, get writes(){return writes;},
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

test('native personal completion projects Done but cannot close a formal gate', () => {
  const h=harness(), task=h.data.operatingCycle2027.tasks[0], before=h.api.cycleGateState(task.gate).closed;
  h.api.completeTask(task.id);
  assert.equal(h.adapter.getEntries().length,1);
  assert.equal(h.adapter.describeTask(task.id).status,'done');
  assert.equal(h.adapter.describeTask(task.id).sourceStatus,'completed');
  assert.equal(h.api.isClosed(task),false);assert.equal(h.api.cycleGateState(task.gate).closed,before);
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
  assert.match(week.forecast.blockerReason,/prerequisite|gate/i);
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
  assert.equal(h.api.isClosed(h.api.taskById(id)),false);
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

test('completed prerequisites still require native verification and cyclic chains terminate', () => {
  const h=harness(null,{now:'2026-09-17T01:00:00Z'});h.api.completeTask('a-01-confirm-authority-set');
  const {entries}=h.adapter.getForecast();
  assert.ok(!entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'));
  assert.ok(entries.some(entry=>/verify the completed checklist/.test(entry.forecast.blockerReason)));
  assert.ok(!entries.some(entry=>entry.taskId==='a-02-build-live-calendar'));
  const cyclic=harness(null,{now:'2026-09-17T01:00:00Z'});cyclic.api.taskById('a-01-confirm-authority-set').dependencies=['t3-05-hsc-estimates'];
  const result=cyclic.adapter.getForecast();assert.ok(result.entries.length<cyclic.data.taskRegister.tasks.length);
  assert.ok(!result.entries.some(entry=>entry.taskId==='a-01-confirm-authority-set'));
});
