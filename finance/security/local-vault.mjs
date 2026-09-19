import { FinanceStorageError, MAX_STATE_BYTES, validateRevision, validateValues } from './values.mjs';

const FORMAT = 'finance-studio-encrypted-vault';
const ITERATIONS = 600000;
const MAX_BACKUP_BYTES = 48 * 1024 * 1024;
const STORE = 'vault';
const RECORD_ID = 'primary';
const PREVIOUS_ID = 'previous';
const encode = text => new TextEncoder().encode(text);
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const failure = (code, message) => new FinanceStorageError(code, message);
function base64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function unbase64(text) {
  if (typeof text !== 'string' || text.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw failure('invalid-backup', 'This is not a valid encrypted Finance Studio backup.');
  return Uint8Array.from(atob(text), char => char.charCodeAt(0));
}
function validRecord(value) {
  if (!value || value.format !== FORMAT || value.version !== 1 || value.kdf !== 'PBKDF2-SHA256' || value.iterations !== ITERATIONS
    || typeof value.vaultId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.vaultId)
    || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string'
    || !Number.isFinite(Date.parse(value.createdAt)) || !Number.isFinite(Date.parse(value.updatedAt))
    || typeof value.ciphertext !== 'string' || value.ciphertext.length > MAX_BACKUP_BYTES) {
    throw failure('invalid-backup', 'This is not a supported encrypted Finance Studio backup.');
  }
  validateRevision(value.revision);
  if (typeof value.salt !== 'string' || value.salt.length !== 24 || typeof value.iv !== 'string' || value.iv.length !== 16
    || unbase64(value.salt).length !== 16 || unbase64(value.iv).length !== 12 || unbase64(value.ciphertext).length < 16) {
    throw failure('invalid-backup', 'The encrypted backup is incomplete.');
  }
  return {
    format: FORMAT, version: 1, kdf: value.kdf, iterations: value.iterations,
    vaultId: value.vaultId, revision: value.revision, createdAt: value.createdAt,
    updatedAt: value.updatedAt, salt: value.salt, iv: value.iv, ciphertext: value.ciphertext,
  };
}
function additionalData(record) {
  return encode(JSON.stringify([record.format, record.version, record.kdf, record.iterations, record.vaultId, record.revision, record.salt, record.createdAt, record.updatedAt]));
}
function requirePassword(password, creating = false) {
  if (typeof password !== 'string' || password.length > 1024 || (creating ? password.length < 12 : password.length < 1)) {
    throw failure('password', creating ? 'Use a password or passphrase of at least 12 characters.' : 'Enter the password for this finance vault.');
  }
}

export async function openVaultDatabase(indexedDB, dbName) {
  if (!indexedDB) throw failure('unsupported', 'This browser cannot provide private local storage.');
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(failure('storage', 'Private browser storage could not be opened. Your browser may be blocking it.'));
    request.onblocked = () => reject(failure('storage', 'Close other Finance Studio tabs before opening this vault.'));
  });
  db.onversionchange = () => db.close();
  return {
    read(id = RECORD_ID) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readonly');
        const request = transaction.objectStore(STORE).get(id);
        let value;
        request.onsuccess = () => { value = request.result ?? null; };
        transaction.oncomplete = () => resolve(value);
        transaction.onerror = transaction.onabort = () => reject(failure('storage', 'The saved finance vault could not be read.'));
      });
    },
    readPrevious() { return this.read(PREVIOUS_ID); },
    compareAndSwap(expected, next, { preservePrevious = false } = {}) {
      return new Promise((resolve, reject) => {
        let reason;
        const transaction = db.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        const request = store.get(RECORD_ID);
        request.onsuccess = () => {
          try {
          const current = request.result ?? null;
          const matches = expected === null ? current === null : Object.hasOwn(expected,'record')
            ? JSON.stringify(current) === JSON.stringify(expected.record)
            : current?.vaultId === expected.vaultId && current?.revision === expected.revision;
          if (!matches) {
            reason = failure('conflict', 'Finance was changed in another tab. Your edits are still here; save a recovery backup before reloading.');
            transaction.abort();
            return;
          }
          // Both writes belong to this transaction: quota/abort preserves the
          // old primary and its existing previous copy, never only one of them.
          if (preservePrevious && current !== null) store.put(current, PREVIOUS_ID);
          store.put(next, RECORD_ID);
          } catch (error) {
            reason ||= failure('storage', 'Finance could not be saved in this browser. The current and previous encrypted copies are unchanged.');
            try { transaction.abort(); } catch {}
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(reason || failure('storage', 'Finance could not be saved in this browser. Keep this tab open and export a backup.'));
      });
    },
    close() { db.close(); },
  };
}

