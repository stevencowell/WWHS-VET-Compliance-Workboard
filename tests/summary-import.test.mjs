import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSummary, safeUrl, linksIn, validateInbox, mergeInbox, prepareTasks} from '../morning-launchpad/assets/summary-core.mjs';

test('summary priorities preserve exact titles and action links without duplicate follow-ups', () => {
  const input = `🧭 Today’s Priority Actions\n1. [Note : Assessment's schedule] — Confirm the schedule in [the document](https://example.org/edit?tab=t.0).\n🎯 Important but Not Urgent\n2. [Note : Equipment] — Review the equipment list.\n📋 Follow-Up Tasks and Priorities\n1. [Note : Assessment's schedule] — Confirm the schedule in [the document](https://example.org/edit?tab=t.0).\n⏳ Waiting On\n[Note : Prices] — Waiting on the supplier`;
  const rows = parseSummary(input);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].title, "Note : Assessment's schedule");
  assert.equal(rows[0].url, 'https://example.org/edit?tab=t.0');
  assert.equal(rows[1].group, 'later');
  assert.equal(rows[2].group, 'waiting');
});
test('raw notes exclude embedded prompt examples and honour personal instructions', () => {
  const text = `Email Summary Master Prompt\nExample: 1. [Note : Example] — Do a fake task\nFinal rules\nDo not invent facts\nNote : Workshop Signage\nNeed to meet with the principal about signage\nRegards, Steve\nFrom: Supplier\nThe quote is attached.\nNote : Student registrations\nAwait student applications\nNote : Receipt\nScannable Document`;
  const rows = parseSummary(text);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].action, 'Need to meet with the principal about signage');
  assert.ok(rows.every(row => row.title !== 'Note : Example'));
  assert.equal(rows.find(row => row.title === 'Note : Student registrations').group, 'waiting');
  assert.equal(rows.find(row => row.title === 'Note : Receipt').group, 'later');
});
test('reimport preserves edited actions and statuses', () => {
  const incoming = parseSummary('Note : Example\nPrepare the resource');
  const first = mergeInbox([], incoming);
  first.items[0].action = 'Prepare one worksheet'; first.items[0].status = 'added';
  const again = mergeInbox(first.items, incoming);
  assert.equal(again.added, 0);
  assert.equal(again.items[0].action, 'Prepare one worksheet');
  assert.equal(again.items[0].status, 'added');
});
test('one atomic addition respects capacity, closed days, duplicates and existing tasks', () => {
  const day = {capacity:'normal', closed:false, tasks:[{title:'Existing task', state:'done'}]};
  const rows = [{title:'Note : A',action:'Do A',url:''},{title:'Note : B',action:'Do B',url:'https://example.org/'}];
  const added = prepareTasks(day,rows,()=> 'id');
  assert.equal(added.length, 2); assert.equal(day.tasks.length, 1);
  assert.equal(added[0].title, '[Note : A] — Do A');
  assert.throws(()=>prepareTasks({...day,capacity:'small'},rows));
  assert.throws(()=>prepareTasks({...day,closed:true},rows));
  assert.equal(prepareTasks({...day,tasks:[...day.tasks,...added]}, rows).length,0);
});
test('untrusted links, malformed backups and arbitrary prose are rejected', () => {
  for(const url of ['javascript:alert(1)','data:text/html,hi','file:///etc/passwd','https://name:password@example.org/']) assert.equal(safeUrl(url),'');
  assert.deepEqual(linksIn('[Doc](https://example.org/a?b=1#part)'), ['https://example.org/a?b=1#part']);
  assert.throws(()=>validateInbox('{"version":1,"items":[{"id":"bad"}]}'));
  assert.throws(()=>parseSummary('Hello, this is some prose.'));
  assert.throws(()=>prepareTasks({capacity:'normal',closed:false,tasks:[]},[{title:'Note',action:'go',url:'javascript:alert(1)'}]));
});

