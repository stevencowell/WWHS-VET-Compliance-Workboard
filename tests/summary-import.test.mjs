import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSummary, safeUrl, linksIn, validateInbox, mergeInbox, prepareTasks, taskSection} from '../morning-launchpad/assets/summary-core.mjs';

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
test('AI tasks also retain superseded basic entries from explicitly related notes',()=>{
  const basic=parseSummary('Note : Old schedule\nComplete training');
  const result=mergeInbox(basic,[rich({relatedTitles:['Note : Old\u00a0schedule']})]);
  assert.equal(result.archived,1);assert.equal(result.items[0].title,'Note : Old schedule');assert.equal(result.items[0].action,'Complete training');assert.equal(result.items[0].status,'superseded');
});

import {sameSourceAction,consolidateDuplicates,matchesPlanTask} from '../morning-launchpad/assets/summary-core.mjs';
test('combined source titles and an empty Link label match the structured task',()=>{
  const structured=rich({title:'Note : Amended schedule',relatedTitles:['Note : New schedule'],action:'Confirm whether accepted.'});
  const plain=enrich({id:'old',title:'Note : Amended schedule + Note : New schedule',action:'Confirm whether accepted.\nLink:',source:'Old text'});
  assert.ok(sameSourceAction(structured,plain));
  assert.equal(mergeInbox([structured],[plain]).added,0);
  const result=consolidateDuplicates([structured,plain]);assert.equal(result.archived,1);assert.equal(result.items[1].status,'superseded');assert.equal(result.items[1].source,'Old text');
  assert.equal(consolidateDuplicates(result.items).archived,0);
});
test('separate tasks from one note are never collapsed just for sharing a title',()=>{
  const a=rich({action:'Complete training'});const b=enrich({id:'b',title:a.title,action:'Claim payment',source:'Training and claim'});
  assert.equal(sameSourceAction(a,b),false);assert.equal(consolidateDuplicates([a,b]).archived,0);
});
test('consolidation retains completion, explicit field edits and daily-plan aliases',()=>{
  const a=rich({action:'Check status'});const b=enrich({id:'old',title:a.title,action:a.action,status:'done',dueDate:'2026-10-20',dirty:['dueDate'],source:'Old evidence'});
  let result=consolidateDuplicates([a,b]);assert.equal(result.items[0].status,'done');assert.equal(result.items[0].dueDate,'2026-10-20');assert.equal(result.items[1].previousStatus,'done');
  const day={capacity:'normal',closed:false,tasks:[{id:'summary:old',title:'Old daily title',state:'todo'}]};assert.ok(matchesPlanTask(result.items[0],day.tasks[0]));assert.equal(prepareTasks(day,[result.items[0]]).length,0);
  result=reconcilePlans(result.items,{'2026-09-15':day},'2026-09-15');assert.equal(result.items[0].status,'done');assert.equal(reconcilePlans(result.items,{'2026-09-15':day},'2026-09-15').changed,false);
});


test('personal reference notes survive backup and AI imports without becoming tasks', () => {
 const personal={id:'my-note',taskKey:'personal:my-note',personal:true,title:'Note : Equipment',source:'My own reference',action:'',status:'note'};
 const saved=validateInbox(JSON.stringify({version:2,items:[personal]}));
 assert.equal(saved.items[0].source,'My own reference');
 assert.equal(saved.items[0].status,'note');
 const merged=mergeInbox(saved.items,[{id:'ai',taskKey:'ai-equipment',title:personal.title,action:'Check equipment',source:'My own reference'}]);
 assert.equal(merged.items.length,2);
 assert.equal(merged.items.find(x=>x.personal).status,'note');
 const restored=validateInbox(JSON.stringify({version:2,items:merged.items}));
 assert.equal(restored.items.filter(x=>x.personal).length,1);
 assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...personal,personal:false}]})));
});


