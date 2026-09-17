import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {orderTasks,taskGroup} from '../task-sources/model.mjs';

const fixture=[
  {wing:'TAS',id:'tas-setup',phase:'annual',sequence:1},
  {wing:'VET',id:'event',phase:'event_driven',sequence:1},
  {wing:'VET',id:'term1-no-date',phase:'term_1',sequence:1},
  {wing:'VET',id:'term2',phase:'term_2',due2026:'2026-05-01',sequence:1},
  {wing:'VET',id:'term1-late',phase:'term_1',due2026:'2026-04-02',sequence:2},
  {wing:'VET',id:'setup',phase:'annual_setup',sequence:1},
  {wing:'VET',id:'term1-early',phase:'term_1',due2026:'2026-03-17',sequence:3},
  {wing:'VET',id:'ongoing',phase:'continuous',sequence:1},
];
const before=JSON.stringify(fixture);
assert.deepEqual(orderTasks(fixture).map(row=>row.id),['setup','term1-early','term1-late','term1-no-date','term2','ongoing','event','tas-setup']);
assert.equal(JSON.stringify(fixture),before,'Sorting must not alter input records');
assert.equal(taskGroup(fixture[2]),'Term 1 · confirm timing');
assert.equal(taskGroup(fixture[4]),'Term 1 · dated tasks');
const raw=await readFile(new URL('../task-sources/data.json',import.meta.url),'utf8');
const data=JSON.parse(raw);
assert.equal(data.rows.length,126);
assert.equal(data.rows.filter(row=>row.wing==='VET').length,61);
assert.equal(data.rows.filter(row=>row.wing==='TAS').length,65);
assert.equal(new Set(data.rows.map(row=>row.rowKey)).size,126);
assert.deepEqual(data.rows.map(row=>row.id),orderTasks(data.rows).map(row=>row.id));
const sources=new Set(data.sources.map(source=>source.id));
for(const row of data.rows)for(const id of row.sourceIds)assert.ok(sources.has(id),`Missing source ${id}`);
assert.doesNotMatch(raw,/"(?:localPath|localCopy|publicCheck|correctionsRaw|repositoryLocator|codeLocator)"|\b[A-Z]:[\\/]|AppData[\\/]/i);
for(const row of data.rows)for(const source of row.evidenceRefs)if(source.url)assert.match(source.url,/^https:\/\//);
assert.ok(data.findings.find(finding=>finding.id==='TAS-F11').taskIds.includes('t4-enrichment'),'Enrichment task must expose its date finding');
for(const finding of data.findings)for(const id of finding.taskIds)assert.ok(data.rows.some(row=>row.id===id||row.rowKey===id),`Unresolved finding task ${id}`);
console.log('PASS source register chronology, inventory, citation integrity and public-data boundaries');
