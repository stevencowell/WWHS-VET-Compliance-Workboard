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

test('explicit early sign-off survives parsing and applies only to its wing, year and occurrence',()=>{
  const entry={completed:true,reviewedOn:'2026-09-20',completedEarly:true};
  const records=review.parse(JSON.stringify({version:1,records:{'vet:2026:term4':entry,'tas:2027:setup':entry}})).records;
  assert.deepEqual(records['vet:2026:term4'],entry);
  assert.equal(review.resolve(records,'vet','term4',2026,'2026-09-20','2026-10-23').completedEarly,true);
  assert.equal(review.resolve(records,'tas','setup',2027,'2026-09-20','2027-02-01').year,2027);
  for(const args of [['tas','term4',2026],['vet','term4',2027],['vet','term4-next',2026]])assert.equal(review.resolve(records,...args,'2026-09-20'),null);
  assert.equal(review.resolve(records,'vet','term4',2026,'2026-09-19'),null,'A future review timestamp is still invalid');
  records['vet:2026:term4'].completed=false;
  assert.equal(review.resolve(records,'vet','term4',2026,'2026-09-20','2026-10-23'),null);
  assert.throws(()=>review.parse(JSON.stringify({version:1,records:{'vet:2026:term4':{...entry,completedEarly:'yes'}}})),/early completion/);
});

test('legacy ticks still cannot complete future work or a later recurrence implicitly',()=>{
  const records={'vet:2026:task':{completed:true,reviewedOn:'2026-09-20'},'vet:2027:task':{completed:true,reviewedOn:'2026-09-20'}};
  assert.equal(review.resolve(records,'vet','task',2026,'2026-09-20','2026-10-23'),null);
  assert.equal(review.resolve(records,'vet','task',2027,'2026-09-20'),null);
  assert.equal(review.resolve(records,'vet','task',2026,'2026-10-23','2026-10-23'),null);
  assert.equal(review.resolve(records,'vet','task',2026,'2026-09-20').method,'overall');
});
