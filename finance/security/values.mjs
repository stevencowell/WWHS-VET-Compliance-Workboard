export const MAX_STATE_BYTES = 32 * 1024 * 1024;
export const MAX_STATE_KEYS = 64;
const keyPattern = /^finance_studio_[a-z0-9_:-]{1,96}$/i;

export class FinanceStorageError extends Error {
  constructor(code, message) { super(message); this.name = 'FinanceStorageError'; this.code = code; }
}

export function validateValues(values) {
  if (!values || Array.isArray(values) || typeof values !== 'object') {
    throw new FinanceStorageError('invalid-state', 'Finance data must be a dictionary of saved values.');
  }
  const entries = Object.entries(values);
  if (entries.length > MAX_STATE_KEYS) throw new FinanceStorageError('too-large', 'Too many saved finance sections.');
  const clean = Object.create(null);
  for (const [key, value] of entries) {
    if (!keyPattern.test(key) || typeof value !== 'string') {
      throw new FinanceStorageError('invalid-state', 'Only Finance Studio JSON values can be saved.');
    }
    try { JSON.parse(value); } catch { throw new FinanceStorageError('invalid-state', 'A saved finance value is not valid JSON.'); }
    clean[key] = value;
  }
  if (new TextEncoder().encode(JSON.stringify(clean)).length > MAX_STATE_BYTES) {
    throw new FinanceStorageError('too-large', 'Finance data exceeds the 32 MB limit. Export a recovery copy before continuing.');
  }
  return clean;
}

export function validateRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new FinanceStorageError('invalid-revision', 'The saved version could not be verified. Reload before editing.');
  }
  return revision;
}
