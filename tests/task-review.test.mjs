import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/task-review.js';
const review=globalThis.WWHS_TASK_REVIEW;
const items=[];
globalThis.localStorage={getItem:key=>key===review.INBOX_KEY?JSON.stringify({items}):null};

test('saved Done applies only to the matching wing, year and occurrence after its due or follow-up date',()=>{
  items.push({status:'done',origin:{wing:'vet',recordKey:'task'},lastActionOn:'2026-09-18'});
  assert.equal(review.savedCompletion('vet','task',2026,'2026-09-18').method,'task-list');
  for (const args of [['tas','task',2026,'2026-09-18'],['vet','task-next',2026,'2026-09-18'],['vet','task',2027,'2027-09-18'],['vet','task',2026,'2026-09-17'],['vet','task',2026,'2026-09-25','2026-09-25']]) {
    assert.equal(review.savedCompletion(...args),null);
  }
  items[0].status='review';items[0].forecast={sourceStatus:'completed-externally'};
  assert.equal(review.savedCompletion('vet','task',2026,'2026-09-18'),null,'an automatically projected Done must not perpetuate a removed review');
});

test('overall sign-off is reversible and fills applicable steps without manufacturing evidence',()=>{
  const original={status:'in-progress',steps:{0:true},milestones:{},exceptionReason:'Original note',evidenceRef:'Actual ref',verifier:'Actual initials'};
  const tick={year:2026,reviewedOn:'2026-09-18',method:'overall'}, before=JSON.stringify(original);
  const projected=review.project(original,tick,['one','two'],'steps',['milestone']);
  assert.deepEqual(projected.steps,{0:true,1:true});assert.deepEqual(projected.milestones,{0:true});
  assert.equal(projected.evidenceRef,'Actual ref');assert.equal(projected.verifiedOn,undefined);
  assert.equal(JSON.stringify(original),before);assert.equal(review.project(original,null,[],'steps'),original);
  assert.match(review.notes(original.exceptionReason,tick),/^Original note\n\nReviewed complete for 2026 on 2026-09-18/);
  assert.equal(review.notes(review.notes(original.exceptionReason,tick),tick),review.notes(original.exceptionReason,tick));
  assert.throws(()=>review.parse('{"version":1,"records":{"vet:2026:a":{"completed":true,"reviewedOn":"2026-02-30"}}}'));
});
