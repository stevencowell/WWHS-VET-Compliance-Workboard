'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createStorage, encode, decode, KEYS} = require('../assets/js/workboard-storage.js');

const INBOX = 'morning-launchpad-summary:v1';
const CALENDAR = 'morning-launchpad-calendar:v1';
const VET = 'wwhs-vet-compliance-workboard:v3';
const TAS = 'wwhs-head-teacher-tas-workboard:v2';
const REVIEW = 'wwhs-task-register-review:v1';
const OTHER = 'unrelated-private-storage:v1';
const size = values => [...values].reduce((sum, [key, value]) => sum + key.length + value.length, 0);
const large = label => JSON.stringify({version: 1, label, text: 'Synthetic task with exact Unicode: café, 日本語, 🐟, e\u0301. '.repeat(1800)});

class NativeStorage {
  constructor(entries = []) {
    this.values = new Map(entries);
    this.capacity = Infinity;
    this.attempts = [];
    this.removals = [];
    this.clears = 0;
    this.failSet = null;
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(String(key)) ?? null; }
  setItem(key, value) {
    key = String(key); value = String(value);
    this.attempts.push({key, value});
    if (this.failSet) this.failSet(key, value);
    const next = new Map(this.values);
    next.set(key, value);
    if (size(next) > this.capacity) throw new DOMException('Synthetic storage quota reached', 'QuotaExceededError');
    this.values = next;
  }
  removeItem(key) { this.removals.push(String(key)); this.values.delete(String(key)); }
  clear() { this.clears++; this.values.clear(); }
}

function logicalSnapshot(storage, keys) {
  return Object.fromEntries(keys.map(key => [key, storage.getItem(key)]));
}

test('compression is restricted to the five shared workboard record keys', () => {
  assert.deepEqual([...KEYS].sort(), [INBOX, CALENDAR, VET, TAS, REVIEW].sort());
  const original = large('allowlisted fixture');
  for (const key of KEYS) {
    const packed = encode(key, original);
    assert.match(packed, /^WWHS-LZ1:/);
    assert.ok(packed.length < original.length);
    assert.equal(decode(key, packed), original);
  }
  for (const key of [OTHER, 'finance_studio_dataset_v3', 'morning-launchpad-summary:v2', 'wwhs-team-handover:v1']) {
    assert.equal(encode(key, original), original);
    const prefixLikeUserValue = 'WWHS-LZ1:not-a-compressed-record';
    assert.equal(decode(key, prefixLikeUserValue), prefixLikeUserValue);
  }
});

test('short strings stay plain and non-beneficial compression never expands storage', () => {
  for (const original of ['', '{}', JSON.stringify({notes: 'A small note 🐟'})]) {
    assert.equal(encode(INBOX, original), original);
  }
  const wideCharacters = Array.from({length: 40000}, (_, i) => String.fromCharCode(0x1000 + i)).join('');
  const encoded = encode(INBOX, wideCharacters);
  assert.ok(encoded.length <= wideCharacters.length);
  assert.equal(decode(INBOX, encoded), wideCharacters);
});

test('Unicode, control characters and isolated surrogates round-trip exactly', () => {
  const original = ('\u0000\u0001\r\n\t café 日本語 🐟 e\u0301 \ud800 end \udfff ').repeat(3000);
  const packed = encode(INBOX, original);
  assert.match(packed, /^WWHS-LZ1:/);
  assert.equal(decode(INBOX, packed), original);
  assert.equal(decode(INBOX, packed).length, original.length);
});

test('legacy plain values can be read without migrating or writing anything', () => {
  const original = large('legacy plain');
  const native = new NativeStorage([[INBOX, original], [OTHER, 'Unrelated content']]);
  const storage = createStorage(native);
  assert.equal(storage.getItem(INBOX), original);
  assert.equal(storage.getItem(OTHER), 'Unrelated content');
  assert.equal(storage.getItem(CALENDAR), null);
  assert.equal(native.attempts.length, 0);
  assert.equal(native.removals.length, 0);
  assert.equal(native.clears, 0);
});

test('compressed reads provide original plain JSON for existing backup and conflict checks', () => {
  const original = large('backup equality');
  const native = new NativeStorage();
  const storage = createStorage(native);
  storage.setItem(INBOX, original);
  assert.notEqual(native.getItem(INBOX), original);
  assert.equal(storage.getItem(INBOX), original);
  assert.deepEqual(JSON.parse(storage.getItem(INBOX)), JSON.parse(original));
  const before = native.getItem(INBOX);
  storage.getItem(INBOX);
  assert.equal(native.getItem(INBOX), before);
  assert.equal(native.attempts.length, 1);
});

