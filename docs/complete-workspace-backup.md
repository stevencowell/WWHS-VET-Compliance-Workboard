# One backup for all areas

The **All areas · one backup** bar is the same in Launchpad, VET, TAS and Finance.

- **Save backup** writes one `wwhs-all-areas-….json` file containing the current data saved in this browser: cards, rich notes and embedded images, calendar entries, older daily plans, links, native VET/TAS progress and preferences, completion reviews, and encrypted Finance records and settings.
- **Open backup** previews the file, then restores all four areas together. This replaces the current snapshot, including empty areas. A complete previous copy is kept privately in browser storage and can be downloaded through **Older files and recovery**.
- Finance can be backed up while locked. Restoring Finance checks the backup's existing password before changing any area. Finance remains encrypted inside the combined file.
- Saving keeps the workspace editable. The former separate VET/TAS handover editing sessions no longer control the main workboards.
- Older Launchpad, team VET/TAS and encrypted Finance files are accepted for recovery. Only their own area is affected; save a complete file afterwards.

Keep the complete file in a **private** folder: notes and email text are readable. Linked cloud documents stay at their original links. This does not synchronise different browsers or devices automatically; open the complete file on the destination device.

Interrupted imports use a durable recovery copy and a small restore marker. Writes are blocked during restore; tabs loaded before a restore must reload before editing. An invalid file, incorrect password or storage failure does not report a successful import. An exceptional Finance-only rescue download remains available under recovery when unsaved Finance edits cannot be persisted.

Validation: `node tests/workspace-backup.test.mjs`, `node tests/launchpad-backup.test.mjs`, `node tests/workboard-storage.test.cjs`, `node tests/team-session.test.mjs`, `node tests/finance-backup-export.test.mjs`, `node tests/task-help-storage.test.mjs`. Browser checks use invented data on an isolated local origin, covering restore, wrong-password rejection, downloaded-file validation, all four entry points and a phone-width dialog.
