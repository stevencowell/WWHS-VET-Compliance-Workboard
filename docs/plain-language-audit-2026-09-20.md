# Plain-language audit — 20 September 2026

Steve asked for shorter wording that is clear at a glance across the entire package.

## Coverage

| Area | Reviewed |
| --- | --- |
| Shared workspace | Navigation, task lists, filters, counts, completion ticks, schedule messages and task help |
| VET and TAS | Home pages, tasks and checklists, annual/term/weekly plans, event records, settings, source guidance, systems, issues, handovers and AI help |
| Launchpad | Home cards, notes, email imports, saved plans, calendar, lessons, AI help, private backups and recovery |
| Finance | All ten views, password screen, imports, categories, budgets, transaction details, generated reports, AI prompts, encrypted backups and recovery |
| Shared backups | Open/save screens, folder selection, version conflicts, saved-copy confirmation, view-only mode and recovery messages |
| Sources | All 126 task entries, 74 source records, 2027 checks, source explanations and review findings |

The review covered the HTML entry pages, their active scripts and data, dialogs, hidden help, empty states, validation errors and save/recovery messages. Third-party code, the unused older Launchpad bundle, historical engineering reports and machine-readable schemas were not rewritten. Already-clear controls and source titles were retained. The detailed AI import contracts retain their evidence, identity and privacy rules.

## Changes

- Put the action first and cut repeated explanations.
- Replaced terms such as “scheduled occurrences”, “forecast”, “snapshot” and “recovery marker” in user instructions with ordinary wording.
- Shortened 85 app-authored task-title definitions. Task IDs and saved history still match.
- Put counting rules, detailed completion rules and source evidence under clearly labelled expandable sections.
- Kept the direct source links beside the tasks.
- Kept dates, task conditions, official evidence requirements, staff responsibilities and privacy boundaries explicit.
- Kept the difference between saving in this browser, saving a backup file and Google Drive syncing clear.
- Renamed the existing full-loan-payment total “Mortgage repayments”. Its explanation says principal and interest are not separated. The calculation is unchanged.

The long completion paragraph is now:

> Tick Reviewed complete when the task and its checklist are finished. You can tick future work off early. Untick to undo.

The extra rules still explain the year, repeating tasks, unchanged scheduled dates, retained notes, review date and required evidence.

## Preservation and checks

- Source-catalogue comparison preserved 1,563 protected fields, including source IDs, URLs, quotations, locators, structured dates, task order and counts.
- The browser source catalogue was rebuilt from the same source data as the Sources page.
- Saved personal content, progress and backups were not opened or rewritten.
- Storage keys, backup formats, encryption, calculations, completion rules and conflict/recovery guards were preserved.
- All 454 unit checks passed. All 82 changed JavaScript and test files passed syntax checks.
- Disposable browser checks covered desktop and phone layouts, all source views, navigation, source links, completion/undo/early completion, AI-help privacy, Launchpad backup round trips and Finance encrypted import/save flows.
- Finance's ten views passed 22 desktop/phone checks and 19 backup/import checks. Launchpad's backup controls passed 12 viewport/theme checks; AI help passed 12 interaction checks.
- An independent copy review caught and corrected three details: the explicit 2026 planning year, event-triggered checks, and the shared backup-options label. It also corrected a message that had confused personal completion with the official task record.

The work used synthetic test data and fresh browser contexts. Existing user browser data was not touched.
