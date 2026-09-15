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