import {migrateToPins,isPinned} from '../morning-launchpad/assets/summary-core.mjs';
test('daily planner migration keeps task progress, imports manual work and runs only once',()=>{
 const today='2026-09-15';
 const chosen=rich({id:'chosen',status:'added'});
 const complete=rich({id:'finished',taskKey:'finished',title:'Finished note',status:'done'});
 const raw=JSON.stringify({version:1,days:{[today]:{tasks:[
  {id:'summary:chosen',title:`[${chosen.title}] — ${chosen.action}`,state:'todo'},
  {id:'summary:finished',title:`[${complete.title}] — ${complete.action}`,state:'todo'},
  {id:'manual',title:'Order workshop supplies',state:'todo',url:'https://example.org/order'}
 ]},'2026-09-14':{tasks:[{id:'old-manual',title:'Order workshop supplies',state:'todo'},{id:'old',title:'Completed old action',state:'done'}]}}});
 const original={version:2,items:[chosen,complete]};const result=migrateToPins(original,raw,today);
 const checked=validateInbox(JSON.stringify(result.inbox));
 assert.equal(checked.items.length,4);assert.equal(original.items[0].status,'added');
 assert.equal(checked.items.find(x=>x.id==='chosen').status,'review');assert.ok(isPinned(checked.items.find(x=>x.id==='chosen'),today));
 assert.equal(checked.items.find(x=>x.id==='finished').status,'done');
 const manual=checked.items.find(x=>x.action==='Order workshop supplies');assert.ok(isPinned(manual,today));assert.equal(manual.url,'https://example.org/order');
 assert.equal(checked.items.find(x=>x.action==='Completed old action').status,'done');
 assert.equal(migrateToPins(checked,raw,'2026-09-16').changed,false);
 assert.equal(isPinned(manual,'2026-09-16'),false);
});
test('pins survive refresh and import without reopening completed tasks',()=>{
 const pinned=rich({pinnedDate:'2026-09-15',dirty:['pinnedDate']});
 const updated=mergeInbox([pinned],[rich({priority:'blue',pinnedDate:null})]).items[0];
 assert.ok(isPinned(updated,'2026-09-15'));assert.equal(updated.priority,'blue');
 const backup=validateInbox(JSON.stringify({version:2,pinWorkflowVersion:1,items:[updated]}));assert.ok(isPinned(backup.items[0],'2026-09-15'));
 assert.equal(isPinned({...updated,status:'done'},'2026-09-15'),false);
 assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...updated,pinnedDate:'2026-02-31'}]})));
});
test('unreadable older plans leave existing tasks usable and original data untouched',()=>{
 const before={version:2,items:[rich({status:'done'})]};const raw='{broken original';const result=migrateToPins(before,raw,'2026-09-15');
 assert.match(result.warning,/could not be read/);assert.equal(result.inbox.items[0].status,'done');assert.equal(raw,'{broken original');
});

test('note dates survive imports and backups without treating a refresh as an action', async () => {
 const {enrich,recordNoteAction,todaySydney}=await import('../morning-launchpad/assets/summary-core.mjs');
 const incoming=enrich({id:'date-test',taskKey:'date-test',title:'Date test',action:'Follow up'});
 const created=mergeInbox([], [incoming]).items[0];
 assert.equal(created.createdOn,todaySydney());
 assert.equal(created.lastActionOn,null);
 const edited=recordNoteAction({...created,createdOn:'2026-09-01'},{status:'done'},'2026-09-15');
 assert.equal(edited.lastActionOn,'2026-09-15');
 assert.equal(recordNoteAction(edited,{status:'done'},'2026-09-16').lastActionOn,'2026-09-15');
 const refreshed=mergeInbox([edited],[{...incoming,createdOn:'2026-09-16',lastActionOn:'2026-09-16'}]).items[0];
 assert.equal(refreshed.createdOn,'2026-09-01');
 assert.equal(refreshed.lastActionOn,'2026-09-15');
 assert.equal(validateInbox(JSON.stringify({version:2,items:[refreshed]})).items[0].lastActionOn,'2026-09-15');
 assert.equal(validateInbox(JSON.stringify({version:2,items:[incoming]})).items[0].createdOn,null);
 assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...incoming,lastActionOn:'bad date'}]})));
});
test('original email links are optional, safe and preserved with user edits on reimport', () => {
 const raw={version:2,items:[{id:'email-link',taskKey:'email-link',title:'Email',action:'Review',source:'Message'}]};
 const old=validateInbox(JSON.stringify(raw)).items[0];
 assert.equal(old.originalEmailUrl,'');
 const url='https://outlook.cloud.microsoft/mail/id/example';
 const saved={...old,originalEmailUrl:url,dirty:['originalEmailUrl']};
 const merged=mergeInbox([saved],[old]).items[0];
 assert.equal(merged.originalEmailUrl,url);
 assert.equal(validateInbox(JSON.stringify({version:2,items:[merged]})).items[0].originalEmailUrl,url);
 for(const bad of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com/']){
  assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...old,originalEmailUrl:bad}]})));
 }
});

