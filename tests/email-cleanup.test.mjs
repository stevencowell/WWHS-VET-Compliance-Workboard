import test from 'node:test';
import assert from 'node:assert/strict';
import {enrich,isUnfinishedEmailNote,clearEmailImports,validateInbox,mergeInbox,taskSection,createTrackedWork,reconcileForecast} from '../morning-launchpad/assets/summary-core.mjs';

const email=(id,changes={})=>enrich({id,taskKey:id,title:`Fw: ${id}`,action:'Review this email',source:'Original email',...changes});
const native=wing=>({wing,taskId:'review',recordKey:'review::2026',cycle:'2026',title:'Review work',action:'Check evidence',notes:'Saved workboard note',status:'review',route:'#task/review'});

test('cleanup removes only unfinished Personal email notes and retains every protected record unchanged',async()=>{
  const vet=await createTrackedWork(native('vet')),tas=await createTrackedWork(native('tas'));
  const protectedItems=[email('done',{status:'done',noteText:'Completion evidence'}),email('manual',{personal:true}),
    email('reference',{sectionOverride:'notes'}),email('put-aside',{status:'dismissed'}),email('note',{status:'note'}),
    email('old-done',{status:'superseded',previousStatus:'done'}),email('old-aside',{status:'superseded',previousStatus:'dismissed'}),
    email('vet-mail',{workstream:'vet'}),email('tas-mail',{workstream:'tas'}),vet,tas,
    {...vet,id:'moved',taskKey:'moved',workstream:'personal'},email('legacy-native',{taskKey:'workboard:vet:legacy'})];
  const removable=[email('today'),email('soon',{dueDate:'2027-02-01'}),email('waiting',{group:'waiting'}),email('old-import',{status:'superseded',previousStatus:'review'})];
  const inbox={...validateInbox(null),items:[...removable,...protectedItems],briefing:'Old snapshot',reviewDate:'2026-09-18',generatedAt:'2026-09-18',workboardImports:['vet:review::2026','tas:review::2026']};
  const before=JSON.stringify(inbox);
  const result=clearEmailImports(inbox);
  assert.deepEqual(result.items,protectedItems);
  assert.equal(JSON.stringify(inbox),before,'The source data is not mutated');
  assert.deepEqual(result.workboardImports,inbox.workboardImports);
  assert.deepEqual(result.forecastContexts,inbox.forecastContexts);
  assert.equal(result.briefing,'');assert.equal(result.reviewDate,undefined);assert.equal(result.pinWorkflowVersion,1);
  assert.deepEqual(validateInbox(JSON.stringify(result)).items,protectedItems);
});

test('legacy email defaults are supported and cleanup with only protected work is a no-op',()=>{
  assert.equal(isUnfinishedEmailNote({id:'legacy',title:'Note : Older email',action:'Reply',status:'review'}),true);
  const inbox={...validateInbox(null),items:[email('done',{status:'done'})],briefing:'Completed work'};
  assert.strictEqual(clearEmailImports(inbox),inbox);
});

test('reimport after cleanup keeps completed task identity, notes and Done section',()=>{
  const done=email('stable-completed',{id:'local-done',status:'done',noteText:'Finished already',dirty:['noteText']});
  const clean=clearEmailImports({...validateInbox(null),items:[email('active'),done]});
  const incoming=validateInbox(JSON.stringify({version:2,items:[email('active',{source:'Full refreshed chain'}),email('stable-completed',{source:'Full completed chain',action:'Reworded action',status:'review'})]}));
  const merged=mergeInbox(clean.items,incoming.items);
  assert.equal(merged.added,1);assert.equal(merged.items.length,2);
  const kept=merged.items.find(x=>x.taskKey==='stable-completed');
  assert.equal(kept.id,'local-done');assert.equal(kept.noteText,'Finished already');assert.equal(taskSection(kept),'done');
  assert.equal(kept.source,'Full completed chain');
});

test('forecast and native completion survive email cleanup in their own work area',async()=>{
  const context={wing:'vet',date:'2026-09-18',role:'htvet',roleLabel:'Head Teacher VET',year:2026,sourceYear:2026,sourceAsAt:'2026-09-01',horizonDays:21,mode:'current',title:'Scheduled work',note:''};
  const entry={...native('vet'),forecast:{section:'ready',kind:'term-window',reason:'Scheduled',scheduledDate:'2026-09-18',windowStart:'2026-09-01',windowEnd:'2026-09-30',period:'Term 3',sourceStatus:'verified',blocked:false,blockerReason:''}};
  const forecast=await reconcileForecast(validateInbox(null),{entries:[entry],context});
  const clean=clearEmailImports({...forecast.inbox,items:[email('active'),...forecast.inbox.items]});
  assert.equal(clean.items.length,1);assert.equal(clean.items[0].workstream,'vet');assert.equal(taskSection(clean.items[0]),'done');
  assert.deepEqual(clean.items[0],forecast.inbox.items[0]);assert.deepEqual(clean.forecastContexts,forecast.inbox.forecastContexts);
});