import {enrich, validDate, bucket, reconcilePlans} from '../morning-launchpad/assets/summary-core.mjs';
const rich=(fields={})=>enrich({id:'source-a',taskKey:'task-a',title:'Note : Sample',action:'Check the status',source:'Evidence',...fields});
test('rich files validate dates, enums and migration without changing exact titles',()=>{
  const row=rich({priority:'red',nextAction:'date',dueDate:'2026-10-13',relatedTitles:['Note : Other\u00a0title']});
  assert.equal(validateInbox(JSON.stringify({version:2,items:[row]})).items[0].relatedTitles[0],'Note : Other\u00a0title');
  assert.equal(validateInbox(JSON.stringify({version:1,items:parseSummary('Note : A\nDo this')})).version,2);
  for(const bad of [{priority:'__proto__'},{dueDate:'2026-02-30'},{eventDate:42},{dependsOn:['task-a']}])assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[rich(bad)]})));
  assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2026-02-29'),false);
});
test('AI refresh keeps edited fields and done status, updates unedited fields, preserves local ID',()=>{
  const original=rich({id:'local-1',action:'My revised wording',dueDate:'2026-11-01',priority:'green',status:'done',dirty:['action','dueDate']});
  const next=rich({action:'AI wording',dueDate:'2026-10-20',priority:'red'});
  const result=mergeInbox([original],[next]);assert.equal(result.added,0);assert.equal(result.updated,1);
  assert.equal(result.items[0].id,'local-1');assert.equal(result.items[0].status,'done');assert.equal(result.items[0].action,'My revised wording');assert.equal(result.items[0].dueDate,'2026-11-01');assert.equal(result.items[0].priority,'red');
});
test('multiple actions from the same note remain separate, identical actions with new keys deduplicate',()=>{
  const existing=rich({id:'local'});const rows=[rich({taskKey:'new-key'}),rich({id:'b',taskKey:'task-b',action:'Claim afterwards',dependsOn:['new-key']})];
  const result=mergeInbox([existing],rows);assert.equal(result.items.length,2);assert.equal(result.items[0].taskKey,'task-a');assert.deepEqual(result.items[1].dependsOn,['task-a']);
});
test('basic imports are preserved under Earlier imports; rich records survive old raw reimports',()=>{
  const legacy=parseSummary('Note : Sample\nCheck the status')[0];legacy.action='My old edit';
  const result=mergeInbox([legacy],[rich()]);assert.equal(result.archived,1);assert.equal(result.items[0].action,'My old edit');assert.equal(result.items[0].status,'superseded');
  const repeat=mergeInbox(result.items,[legacy]);assert.equal(repeat.added,0);assert.equal(repeat.items.find(x=>x.taskKey).action,'Check the status');
});
test('future dates, waiting follow-ups and deadlines have distinct scheduling behaviour',()=>{
  const today='2026-09-15';assert.equal(bucket(rich({dueDate:'2026-10-13'}),today),'upcoming');
  assert.equal(bucket(rich({group:'waiting',followUpDate:'2026-09-15'}),today),'ready');
  assert.equal(bucket(rich({group:'waiting',dueDate:'2026-09-14'}),today),'ready');
  assert.equal(bucket(rich({group:'waiting',dateNote:'Email received 1 June'}),today),'waiting');
  assert.equal(bucket(rich({group:'later',dateNote:'ASAP; no date confirmed'}),today),'later');
});
test('daily-plan completion survives refresh and reimport; unfinished tasks return on a new day',()=>{
  const row=rich({id:'local'});const tasks=prepareTasks({capacity:'normal',closed:false,tasks:[]},[row]);assert.equal(tasks[0].id,'summary:local');
  const days={'2026-09-15':{tasks}};let current=reconcilePlans([row],days,'2026-09-15');assert.equal(current.items[0].status,'added');
  current=reconcilePlans(current.items,days,'2026-09-16');assert.equal(current.items[0].status,'review');
  tasks[0].state='done';current=reconcilePlans(current.items,days,'2026-09-16');assert.equal(current.items[0].status,'done');
  current.items=mergeInbox(current.items,[rich({action:'Updated AI wording'})]).items;assert.equal(current.items[0].status,'done');
  assert.equal(reconcilePlans(current.items,days,'2026-09-16').changed,false);
});
test('removing a daily task returns it to review; plan edits and deferrals persist',()=>{
  const row=rich({id:'local',status:'added'});assert.equal(reconcilePlans([row],{},'2026-09-15').items[0].status,'review');
  const days={'2026-09-15':{tasks:[{id:'summary:local',title:'[Note : Sample] — Edited in daily plan',state:'deferred'}]}};
  const result=reconcilePlans([row],days,'2026-09-15');assert.equal(result.items[0].action,'Edited in daily plan');assert.equal(result.items[0].group,'later');assert.ok(result.items[0].dirty.includes('group'));assert.ok(result.items[0].dirty.includes('action'));
});
