import test from 'node:test';
import assert from 'node:assert/strict';
import {storageSizes} from '../assets/js/team-storage-report.mjs';

test('storage report exposes counts only and never changes saved records',()=>{
  const inbox='morning-launchpad-summary:v1',meta='wwhs-team-handover:v1';
  const values=new Map([[inbox,'PRIVATE_EMAIL_CONTENT'],['private-account-name','PRIVATE_FINANCE_RECORD'],[meta,'SAVED_SESSION']]);
  const before=new Map(values),storage={get length(){return values.size;},key:index=>[...values.keys()][index],getItem:key=>values.get(key)??null,setItem(){throw Error('Report must not write');},removeItem(){throw Error('Report must not remove');}};
  const report=storageSizes(storage,{[meta]:'SAVED_SESSION'},{[meta]:'SMALL'});
  assert.equal(report.rows.find(row=>row.label==='Team session').after,5);
  assert.equal(report.rows.find(row=>row.label==='Other saved website data').saved,'PRIVATE_FINANCE_RECORD'.length);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_|private-account-name|SAVED_SESSION|SMALL/);
  assert.deepEqual(values,before);
});
