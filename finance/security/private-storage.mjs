import { FinanceStorageError, validateRevision, validateValues } from './values.mjs';

// Hydrate before starting the legacy engine. This adapter never writes browser storage.
// A whole-state compare-and-swap makes other tabs an explicit conflict, not a silent merge.
export async function createPrivateStorage(session, { autoFlushMs = 500, onStatus = () => {} } = {}) {
  const initial = await session.loadState();
  let values = validateValues(initial.values);
  let revision = validateRevision(initial.revision);
  let generation = 0;
  let savedGeneration = 0;
  let phase = 'saved';
  let lastError = null;
  let timer = null;
  let inFlight = null;
  let reloading = false;
  let closed = false;
  let stagedValues = null;
  let rejectedAsyncCallbacks = 0;

  function status() { return { state: phase, revision, dirty: generation !== savedGeneration, error: lastError?.message || null, code: lastError?.code || null }; }
  function emit(next, error = null) { phase = next; lastError = error; try { onStatus(status()); } catch { /* UI observers must not break saving. */ } }
  function requireOpen() { if (closed) throw new FinanceStorageError('closed', 'The finance workspace is locked.'); }
  function requireMutable() { requireOpen(); if (rejectedAsyncCallbacks) throw new FinanceStorageError('async-transaction', 'Reload before editing if an asynchronous import is still running.'); }
  function currentValues() { return stagedValues ?? values; }
  function mutate(next) { if (stagedValues !== null) stagedValues = next; else change(next); }
  function change(next) {
    requireOpen();
    values = validateValues(next);
    generation += 1;
    if (phase !== 'conflict' && phase !== 'error') emit('unsaved');
    if (autoFlushMs !== null && phase !== 'conflict' && phase !== 'error') {
      clearTimeout(timer);
      timer = setTimeout(() => { flush().catch(() => {}); }, autoFlushMs);
    }
  }
  function flush() {
    requireOpen();
    if (stagedValues !== null) return Promise.reject(new FinanceStorageError('busy', 'Finish the synchronous import before saving.'));
    clearTimeout(timer);
    if (reloading) return Promise.reject(new FinanceStorageError('busy', 'Wait for the reload before saving.'));
    if (inFlight) return inFlight;
    if (phase === 'conflict') return Promise.reject(lastError);
    inFlight = (async () => {
      while (generation !== savedGeneration) {
        const sentGeneration = generation;
        const sentValues = validateValues(values);
        const sentRevision = revision;
        emit('saving');
        try {
          const saved = await session.saveState(sentRevision, sentValues);
          if (closed) return status();
          if (validateRevision(saved.revision) !== sentRevision + 1) {
            throw new FinanceStorageError('invalid-revision', 'The saved version could not be confirmed. Export your changes before reloading.');
          }
          revision = saved.revision;
          savedGeneration = sentGeneration;
          // Never replace memory with the response: edits made during the request must survive.
        } catch (error) {
          clearTimeout(timer);
          if (!closed) emit(error.code === 'conflict' ? 'conflict' : 'error', error);
          throw error;
        }
      }
      if (!closed) emit('saved');
      return status();
    })().finally(() => { inFlight = null; });
    return inFlight;
  }
  return Object.freeze({
    get length() { requireOpen(); return Object.keys(currentValues()).length; },
    key(index) { requireOpen(); return Object.keys(currentValues())[index] ?? null; },
    getItem(key) { requireOpen(); const current = currentValues(); return Object.hasOwn(current, key) ? current[key] : null; },
    setItem(key, value) { requireMutable(); const current = currentValues(), text = String(value); if (current[key] !== text) mutate({ ...current, [key]: text }); },
    removeItem(key) { requireMutable(); const current = currentValues(); if (Object.hasOwn(current, key)) { const next = { ...current }; delete next[key]; mutate(next); } },
    clear() { requireMutable(); if (Object.keys(currentValues()).length) mutate({}); },
    atomic(callback) {
      requireMutable();
      if (typeof callback !== 'function' || callback.constructor?.name === 'AsyncFunction') {
        throw new FinanceStorageError('async-transaction', 'Finance imports must use a synchronous storage transaction.');
      }
      const parent = stagedValues;
      stagedValues = { ...currentValues() };
      try {
        const result = callback();
        if (result && typeof result.then === 'function') {
          // Do not let an already-created async continuation write after the rollback.
          // Async functions are rejected before invocation; this handles ordinary callbacks
          // that accidentally return a Promise. No async work is part of a transaction.
          rejectedAsyncCallbacks++;
          Promise.resolve(result).catch(() => {}).finally(() => { rejectedAsyncCallbacks--; });
          throw new FinanceStorageError('async-transaction', 'A storage transaction cannot return a Promise.');
        }
        const clean = validateValues(stagedValues);
        stagedValues = parent;
        if (parent !== null) stagedValues = clean;
        else if (Object.keys(clean).length !== Object.keys(values).length || Object.entries(clean).some(([key, value]) => values[key] !== value)) change(clean);
        return result;
      } catch (error) { stagedValues = parent; throw error; }
    },
    flush,
    status,
    exportRecovery() {
      requireOpen();
      return JSON.stringify({ format: 'finance-studio-recovery', version: 1, exportedAt: new Date().toISOString(), revision, unsaved: generation !== savedGeneration, values: { ...values } }, null, 2);
    },
    // Caller must export/review dirty changes before requesting discard. No automatic conflict override.
    async reload({ discardUnsaved = false } = {}) {
      requireOpen();
      if (inFlight || reloading || stagedValues !== null) throw new FinanceStorageError('busy', 'Wait for the current request before reloading.');
      if (generation !== savedGeneration && !discardUnsaved) throw new FinanceStorageError('unsaved', 'Export your unsaved changes before reloading.');
      clearTimeout(timer);
      const beforeLoad = generation;
      reloading = true;
      try {
        const saved = await session.loadState();
        requireOpen();
        if (generation !== beforeLoad) throw new FinanceStorageError('unsaved', 'New edits arrived during reload. They have been kept; export them before reloading.');
        const clean = validateValues(saved.values);
        const nextRevision = validateRevision(saved.revision);
        values = clean; revision = nextRevision; generation = 0; savedGeneration = 0;
        emit('saved');
        return status();
      } finally { reloading = false; }
    },
    close({ discardUnsaved = false } = {}) {
      if (closed) return;
      if (stagedValues !== null) throw new FinanceStorageError('busy', 'Finish the current import before locking finance.');
      if (!discardUnsaved && (generation !== savedGeneration || inFlight)) throw new FinanceStorageError('unsaved', 'Save or export your changes before locking finance.');
      clearTimeout(timer); closed = true; values = Object.create(null); emit('closed');
    },
  });
}
