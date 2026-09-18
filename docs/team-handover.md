# VET and TAS team handover

This is a manual, sequential handover using a restricted Google Drive folder. It does not connect to Drive, synchronise automatically, verify identities or provide a remote editing lock. Staff must agree who is editing and use the latest shared file. The live website contains the application only; staff progress remains in browser storage and the files staff choose to save.

## Staff workflow

1. On the browser with the authoritative VET/TAS progress, open **Team handover → First time? Create the team’s first file**. Enter your name, create the JSON and put it in **01 Current handover**. Confirm the upload on the handover page.
2. At the start of every editing session, download the current JSON from that folder, choose it in Team handover, enter your name and confirm nobody else is editing. **Import and start session** loads both workboards together. **Import to view only** is available for checking progress.
3. Save notes and close other editing tabs. Open Team handover, add an optional handover note and choose **Finish and export**. Keep a dated copy of the previous file in **02 Previous versions**, replace the current file in Drive, wait for the upload, then choose **I’ve saved it in Google Drive**. Tell the next person it is ready.

The fixed download name is `WWHS-team-handover.json`. A browser may append a number when the name already exists; maintain one current copy in Drive. Re-downloading a pending handover keeps the same revision and export identity. Returning to editing invalidates the downloaded copy: discard it and export afresh after editing.

The current and archive folders are linked on the page. Folder access remains controlled by Google Drive permissions. No progress file is uploaded by the website. The first file must be created in the real browser holding current records, not in a local preview or empty browser.

## Data boundaries

Included: VET/TAS native records and notes, checklists, assignments, gaps, triggered work, TAS weekly checks and date overrides, annual/occurrence review ticks, origin-linked VET/TAS working cards and plain-text notes, and suppression markers preventing deleted cards from reappearing.

Excluded: Finance; email imports, source chains and summaries; unlinked cards; cards moved into Personal; daily pins and plans; private links and link settings; local preferences. Incoming team data preserves local personal items and local-only fields on matching cards. Incoming note changes clear obsolete local rich-text markup. Official-record references and working notes entered on team records are intentionally shared; keep their content appropriate for colleagues. Names and handover notes are not authenticated signatures. A task sign-off remains distinct from official evidence in its owner system.

## Consistency and recovery

- Before opting into Team handover, individual mode works as before. Once connected, native/task-list writes are guarded outside an active session. Preference and personal-only changes remain available. Stale tabs must reload after a different session begins.
- Import validates schema and fields, checks the previously opened workspace/revision/parent, and rechecks local state before replacing it. Known older files, same-number forks, adjacent-parent mismatches, malformed input and private-card identity collisions are refused.
- Revisions skipped by more than one cannot prove their full ancestry from a single-parent file. The app cannot establish that a selected file is actually latest, or prevent someone on a separate computer from starting simultaneous work. Conflicting edits must be reconciled manually; do not overwrite the team's authoritative copy.
- Import retains the previous portable snapshot and exact raw participating stores locally. The **Download recovery copy** action exports the portable snapshot with a new workspace identity for review, excluding private fields. One pre-import recovery is retained; archive external versions for longer history.
- Data and session metadata changes use a before/after journal. Failed writes roll back; interrupted transactions recover on reopening Team handover. While a journal exists, all participating writes are blocked. Conflicting recovery data is retained and refused rather than overwritten. Browser storage quotas still apply; a failed export/import does not imply a completed handover.
- Finishing captures saved browser data and pauses editing before downloading. The app cannot capture an unsaved form in another tab or verify the Drive upload; the staff confirmation explicitly covers those steps.

## Validation

Run `node tests/team-handover.test.mjs` and `node tests/team-session.test.mjs` for validation, privacy, roundtrip, stale-file, rollback and write-guard regression checks. Native adapter and shared-summary tests cover existing record behaviour. `tests/team-handover-browser.cjs` uses two disposable browser contexts and synthetic data to test first setup, real native edits, TAS dates, review ticks, view-only imports, export freeze, repeated downloads, stale tabs/files, competing revisions and recovery downloads.

Desktop/mobile and light/dark entry checks cover VET, TAS, Launchpad and Team handover. Tests must never attach to an existing user browser profile or use real staff records.