test('malformed or truncated compressed records fail closed without clearing saved data', () => {
  const packed = encode(INBOX, large('truncation fixture'));
  const wrongChecksum = packed.replace(/^(WWHS-LZ1:\d+:)([a-f0-9])/, (_, head, first) => head + (first === '0' ? '1' : '0'));
  for (const malformed of ['WWHS-LZ1:', 'WWHS-LZ1:not-a-valid-record', packed.replace('WWHS-LZ1:', 'WWHS-LZ2:'), wrongChecksum, packed.slice(0, Math.floor(packed.length / 2))]) {
    const native = new NativeStorage([[INBOX, malformed]]);
    const storage = createStorage(native);
    assert.throws(() => decode(INBOX, malformed));
    assert.throws(() => storage.getItem(INBOX));
    assert.equal(native.getItem(INBOX), malformed);
    assert.equal(native.attempts.length, 0);
    assert.equal(native.removals.length, 0);
    assert.equal(native.clears, 0);
  }
});

test('quota recovery does not overwrite a candidate changed independently after its first failed write', () => {
  const existingVet = large('existing saved VET');
  const native = new NativeStorage([[INBOX, 'old task list'], [VET, existingVet]]);
  const storage = createStorage(native);
  let first = true;
  native.failSet = key => {
    if (key === INBOX && first) {
      first = false;
      native.values.set(INBOX, 'new work from another tab');
      throw new DOMException('Synthetic initial quota failure', 'QuotaExceededError');
    }
  };
  assert.throws(() => storage.setItem(INBOX, large('stale replacement')), /changed.*another tab/i);
  assert.equal(storage.getItem(INBOX), 'new work from another tab');
  assert.equal(storage.getItem(VET), existingVet);
  assert.equal(native.attempts.filter(entry => entry.key === INBOX).length, 1);
  assert.equal(native.removals.length, 0);
});

test('quota recovery leaves an unreadable compressed neighbour untouched', () => {
  const corrupt = 'WWHS-LZ1:broken-saved-progress';
  const native = new NativeStorage([[INBOX, 'old list'], [VET, corrupt], [OTHER, 'keep']]);
  const storage = createStorage(native);
  native.capacity = size(native.values);
  assert.throws(() => storage.setItem(INBOX, large('cannot fit')), {name: 'QuotaExceededError'});
  assert.equal(native.getItem(VET), corrupt);
  assert.equal(storage.getItem(INBOX), 'old list');
  assert.equal(storage.getItem(OTHER), 'keep');
  assert.ok(native.attempts.every(entry => entry.key !== VET));
  assert.equal(native.removals.length, 0);
});

test('an unrecoverable native quota failure keeps the previous candidate and unrelated records', () => {
  const native = new NativeStorage([[INBOX, '{"old":"kept"}'], [OTHER, 'Untouched saved content']]);
  native.capacity = size(native.values);
  const storage = createStorage(native);
  const before = new Map(native.values);
  assert.throws(() => storage.setItem(INBOX, large('cannot fit')), {name: 'QuotaExceededError'});
  assert.deepEqual(native.values, before);
  assert.equal(storage.getItem(INBOX), '{"old":"kept"}');
  assert.equal(native.removals.length, 0);
  assert.equal(native.clears, 0);
});

test('quota recovery compacts existing allowlisted records and retries without losing logical data', () => {
  const existingVet = large('existing VET'), existingTas = large('existing TAS');
  const unrelated = large('unrelated private record');
  const native = new NativeStorage([[VET, existingVet], [TAS, existingTas], [OTHER, unrelated]]);
  native.capacity = size(native.values);
  const storage = createStorage(native);
  const incoming = large('new shared task list');
  storage.setItem(INBOX, incoming);
  assert.ok(native.attempts.filter(entry => entry.key === INBOX).length >= 2, 'the first full-store write must be retried');
  assert.deepEqual(logicalSnapshot(storage, [VET, TAS, OTHER, INBOX]), {
    [VET]: existingVet, [TAS]: existingTas, [OTHER]: unrelated, [INBOX]: incoming,
  });
  assert.ok(native.getItem(VET) !== existingVet || native.getItem(TAS) !== existingTas);
  assert.equal(native.getItem(OTHER), unrelated);
  assert.ok(native.attempts.every(entry => entry.key !== OTHER));
  assert.equal(native.removals.length, 0);
  assert.equal(native.clears, 0);
});

