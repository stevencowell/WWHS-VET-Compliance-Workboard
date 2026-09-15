# Online Morning Launchpad

Address: https://stevencowell.github.io/WWHS-VET-Compliance-Workboard/morning-launchpad/

The online edition provides app links, a task list and personal notes. It has no account login. Imported notes, tasks, pins, favourites and appearance settings stay in the visitor's browser; they are not uploaded or synchronised between computers. The Content Security Policy blocks background network requests. Never commit personal task files, briefings, mail, browser data or backups to this public repository.

The TAS/VET Hub links to this page. Main Page is an outgoing shortcut only. Local and online addresses have separate browser storage.

## Task list and pins

The separate daily-planning panel has been removed. **Pin for today** saves immediately on the existing task card and brings it to the top of Today. **Unpin** keeps the task in its usual group. Pins use the Sydney calendar date, expire the next day, and are included in task backups. All pinned tasks remain visible above the other suggestions; there is no capacity selector, selection-and-add step or wrap-up action.

**Mark done** saves the task in **Done**, clears its pin and opens the Done view. **Review again** restores active work. **Put aside** has a separate view. Prerequisite tasks must be completed before pinning dependent work.

The original `morning-launchpad-summary:v1` storage key is retained. The first load migrates older daily-plan tasks into this list, reconciles existing task references and completion, and pins unfinished tasks from today's older plan. Migration is recorded with `pinWorkflowVersion: 1` so old plan data cannot reset later edits or progress. The retired `morning-launchpad-routine:v1` store is never written or deleted. **Export older daily plans** downloads its original content, including commitments and historical details. If there are more records than fit in the 300-item task list, remaining records stay in that backup and the page explains the limit.

## Import and personal notes

The recommended workflow is Evernote HTML → AI processing in chat → structured JSON task file → Launchpad. The website itself is not an AI service and does not contact Evernote or email. `morning-launchpad/launchpad-ai-prompt.md` documents the input schema. Text, Markdown and raw HTML are also accepted as basic extraction paths. HTML uses an inert template, active content is removed, and only text and validated HTTPS links reach the page.

Version 2 task fields include stable keys, priority, next action, deadline/event/follow-up dates, date uncertainty, owner, waiting-on text, instructions, related titles, dependencies and help requests. Dates are validated. Today, Coming up, Waiting and Later organise active work. Coming up includes dated waiting items; due deadlines and follow-ups also surface in Today.

Reimports retain local IDs, pins, completion and per-field user overrides, while updating untouched fields. Missing items are not automatically deleted. Exact source/action matches deduplicate imports; old basic entries are retained under Earlier imports. Duplicate references cannot be restored accidentally.

**Add my note** saves a title and notes with an optional action and due date. Reference notes live in **My notes**; actions also appear in task views. Personal notes stay separate from imported source notes. **Export task backup** includes tasks, personal notes, pins, overrides and the briefing snapshot. Use it to move work to another browser.

Action boxes use semibold 20 px text (18 px on narrow screens), a strong green border and a contrasting background. The established card layout is retained.

## Calendar

**Calendar** opens Day, Week, Month and Year views; **Back to tasks** returns to the existing list. Weeks start Monday. Today, previous/next and the date picker navigate the calendar. Year days open Day; month headings open Month. All calendar times use Australia/Sydney, including daylight saving.

Task deadlines, event dates and follow-up dates are derived directly from the current inbox. Completed dates remain labelled; superseded and put-aside tasks are excluded. Clicking a task date opens its source information. **Save task date** changes the matching field on the task card; **Open source task** returns to that exact card. Derived entries are not stored as copies.

**Add event** supports title, dates, optional times, notes, location and an HTTPS work link. Own/imported events use the independent browser key `morning-launchpad-calendar:v1`. **Import dates** accepts one-off .ics events, CSV dates (including Australian DD/MM/YYYY and common Outlook column headings), and calendar JSON backups. Matching UIDs update events on reimport. Recurrences, cancellations and duration-only ICS records are rejected with an explanation before any changes; export those as individual dated occurrences. Unsupported timezones are also rejected rather than guessed.

The calendar accepts up to 10,000 saved events across imported calendars and manual entries; the 5 MB file limit and actual browser storage quota still apply. Imports validate the complete result before saving, and a failed save leaves existing events unchanged. The same event limit applies when restoring backups and reloading saved data.

**Export calendar backup** saves own/imported events; task dates remain in the task backup. **Export dates (.ics)** includes both own events and derived task dates. Reimporting an export skips matching current task-date UIDs to avoid duplicates. The app does not send invitations, synchronise to external calendars or create reminders.

Calendar source files are `calendar-core.mjs`, `launchpad-calendar.mjs` and `calendar.css`. Calendar tests cover leap days, date boundaries, live task-date derivation, CSV parsing, ICS exclusive all-day ends, timezone conversion, import identity and export roundtrips. Date-file handling follows the relevant parts of RFC 5545: https://www.rfc-editor.org/rfc/rfc5545.

## Maintenance

Maintained application sources are `summary-core.mjs`, `summary-import.mjs` and `summary-import.css` in `morning-launchpad/assets`. The built React entry renders the app links and `<summary-import>`. It no longer mounts the daily-plan component or imports the old `summary-bridge.mjs`; that file is retained only for historical reference. The original installed app source is not in this repository.

Run `node --test tests/summary-import.test.mjs tests/calendar.test.mjs`. Relevant coverage includes safe imports, merging and completion, legacy migration, pin persistence, date rollover and backup validation. Browser verification should cover pin/unpin, reload, completion and absence of the retired panel. Use synthetic data for public fixtures.

Update cache identifiers when changing published modules and refresh `docs/morning-launchpad-2026-09-15.sha256`. The legacy `scripts/export-launchpad.mjs` intentionally stops an older local build from replacing this maintained online edition. Port the current task workflow into the local source before re-enabling that export. Publish only the application files; never copy the full local Launchpad folder.
