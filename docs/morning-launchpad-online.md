# Online Morning Launchpad

Address: https://stevencowell.github.io/WWHS-VET-Compliance-Workboard/morning-launchpad/

This is the same standalone links and daily-plan app used locally. Only the generated HTML, JavaScript, CSS and favicon are published. The public page has no account login. Daily plans, saved favourites and appearance settings remain in the visitor's browser; they are not uploaded or synchronised between computers. Mail, notes, timetable snapshots, source data and backups are excluded from the export. The page blocks background network connections through its Content Security Policy.

The local and online addresses have separate browser storage. Existing local plans remain at http://localhost:4318/. To move selected plans, use the existing Saved plans and backup controls to export from the local page and import at the online address. Existing days take precedence during import. Keep the backup until the imported plans have been checked.

The TAS/VET Hub links to this online page. Main Page is an outgoing shortcut only; no Launchpad return link has been added to the student site.

## Update

### Summary import and review (15 September 2026)

The online edition adds paste, text/Markdown/HTML import and JSON review-list restore. It extracts explicitly titled actions locally; it is not an AI service and does not connect to Evernote. HTML is parsed in an inert template, active elements are discarded, and only plain text and validated HTTPS links reach the interface. No imported material belongs in this public repository.

Maintained sources are `morning-launchpad/assets/summary-core.mjs`, `summary-import.mjs`, `summary-bridge.mjs` and `summary-import.css`. The existing built React entry imports these modules, renders `<summary-import>` before the daily plan, and calls `useSummaryBridge` with the current day and existing save function. The local installed app's original source is not in this repository.

The importer uses `morning-launchpad-summary:v1` browser storage. It merges reimports, retains edits and resolved states, supports review-list backup, and checks for concurrent writes. It never writes `morning-launchpad-routine:v1` directly: reviewed actions pass to React's existing conflict-safe plan saver in one batch. Small days permit one imported priority; normal days permit three total. Exact note titles are included in saved task titles and the chosen HTTPS URL is retained. All other existing daily-plan behaviour remains in the original component.

Run `node --test tests/summary-import.test.mjs`. Browser verification should cover paste, HTML import without executing active content, duplicate imports, selecting and editing priorities, adding to the actual plan, refresh persistence and full/closed-day handling. Use synthetic notes for public test fixtures. User data must not be committed.

Update cache identifiers when changing published modules. Refresh the SHA-256 manifest for the page and all active assets. The legacy exporter below now stops before overwriting an online edition with this extension; port the extension into the local app's source before re-enabling an export from that app.

Maintain the source in the installed Morning Launchpad project. Build that app, then run this repository's exporter with the generated `dist-links` directory:

```text
node scripts/export-launchpad.mjs <path-to-morning-launchpad/dist-links>
```

The exporter allows only the four assets referenced by the generated page and creates relative links so the page works in its GitHub Pages subdirectory. It also refreshes `docs/morning-launchpad-2026-09-15.sha256`. Review and publish those output files through the normal workboard release process. Do not recursively copy the local Launchpad folder.

### Structured AI tasks (15 September 2026)

The version 2 task file is the recommended input after the Evernote master prompt is applied in chat. Raw HTML remains a basic extraction path; the website contains no AI service and makes no email or Evernote requests. The downloadable `morning-launchpad/launchpad-ai-prompt.md` documents the workflow and schema. Personal task files and briefings must remain outside this public repository.

The original inbox key is retained for automatic, non-destructive version 1 migration. Validation now accepts version 2 task fields: stable taskKey, priority, nextAction, deadline/event/follow-up dates, date uncertainty, owner, waitingOn, instruction, related source titles, dependency keys and a concrete help request. A briefing snapshot can be included in the file. Dates are validated as real calendar dates; links remain HTTPS-only.

Four task views display Today, Coming up, Waiting and Later. Coming up includes dated waiting items, so their registration or response deadlines remain visible. Waiting follow-ups and overdue deadlines return to Today. Users can edit fields or mark tasks done. Editing sets per-field overrides; subsequent AI imports refresh untouched fields while retaining overrides, local IDs and progress. Exact task keys or exact source-title/action matches deduplicate imports. Matching basic review entries are preserved under Earlier imports, rather than deleted. Missing tasks in a later file are not automatically removed.

Imported daily-plan tasks use `summary:<local task id>` IDs. The bridge passes read-only plan history and Sydney day to the importer; all daily-plan mutations still go through the existing React conflict-safe saver. Completion in the plan is reflected in the task list, and unfinished tasks are available for review on later days. Restoring and completing a task from its card also update the current day's matching plan item. Closed days require reopening before changes. Dependency tasks cannot be selected for today until their prerequisites are marked complete.

The task backup includes richer fields, overrides and the briefing. Daily plan history retains its existing separate backup control. Progress remains in each browser and does not automatically synchronise between computers.

### Own notes and completed tasks

Use **Add my note** to save a title and note text, with an optional action and due date. Reference notes live in **My notes**; actions also appear in the appropriate task view. **Edit my note** updates active personal notes. They are browser-local and included in **Export task backup**, and are kept separate from imported source notes.

**Mark done** opens the visible **Done** view and confirms the saved task title. **Put aside** has a separate view. Earlier basic imports are labelled inactive; duplicate references cannot be restored accidentally. Exact action matching recognises combined source titles and empty trailing Link labels while preserving edits, completion and plan references.

The task-action text boxes use larger, semibold text (20 px desktop, 18 px narrow screens), a stronger green border and a contrasting background. Other fields retain their existing styling.