export async function createLocalVault({ dbName = 'finance-studio-private-v1' } = {}, dependencies = {}) {
  const crypto = dependencies.crypto || globalThis.crypto;
  if (!crypto?.subtle || !crypto?.getRandomValues || !crypto?.randomUUID) {
    throw failure('unsupported', 'Private finance needs a secure browser connection (HTTPS or localhost).');
  }
  const database = dependencies.database || await openVaultDatabase(globalThis.indexedDB, dbName);
  let key = null;
  let unlockedRecord = null;
  let epoch = 0;
  let closed = false;
  let authBusy = false;
  function requireOpen() { if (closed) throw failure('closed', 'The finance vault is closed.'); }
  function requireUnlocked() { requireOpen(); if (!key || !unlockedRecord) throw failure('locked', 'Unlock finance with your password first.'); }
  function assertEpoch(started) { requireOpen(); if (started !== epoch) throw failure('locked', 'The vault was locked while the request was running.'); }
  async function derive(password, salt) {
    const material = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unbase64(salt), iterations: ITERATIONS, hash: 'SHA-256' }, material,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(values, encryptionKey, metadata) {
    const record = { ...metadata, iv: base64(crypto.getRandomValues(new Uint8Array(12))) };
    const plain = encode(JSON.stringify({ format: 'finance-studio-state', version: 1, values: validateValues(values) }));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: unbase64(record.iv), additionalData: additionalData(record), tagLength: 128 }, encryptionKey, plain);
    return { ...record, ciphertext: base64(new Uint8Array(ciphertext)) };
  }
  async function decrypt(record, encryptionKey) {
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64(record.iv), additionalData: additionalData(record), tagLength: 128 }, encryptionKey, unbase64(record.ciphertext));
      if (plain.byteLength > MAX_STATE_BYTES + 100) throw new Error('size');
      const state = JSON.parse(decode(plain));
      if (state.format !== 'finance-studio-state' || state.version !== 1) throw new Error('format');
      return validateValues(state.values);
    } catch {
      throw failure('unlock-failed', 'The password is incorrect, or the encrypted backup is damaged. Nothing has been changed.');
    }
  }
  async function exclusiveAuth(operation) {
    requireOpen();
    if (authBusy) throw failure('busy', 'Wait for the current unlock or restore to finish.');
    authBusy = true;
    try { return await operation(); } finally { authBusy = false; }
  }
  async function readRecord() { const raw = await database.read(); return raw ? validRecord(raw) : null; }
  function newMetadata(revision = 0) {
    const now = new Date().toISOString();
    return { format: FORMAT, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, vaultId: crypto.randomUUID(), revision,
      salt: base64(crypto.getRandomValues(new Uint8Array(16))), createdAt: now, updatedAt: now };
  }

  return Object.freeze({
    async getGate() {
      requireOpen();
      const saved = await readRecord();
      if (!saved) { key = null; unlockedRecord = null; return { state: 'needs-password' }; }
      if (key && unlockedRecord?.vaultId === saved.vaultId && unlockedRecord.salt === saved.salt) return { state: 'ready' };
      key = null; unlockedRecord = null;
      return { state: 'locked' };
    },
    async setup(password) {
      return exclusiveAuth(async () => {
        requirePassword(password, true);
        const started = epoch;
        if (await readRecord()) throw failure('exists', 'A finance vault already exists in this browser. Unlock it or restore a backup explicitly.');
        const metadata = newMetadata();
        const derived = await derive(password, metadata.salt);
        const saved = await encrypt({}, derived, metadata);
        assertEpoch(started);
        await database.compareAndSwap(null, saved);
        assertEpoch(started);
        key = derived; unlockedRecord = saved;
        return { state: 'ready' };
      });
    },
    async unlock(password) {
      return exclusiveAuth(async () => {
        requirePassword(password);
        const started = epoch;
        const saved = await readRecord();
        if (!saved) throw failure('missing', 'There is no saved finance vault in this browser yet.');
        const derived = await derive(password, saved.salt);
        await decrypt(saved, derived);
        assertEpoch(started);
        key = derived; unlockedRecord = saved;
        return { state: 'ready' };
      });
    },
    lock() { epoch++; key = null; unlockedRecord = null; },
    async loadState() {
      requireUnlocked();
      const started = epoch;
      const saved = await readRecord();
      if (!saved || saved.vaultId !== unlockedRecord.vaultId || saved.salt !== unlockedRecord.salt) {
        throw failure('conflict', 'The browser vault was replaced or removed. Export your current edits before unlocking it again.');
      }
      const values = await decrypt(saved, key);
      assertEpoch(started);
      unlockedRecord = saved;
      return { revision: saved.revision, values, updatedAt: saved.updatedAt };
    },
    async saveState(expectedRevision, values) {
      requireUnlocked();
      validateRevision(expectedRevision);
      if (expectedRevision >= Number.MAX_SAFE_INTEGER) throw failure('invalid-revision', 'This vault needs a fresh backup and restore before more changes.');
      const started = epoch;
      const clean = validateValues(values);
      const saved = await encrypt(clean, key, { ...unlockedRecord, revision: expectedRevision + 1, updatedAt: new Date().toISOString() });
      assertEpoch(started);
      await database.compareAndSwap({ vaultId: unlockedRecord.vaultId, revision: expectedRevision }, saved);
      assertEpoch(started);
      unlockedRecord = saved;
      return { revision: saved.revision, values: clean, updatedAt: saved.updatedAt };
    },
    async exportBackup({ expectedRevision } = {}) {
      requireOpen();
      if(expectedRevision!==undefined){requireUnlocked();validateRevision(expectedRevision);}
      const started=epoch,identity=unlockedRecord;
      const saved = await readRecord();
      assertEpoch(started);
      if (!saved) throw failure('missing', 'There is no saved finance vault to back up.');
      if(identity&&(saved.vaultId!==identity.vaultId||saved.salt!==identity.salt)||expectedRevision!==undefined&&saved.revision!==expectedRevision){
        throw failure('conflict','Another tab changed the saved Finance workspace. Save a recovery backup of the records open here before reloading.');
      }
      return JSON.stringify(saved, null, 2);
    },
    async getPreviousBackupInfo() {
      requireOpen();
      const saved = await database.readPrevious?.();
      if (!saved) return null;
      const record = validRecord(saved);
      return { updatedAt: record.updatedAt };
    },
    async exportPreviousBackup() {
      requireOpen();
      const started = epoch;
      const saved = await database.readPrevious?.();
      assertEpoch(started);
      if (!saved) throw failure('missing', 'There is no previous encrypted Finance copy in this browser.');
      // No decrypt/re-encrypt: it remains protected by the original password.
      return JSON.stringify(validRecord(saved), null, 2);
    },
    // Encrypt the latest in-memory edits even if local persistence failed or another tab won.
    // This never replaces browser storage and remains protected by the existing vault password.
    async exportRecovery(values) {
      requireUnlocked();
      const started = epoch;
      const clean = validateValues(values);
      const saved = await encrypt(clean, key, { ...unlockedRecord, updatedAt: new Date().toISOString() });
      assertEpoch(started);
      return JSON.stringify(saved, null, 2);
    },
    async restoreBackup(text, password, { replaceExisting = false } = {}) {
      return exclusiveAuth(async () => {
        requirePassword(password);
        if (typeof text !== 'string' || encode(text).length > MAX_BACKUP_BYTES) throw failure('invalid-backup', 'The encrypted backup is too large or unreadable.');
        let imported;
        try { imported = validRecord(JSON.parse(text)); } catch { throw failure('invalid-backup', 'Choose a valid encrypted Finance Studio backup.'); }
        // A verified backup can recover a damaged local record too. The explicit replacement
        // decision is still required, and the transaction checks that record's identity/version.
        const current = await database.read();
        if (current && !replaceExisting) throw failure('exists', 'Opening this backup will replace this browser\u2019s vault. Confirm replacement first; the previous encrypted copy will be kept.');
        const started = epoch;
        const derived = await derive(password, imported.salt);
        const values = await decrypt(imported, derived);
        const nextRevision = current && Number.isSafeInteger(current.revision) && current.revision >= 0 ? current.revision + 1 : 0;
        validateRevision(nextRevision);
        // Fresh vault identity invalidates every other tab, including restores of old revisions.
        const saved = await encrypt(values, derived, { ...imported, vaultId: crypto.randomUUID(), revision: nextRevision, updatedAt: new Date().toISOString() });
        assertEpoch(started);
        await database.compareAndSwap(current ? { record: current } : null, saved, { preservePrevious: true });
        assertEpoch(started);
        epoch++; key = derived; unlockedRecord = saved;
        return { state: 'ready' };
      });
    },
    close() { epoch++; key = null; unlockedRecord = null; closed = true; database.close(); },
  });
}
