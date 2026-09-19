# Backup and save acceptance audit

User goal: one straightforward, dependable backup process across Launchpad,
VET, TAS, Finance, desktop and phone browsers. Public release is authorised.

## Required outcomes

- The same two main actions: **Open backup** and **Save backup**. Save never
  redirects to an import form. Settings and alternate methods stay secondary.
- Launchpad's primary file includes its notes, completed items, calendar,
  saved plans, links and relevant settings. Legacy task backups still open.
- A shared VET/TAS file includes both areas' saved task progress, checklists,
  notes, review ticks and dates; it excludes private email and Finance data.
- Finance stays encrypted; all supported finance data travels in its backup.
- Selecting a file only previews it. Wrong, malformed, older or conflicting
  files cannot silently replace current work. Cancelling changes nothing.
- Replacement preserves a recoverable prior copy. Concurrent edits are
  detected; quota, interrupted writes and failed file saves preserve data.
- Missing handover history cannot disable saving readable current progress.
  Reconnection preserves old metadata locally and never invents history.
- Remembered folders remain separate for private and shared backups.
  Unsupported or blocked file pickers use downloads. Download initiation is
  never described as a confirmed saved file or confirmed Google Drive sync.
- Unsaved-change reminders cover the data included in each area; they clear
  only for the exact successfully saved or user-confirmed backup.
- Mobile and desktop layouts show the relevant action and its result without
  horizontal overflow. Keyboard focus follows the selected Open/Save panel.
- Test the meaningful failure paths in disposable browsers. Do not clear,
  replace or seed the user's real browser data as part of verification.

## Known external limits

This static website cannot verify Google Drive cloud synchronisation, know
whether a colleague is editing elsewhere, or guarantee a close warning on
every phone/browser. The interface must state what actually happened and
give a simple next action. No new cloud service or account permission is added.

## Evidence

## Implemented behaviour

Open and Save are the two primary actions. The shared handover page displays
one chosen panel at a time; Save stays on its save panel for individual,
editing, viewing and damaged-history states. Existing import bookmarks remain
supported. Names and handover notes are optional; folder settings, downloads
and previous copies are secondary.

Shared files contain validated VET, TAS, review and shared-card snapshots.
Private notes and Finance are excluded. Missing handover payloads no longer
disable saving readable current progress: a separate safety file is available.
Opening a trusted shared file previews its records and archives the original
metadata and current progress before replacement. A safety file is explicitly
a new starting point, never a fabricated continuation of missing history.

Launchpad's new private file includes tasks (including completed items and
rich notes), calendar events, older daily plans, saved links and appearance.
Older task-only and calendar-only files remain readable. A preview defaults to
adding missing records and keeping current matches; replacing differing
records is an explicit choice. Multi-record restores use a private recovery
transaction; explicit replacements retain a previous complete private copy
that can be saved from the secondary options. Finance's primary backup remains
encrypted and includes all current Finance stores; legacy readable exports
are labelled as secondary. Replacing Finance records retains the previous
encrypted vault in the same database transaction. Its previous-copy export
still requires its original password to open and never clears today's reminder.

Remembered private and shared folders are separate. Shared saves check the
existing file's identity, recheck its exact contents before committing, and
detect local edits during a save. A remembered folder's identity and permission
are checked again before writing. Native writes count as saved only after the
file closes; unsupported or blocked pickers use an explicitly unconfirmed
download. Only the exact saved or confirmed snapshot clears its reminder.

## Regression evidence

All browser tests use disposable contexts and invented records. Tests do not
load personal browser profiles, actual Finance records or shared Drive files.

| Requirement | Regression coverage |
| --- | --- |
| Open/Save separation, recovery and mobile layout | `team-backup-flow-browser.cjs`: individual, active, pending, viewing, absent payloads, malformed history and legacy import link |
| Protection against wrong/newer files and concurrent edits | shared browser flow, recovery/core/transaction unit tests, guarded-file write unit tests |
| Saving despite missing history or failed recovery storage | shared browser flow: safety copy, exact archive, deliberately aborted IndexedDB write and working separate-copy fallback |
| Remembered folders | shared flow and `private-default-folder-browser.cjs`: real disposable directory handles, reload, permissions, folder conflicts and private/shared separation |
| Complete Launchpad restore and reminders | `launchpad-backup.test.mjs`, `launchpad-full-backup-browser.cjs`, import and quota browser suites, private reminder unit tests |
| Encrypted Finance export/restore | Finance export, import, reminder and quota suites; stale vault identity, cancel, mobile downloads and close/write failures |
| Honest save receipts and close reminders | `team-exit-guard.test.mjs`, private reminder suites: exact current data and journals; previous copies never acknowledge current work |
| Visible entry actions | `team-import-prompt-browser.cjs`: phone/desktop, dismissal, keyboard focus, cross-wing navigation, unchanged saved data |
| Storage capacity and interrupted writes | shared handover quota suite, Launchpad quota suite, Finance quota suite and compression browser suite |

Older handover-save and default-folder test entry points explicitly delegate to
the replacement scenarios rather than retain assertions for obsolete controls.
The two-browser handover regression retains its collaboration checks.

Release verification must compare the published runtime files with the commit
and open all five areas at desktop and phone widths. Its deployment report and
screenshots are kept outside the public repository. Actual phone operating
system prompts and Google Drive synchronisation remain external limits, not
claims made by the simulated mobile browser tests.