test('manual sections survive refresh and reimport without discarding dates', async()=>{
 const {enrich,bucket}=await import('../morning-launchpad/assets/summary-core.mjs');
 const item=enrich({id:'manual',taskKey:'manual',title:'Manual move',action:'Review',dueDate:'2026-09-01',sectionOverride:'later',dirty:['sectionOverride']});
 assert.equal(bucket(item,'2026-09-16'),'later');
 const restored=validateInbox(JSON.stringify({version:2,items:[item]})).items[0];
 assert.equal(restored.sectionOverride,'later');
 const merged=mergeInbox([restored],[{...item,sectionOverride:'',dirty:[]}]).items[0];
 assert.equal(merged.sectionOverride,'later');
 assert.equal(merged.dueDate,'2026-09-01');
 assert.equal(bucket({...item,sectionOverride:'upcoming',dueDate:null}),'upcoming');
 assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...item,sectionOverride:'unknown'}]})));
});


test('each task has one section across dates, pins, personal notes and completion',()=>{
  const today='2026-09-16';
  const base={status:'review',group:'waiting',action:'Follow up',personal:false};
  const cases=[
    [{...base,dueDate:'2026-10-01'},'waiting'],
    [{...base,followUpDate:today},'ready'],
    [{...base,dueDate:today},'ready'],
    [{...base,pinnedDate:today,dueDate:'2026-10-01'},'ready'],
    [{...base,group:'later',dueDate:'2026-10-01'},'upcoming'],
    [{...base,personal:true,group:'ready'},'ready'],
    [{...base,personal:true,action:'',status:'note'},'notes'],
    [{...base,sectionOverride:'later',dueDate:today},'upcoming'],
    [{...base,status:'done',sectionOverride:'ready',dueDate:today},'done'],
    [{...base,status:'dismissed',sectionOverride:'waiting'},'notes'],
    [{...base,status:'superseded'},'superseded'],
    [{...base,group:'later'},'upcoming']
  ];
  for(const [item,expected] of cases){
    assert.equal(taskSection(item,today),expected);
    assert.equal(['ready','upcoming','waiting','later','notes','done','dismissed','superseded'].filter(key=>taskSection(item,today)===key).length,1);
  }
});


test('working notes survive backups and reimports, including deliberate clearing',()=>{
  const [item]=parseSummary('Note : Showcase\nPrepare the display');
  const initial=validateInbox(JSON.stringify({version:2,items:[item]})).items[0];
  assert.equal(initial.noteText,'');
  const edited={...initial,noteText:'Draft email\nMorning all,\nhttps://example.org/plan',dirty:['noteText']};
  const restored=validateInbox(JSON.stringify({version:2,items:[edited]})).items[0];
  assert.equal(restored.noteText,edited.noteText);
  assert.equal(mergeInbox([restored],[initial]).items[0].noteText,edited.noteText);
  assert.equal(mergeInbox([{...restored,noteText:''}],[{...initial,noteText:'Old draft'}]).items[0].noteText,'');
  assert.throws(()=>validateInbox(JSON.stringify({version:2,items:[{...initial,noteText:'x'.repeat(20001)}]})));
});
