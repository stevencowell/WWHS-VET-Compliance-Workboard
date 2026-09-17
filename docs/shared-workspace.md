# Shared Launchpad workspace

The three entry points use the same task and notes component: Daily Launchpad, VET and Head Teacher TAS. Shared navigation, appearance and the Review → Choose → Work & note sequence follow Launchpad. VET and TAS open with their own work-area filter and automatically populate assigned scheduled work; personal Launchpad opens on Personal. All work shows the whole list. Today, Soon, Waiting, My Notes and Done use the same controls in each area.

## Feature preservation

The maintained `summary-import` component supplies notes, rich working drafts, paste-email capture, AI/Evernote imports, source links, task search, priorities, dates, dependency notes, Sydney-day pins, briefing, calendar and backups. Calendar/timetable storage and daily lessons are retained. App links, quick links, theme, calendar chooser and ChatGPT help remain available.

VET retains its role views, four-term 2027 cycle, weekly sequencing, gates, 2026 reference, workflows, event occurrences, authority gaps, handover, approved links, AI Admin, checklist completion and independent verification. TAS retains teaching, faculty, people/safety, source dates, recurring controls, milestones, weekly review, reference, AI Admin, approved links, completion and verification. The original home overview is available in the expandable specialist section; named specialist routes, including the labelled VET/TAS follow-ups, open directly.

VET and TAS derive a forecast when opened, on relevant saved changes, when the browser returns to the page and when the date rolls over. It uses actual dates and a 21-day look-ahead, plus ongoing duties and recorded follow-ups. VET respects the selected role, dated sources, current-year control windows and prerequisite sequence. TAS includes current weekly/term controls, relevant listed milestones and saved event occurrences. Untriggered event templates and unrelated catalogue entries remain in the specialist tools. Browsing a future term does not make its work due today.

Every automatic card explains its scheduling reason, period, source status and snapshot date. Past dates with no reviewed local record ask for status confirmation. Missing recurring dates are explicit; a planning window is not an official deadline. The source schedules are those already bundled into the workboard, not an authenticated live feed from school systems. The existing source snapshot/check date is shown, and an unsupported year or unreadable/stale native state pauses generation.

“Add to my work” remains available for an extra manually selected task. Stable occurrence identity prevents duplication. Forecast refresh updates untouched automatic next steps and dates while preserving edited fields, notes, pins and personal completion. Work no longer in the forecast is retained with its notes/history. A deleted card stays deleted unless explicitly added again; a later recurring occurrence has its own identity.

Personal Done never completes or verifies a specialist checklist and never opens a VET prerequisite gate. Source completion is reflected in the shared card, while manual planning completion remains separate. Dependency-blocked work stays in Waiting. Open VET/TAS task returns to the full source workflow. Later edits to a planning date remain personal. Official records stay in their authorised school/RTO systems.

## Task-specific AI preparation

Every linked VET/TAS card offers **Prepare with AI**, including manually added ongoing work and automatically scheduled occurrences. The dialog describes the useful output, lists any source material needed and shows the complete request before copying. Copy help request and Open ChatGPT use the existing desktop/web chooser. This is a prompt preparation feature: no AI service is called, and no request is sent automatically.

`assets/js/vet-task-help.mjs` maps the 59 canonical VET tasks, 176 scheduled controls and nine event templates to 38 preparation profiles. `assets/js/tas-task-help.mjs` maps all 41 actionable TAS tasks to 22 preparation profiles. Historical/procedure-only catalogue entries are excluded. Coverage tests fail when a new actionable catalogue task lacks a specific profile. Repeated work uses its exact occurrence identity with the shared preparation profile.

Native adapters supply only named task definitions, steps, roles and catalogue source routes, plus the recorded status/next step. The additive `taskHelp` snapshot is validated against the card's exact origin and retained in shared task backups. Current native context is resolved when preparing/copying on that workboard; other areas and unavailable sources use explicitly labelled saved context. A snapshot is never presented as independently verified source currency or an official deadline.

Requests are built from the latest saved card and visible edits at each preparation/copy. Personal card actions remain separate from the recorded native next step. Working notes are excluded unless **Include my working note** is selected; the choice resets for each opening. Native exception notes, evidence references, saved private link overrides and private blocker text are excluded. Existing imported `help` guidance is retained and uses the same fresh preview/copy flow. Preparing a request does not change completion, verification, gates or specialist records.

## Storage and recovery

All three pages share the existing `morning-launchpad-summary:v1` key on the same origin. Version 1/2 backups gain additive work-area, optional source-origin and forecast metadata. Forecast reconciliation uses one atomic compare-before-write update; unchanged snapshots do not write again. The original notes, imported email text, working drafts, task IDs and retired daily plans are retained. Source identities include TAS recurrence and VET event occurrence, so repeated work cannot collapse into a single card. TAS new-event controls retain previous occurrence records.

VET `wwhs-vet-compliance-workboard:v3` and TAS `wwhs-head-teacher-tas-workboard:v2` remain specialist stores, with their existing controlled backup formats. Shared task backups do not replace specialist backups. Never commit real browser records, mail, timetable exports, authenticated link overrides or backups. There is no remote account or cross-computer sync.

Compare-before-write protection refuses stale, malformed or unreadable saved state. Shared reload keeps typed text on the page for recovery and export. Source forms stay open when a save fails. No private live browser data is required for the automated tests.

## Maintenance and verification

`assets/js/workspace.mjs` owns the shared shell, route integration and source adapter connection. `assets/css/workspace.css` loads after the existing styles. Each native app exposes a read-only descriptor adapter and an Add to my work event; the adapter offers no shared completion bypass. The original generated React shell remains the Launchpad entry point; maintained summary modules provide the task UI. The legacy exporter intentionally refuses to overwrite this maintained edition.

Run the pure tests directly with Node: summary-import, calendar, email-capture, shared-summary, vet-adapter and tas-adapter in `tests/`. `tests/workspace-browser.cjs` exercises the preserved flows in an isolated local browser against port 4173. `tests/forecast-browser.cjs` checks automatic population, roles, recurrence, source completion, deletion, drafts, personal filtering and mobile appearance with a fixed Sydney date. All tests use synthetic data.

Task-help coverage, prompt and storage tests are `vet-task-help.test.mjs`, `tas-task-help.test.mjs`, `task-help.test.mjs` and `task-help-storage.test.mjs`. `tests/task-help-browser.cjs` checks all native contexts, current/draft edits, note consent, private source exclusions, clipboard success/fallback, source changes, recurring occurrences, cross-area help, conflict handling, first-click behaviour and mobile keyboard focus. It uses isolated local browser storage and blocks external requests.

Releases require Steve's explicit approval, followed by verification of the deployed assets, routes and interactions. Record the deployed commit and fresh verification evidence for each release; do not treat an earlier release manifest as proof for a later candidate.
