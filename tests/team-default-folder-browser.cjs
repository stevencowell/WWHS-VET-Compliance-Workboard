// Compatibility entry point. Remembered shared-folder behaviour now saves
// directly after guarded file checks; it no longer opens Save as each time.
// team-backup-flow-browser.cjs replaces the obsolete picker expectation with
// real OPFS + IndexedDB persistence, no-picker saves, reload reuse, retained
// dated safety copies and rejection of a competing shared handover.
process.env.WORKBOARD_BACKUP_MATCH='remembered shared folder';
require('./team-backup-flow-browser.cjs');
