import { FinanceStorageError, validateRevision, validateValues } from './values.mjs?v=plain-language-1';

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
  function requireOpen() { if (closed) throw new FinanceStorageError('closed', 'Finance is locked.'); }
  function requireMutable() { requireOpen(); if (rejectedAsyncCallbacks) throw new FinanceStorageError('async-transaction', 'An import is still running. Reload before editing.'); }
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
    if (stagedValues !== null) return Promise.reject(new FinanceStorageError('busy', 'Wait for the import to finish before saving.'));
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
            throw new FinanceStorageError('invalid-revision', 'The save could not be confirmed. Save a recovery backup before reloading.');
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
        throw new FinanceStorageError('async-transaction', 'This import cannot save all its changes together. Nothing was imported.');
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
          throw new FinanceStorageError('async-transaction', 'This import could not save all its changes together. Its changes were undone.');
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
      if (inFlight || reloading || stagedValues !== null) throw new FinanceStorageError('busy', 'Wait for saving or importing to finish before reloading.');
      if (generation !== savedGeneration && !discardUnsaved) throw new FinanceStorageError('unsaved', 'Save a recovery backup of your unsaved changes before reloading.');
      clearTimeout(timer);
      const beforeLoad = generation;
      reloading = true;
      try {
        const saved = await session.loadState();
        requireOpen();
        if (generation !== beforeLoad) throw new FinanceStorageError('unsaved', 'New edits arrived while reloading. They are still here. Save a recovery backup before reloading again.');
        const clean = validateValues(saved.values);
        const nextRevision = validateRevision(saved.revision);
        values = clean; revision = nextRevision; generation = 0; savedGeneration = 0;
        emit('saved');
        return status();
      } finally { reloading = false; }
    },
    close({ discardUnsaved = false } = {}) {
      if (closed) return;
      if (stagedValues !== null) throw new FinanceStorageError('busy', 'Wait for the import to finish before locking Finance.');
      if (!discardUnsaved && (generation !== savedGeneration || inFlight)) throw new FinanceStorageError('unsaved', 'Save your changes or a recovery backup before locking Finance.');
      clearTimeout(timer); closed = true; values = Object.create(null); emit('closed');
    },
  });
}
