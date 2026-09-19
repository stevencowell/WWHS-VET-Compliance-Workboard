// Compatibility entry point for the deliberately simplified Open/Save workflow.
// The former tests enforced removed confirmations and the broken Save-to-Import
// fallback. Their meaningful picker, cancellation, retry, privacy, receipt,
// overwrite and responsive checks now live in team-backup-flow-browser.cjs,
// including real IndexedDB failures and remembered-folder OPFS writes.
// Run the complete replacement suite so this historical command stays useful.
require('./team-backup-flow-browser.cjs');