test('unsuccessful retry may compact records but preserves every original logical value', () => {
  const existingVet = large('compressible saved progress');
  const unrelated = 'unrelated'.repeat(100);
  const native = new NativeStorage([[INBOX, 'old list'], [VET, existingVet], [OTHER, unrelated]]);
  const storage = createStorage(native);
  const original = logicalSnapshot(storage, [INBOX, VET, OTHER]);
  native.failSet = key => { if (key === INBOX) throw new DOMException('Candidate always exceeds quota', 'QuotaExceededError'); };
  assert.throws(() => storage.setItem(INBOX, large('blocked replacement')), {name: 'QuotaExceededError'});
  assert.deepEqual(logicalSnapshot(storage, [INBOX, VET, OTHER]), original);
  assert.equal(native.getItem(OTHER), unrelated);
  assert.equal(native.removals.length, 0);
  assert.equal(native.clears, 0);
});

test('non-quota write failures propagate without compacting other saved records', () => {
  const existingVet = large('must stay byte-identical');
  const native = new NativeStorage([[VET, existingVet], [INBOX, 'old value']]);
  const error = new DOMException('Synthetic access denied', 'SecurityError');
  native.failSet = () => { throw error; };
  const storage = createStorage(native);
  assert.throws(() => storage.setItem(INBOX, large('new value')), failure => failure === error);
  assert.equal(native.attempts.length, 1);
  assert.equal(native.getItem(VET), existingVet);
  assert.equal(native.getItem(INBOX), 'old value');
});

test('unrelated writes stay exact and do not trigger compaction of shared records', () => {
  const existingVet = large('saved VET');
  const native = new NativeStorage([[VET, existingVet]]);
  const storage = createStorage(native);
  const original = large('unrelated incoming record');
  storage.setItem(OTHER, original);
  assert.equal(native.getItem(OTHER), original);
  native.capacity = size(native.values);
  assert.throws(() => storage.setItem(OTHER, original + 'larger'), {name: 'QuotaExceededError'});
  assert.equal(native.getItem(VET), existingVet);
  assert.ok(native.attempts.every(entry => entry.key === OTHER));
});

test('physical-size estimates include key characters and agree with saved representation', () => {
  const native = new NativeStorage([[VET, 'legacy plain']]);
  const storage = createStorage(native);
  assert.equal(storage.storedSize(VET), VET.length + 'legacy plain'.length);
  assert.equal(storage.storedSize(INBOX), 0);
  assert.equal(storage.encodedSize(INBOX, null), 0);
  for (const [key, original] of [[INBOX, large('prediction')], [CALENDAR, '{}'], [OTHER, large('unrelated prediction')]]) {
    const predicted = storage.encodedSize(key, original);
    assert.equal(predicted, key.length + encode(key, original).length);
    storage.setItem(key, original);
    assert.equal(storage.storedSize(key), predicted);
    assert.equal(storage.storedSize(key), key.length + native.getItem(key).length);
  }
});

test('external native mutations are seen immediately without an adapter cache', () => {
  const native = new NativeStorage([[INBOX, 'initial']]);
  const storage = createStorage(native);
  assert.equal(storage.getItem(INBOX), 'initial');
  const changed = large('saved elsewhere');
  native.setItem(INBOX, encode(INBOX, changed));
  assert.equal(storage.getItem(INBOX), changed);
  assert.equal(storage.storedSize(INBOX), INBOX.length + native.getItem(INBOX).length);
  native.setItem(INBOX, '{"external":"plain"}');
  assert.equal(storage.getItem(INBOX), '{"external":"plain"}');
  native.removeItem(INBOX);
  assert.equal(storage.getItem(INBOX), null);
  assert.equal(storage.storedSize(INBOX), 0);
});

test('storage key enumeration and requested removal preserve native behaviour', () => {
  const native = new NativeStorage([[INBOX, encode(INBOX, large('enumeration'))], [OTHER, 'keep']]);
  const storage = createStorage(native);
  assert.equal(storage.length, 2);
  assert.deepEqual([storage.key(0), storage.key(1)].sort(), [INBOX, OTHER].sort());
  assert.equal(storage.key(2), null);
  storage.removeItem(INBOX);
  assert.equal(storage.length, 1);
  assert.equal(storage.getItem(INBOX), null);
  assert.equal(storage.getItem(OTHER), 'keep');
  assert.deepEqual(native.removals, [INBOX]);
  assert.equal(native.clears, 0);
});
