import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestEmail} from '../morning-launchpad/assets/email-rules.mjs';
import {validateInbox,mergeInbox} from '../morning-launchpad/assets/summary-core.mjs';
const suggest=(text,options={})=>suggestEmail(text,{today:'2026-09-16',...options});

test('pasted full email chains retain text beyond the previous extract limit',()=>{
 const source='Subject: Chain\n\nPlease review this request.\n'+('Earlier reply\n'.repeat(2500))+'Final supplied reply';
 const item=suggest(source);assert.equal(item.source,source);
 assert.equal(validateInbox(JSON.stringify({version:2,items:[item]})).items[0].source,source);
 assert.throws(()=>suggest('x'.repeat(200001)),/Your pasted text has been kept/);
});
test('one pasted email keeps its source and suggests a request and explicit Australian deadline',()=>{
 const source='From: Example Teacher\nSent: 14 September 2026\nSubject: Assessment schedule\n\nHi Steve,\nPlease send the assessment schedule by 18 September 2026.\nRegards,\nExample Teacher';
 const x=suggest(source);assert.equal(x.title,'Assessment schedule');assert.equal(x.action,'Please send the assessment schedule by 18 September 2026.');assert.equal(x.dueDate,'2026-09-18');assert.equal(x.source,source);assert.equal(x.group,'ready');assert.equal(x.priority,'green');
 assert.equal(validateInbox(JSON.stringify({version:2,items:[x]})).items.length,1);
});
test('relative wording and email timestamps never silently become calendar deadlines',()=>{
 const x=suggest('Sent: 15 September 2026\nSubject: Urgent reply\nPlease reply tomorrow.');assert.equal(x.dueDate,null);assert.equal(x.priority,'blue');assert.match(x.dateNote,/Relative/);
 const y=suggest('Date: 16 September 2026\nSubject: Weekly update\nHere is the latest information.');assert.equal(y.dueDate,null);assert.equal(y.eventDate,null);assert.equal(y.group,'later');
});
test('your instruction overrides quoted requests and not-urgent wording is respected',()=>{
 const x=suggest('Subject: Timetable\nPlease finish today.\nFrom: Earlier sender\nSubject: Old deadline\nPlease respond by 12 September 2026.',{instruction:'Waiting on Chris to confirm'});assert.equal(x.group,'waiting');assert.equal(x.action,'Waiting on Chris to confirm');assert.equal(x.dueDate,null);
 const y=suggest('Subject: Not urgent\nPlease read this when convenient.');assert.equal(y.priority,'green');
 const reply=suggest('Please review this draft.\n\nFrom: Earlier sender\nSubject: Old request\nPlease finish by 12 September 2026.');assert.equal(reply.dueDate,null);assert.equal(reply.action,'Please review this draft.');
 const z=suggest('Subject: Update\nPlease review the draft.\nFrom: Earlier sender\nPlease complete by 12 September 2026.');assert.equal(z.dueDate,null);
});
test('conflicting or invalid dates need review and event dates stay distinct from deadlines',()=>{
 const x=suggest('Subject: Return forms\nPlease return one by 18 September 2026 and the other by 21 September 2026.');assert.equal(x.dueDate,null);assert.match(x.dateNote,/Multiple/);
 assert.equal(suggest('Subject: Return forms\nPlease return by 31/02/2026.').dueDate,null);
 const y=suggest('Subject: Staff meeting\nPlease attend the meeting on 21 October 2026.');assert.equal(y.eventDate,'2026-10-21');assert.equal(y.dueDate,null);
});
test('safe visible URLs are retained, promotional text is for later, and excessive input is rejected',()=>{
 const x=suggest('Subject: Newsletter\nSpecial offer this week. Unsubscribe https://example.com/news');assert.equal(x.group,'later');assert.equal(x.priority,'purple');assert.deepEqual(x.links,['https://example.com/news']);
 assert.throws(()=>suggest(''));assert.throws(()=>suggest('a'.repeat(200001)));
});
test('repeat capture preserves existing completion and reviewed edits',()=>{
 const x={...suggest('Subject: Update\nPlease review this document.'),taskKey:'email:stable',dirty:['action','priority']};
 const saved=mergeInbox([],[x]).items.map(e=>({...e,status:'done',action:'My revised action',priority:'yellow'}));
 const again=mergeInbox(saved,[x]);assert.equal(again.added,0);assert.equal(again.items[0].status,'done');assert.equal(again.items[0].action,'My revised action');assert.equal(again.items[0].priority,'yellow');
});
