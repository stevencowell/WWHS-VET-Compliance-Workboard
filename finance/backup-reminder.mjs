// Only tiny, non-content metadata is added to the encrypted Finance vault.
// No snapshot, financial value, or preference is written to localStorage.
export const FINANCE_BACKUP_REMINDER_KEY = 'finance_studio_backup_reminder_v1';

export function createFinanceBackupReminder(raw, {onChange = () => {}, makeToken = () => crypto.randomUUID(), now = () => new Date().toISOString()} = {}) {
  const initial = {version:1, enabled:true, changeToken:null, confirmedToken:null, confirmedAt:null};
  let metadata = {...initial}, active = false, pending = null, sequence = 0, transaction = null, confirming = false;
  try {
    const saved = JSON.parse(raw.getItem(FINANCE_BACKUP_REMINDER_KEY) || 'null');
    const token = value => value === null || (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value));
    if(saved && saved.version === 1 && typeof saved.enabled === 'boolean' && token(saved.changeToken) && token(saved.confirmedToken) &&
       (saved.confirmedAt === null || (typeof saved.confirmedAt === 'string' && Number.isFinite(Date.parse(saved.confirmedAt))))) {
      metadata = {version:1,enabled:saved.enabled,changeToken:saved.changeToken,confirmedToken:saved.confirmedToken,confirmedAt:saved.confirmedAt};
    }
  } catch { /* Missing or malformed reminder data never establishes a verified backup. */ }
  function needsBackup() { return confirming || (metadata.changeToken !== null && metadata.changeToken !== metadata.confirmedToken); }
  function current(capture) { return active && capture && capture.token === metadata.changeToken && capture.sequence === sequence; }
  function status() { return {enabled:metadata.enabled,needsBackup:needsBackup(),shouldWarn:active && metadata.enabled && needsBackup(),canConfirm:!confirming && !!pending && current(pending),confirming,confirmedAt:metadata.confirmedAt}; }
  function emit() { try { onChange(status()); } catch { /* UI must not interrupt encryption or persistence. */ } }
  function persist(next) { raw.setItem(FINANCE_BACKUP_REMINDER_KEY, JSON.stringify(next)); metadata = next; }
  function atomic(callback) {
    if(typeof callback !== 'function' || callback.constructor?.name === 'AsyncFunction') return raw.atomic(callback);
    const parent = transaction, before = metadata;
    const currentTransaction = {changed:false}; transaction = currentTransaction;
    try {
      const result = raw.atomic(() => {
        const result = callback();
        // Let the underlying adapter reject and contain asynchronous callbacks.
        if(result && typeof result.then === 'function') return result;
        if(active && !parent && currentTransaction.changed) persist({...metadata,changeToken:makeToken()});
        return result;
      });
      transaction = parent;
      if(parent) parent.changed ||= currentTransaction.changed;
      else if(active && currentTransaction.changed) { sequence++; pending = null; emit(); }
      return result;
    } catch(error) { transaction = parent; metadata = before; throw error; }
  }
  function mutate(operation) {
    if(transaction) return operation();
    return atomic(operation);
  }
  const storage = Object.freeze({
    get length() { return raw.length; }, key:index=>raw.key(index), getItem:key=>raw.getItem(key),
    setItem(key,value) { return mutate(() => { const before=raw.getItem(key);raw.setItem(key,value);if(key!==FINANCE_BACKUP_REMINDER_KEY && before!==raw.getItem(key))transaction.changed=true; }); },
    removeItem(key) { return mutate(() => { const existed=raw.getItem(key)!==null;raw.removeItem(key);if(key!==FINANCE_BACKUP_REMINDER_KEY && existed)transaction.changed=true; }); },
    clear() { return mutate(() => {const hasData=Array.from({length:raw.length},(_,i)=>raw.key(i)).some(key=>key!==FINANCE_BACKUP_REMINDER_KEY);raw.clear();persist(metadata);if(hasData)transaction.changed=true;}); },
    atomic,flush:()=>raw.flush(),status:()=>raw.status(),exportRecovery:()=>raw.exportRecovery(),
    close(options) { raw.close(options);active=false;pending=null;emit(); },
  });
  return Object.freeze({
    storage,status,
    activate() { active=true;emit(); },
    setEnabled(enabled) { if(typeof enabled!=='boolean')throw new TypeError('Choose whether to enable the backup reminder.');raw.atomic(()=>persist({...metadata,enabled}));emit(); },
    captureBackup() { return Object.freeze({token:metadata.changeToken,sequence}); },
    offerConfirmation(capture) { pending=current(capture)?capture:null;emit();return !!pending; },
    async confirmBackup() {
      if(confirming || !current(pending))return false;
      const capture=pending;
      confirming=true;emit();
      let previous=null;
      try {
        await raw.flush();
        if(!current(capture))return false;
        previous={confirmedToken:metadata.confirmedToken,confirmedAt:metadata.confirmedAt};
        raw.atomic(()=>persist({...metadata,confirmedToken:capture.token,confirmedAt:now()}));
        await raw.flush();
        if(!current(capture))return false;
        pending=null;return true;
      } catch(error) {
        // A failed acknowledgement must not look confirmed after a retry or reload.
        if(previous) { const restored={...metadata,...previous};try{raw.atomic(()=>persist(restored));}finally{metadata=restored;} }
        throw error;
      } finally { confirming=false;emit(); }
    },
  });
}
