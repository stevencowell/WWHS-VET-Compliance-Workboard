# Dashboard and AI Admin improvements

Prepared on 14 September 2026 from upstream commit `d5a3cb6b26c6c8923d1af6e25b81eb261477199c`. Steve approved this tested version for live publication on 14 September 2026.

## Result

- Both workboards show the five everyday links first: Evidence Central, Schools Online, VET Hub, Document Library — Courses and Document Library — VET Coordinator.
- The Courses shortcut uses the distinct course-training-assets PowerApp confirmed through the Head Teacher source document and authenticated library. The Coordinator shortcut retains the RTO procedures PowerApp.
- Shared search finds systems, mapped guide sections, work areas and task dialogs across both workboards.
- Home retains two prominent workboard cards for VET and Head Teacher TAS beneath the everyday links, with smaller links to AI Admin, calendar/reporting, the annual cycle and all systems. VET Today is a stable daily view independent of the saved 2027 planning view. The August 2026 guided snapshot remains available as a labelled reference.
- Today distinguishes recorded follow-ups, dated reminders and past dates without a recorded status. Missing browser progress does not imply missed work. Dates remain source-dated reminders, not a live school or RTO feed.
- Six AI Admin jobs provide source-based starter prompts: meetings, notices, message drafts, document currency, handovers and evidence-review preparation. Prepare job shows the required inputs and full prompt. Copy prompt includes a manual-copy fallback.

## Boundaries and maintenance

AI Admin does not activate an agent or connected service. The user copies a prompt into Codex or ChatGPT and provides the current sources. Future skills, tools and activation should be connected one job at a time after the workflow is tested.

The shared dashboard and AI menu are in `assets/js/dashboard.js`, `assets/js/ai-admin.js` and their corresponding stylesheets. Both entry pages load passive data from both workboards, then their own application controller. Each workboard retains its own storage schema, verification rules and backup behaviour. Shared links honour the existing schema and link-default version checks.

Official evidence stays in authorised systems. No account credentials, student records or source-document contents are added. This release publishes only the approved dashboard, AI menu and supporting documentation; it does not send messages or update official records.

## Local verification

The browser integration suite passed 44 checks: correct shortcut destinations, search and task opening, stable Today navigation, saved VET and Head Teacher progress, local link overrides, both AI routes, exact clipboard contents after Windows line-ending normalisation, manual-copy fallback, and layouts at 1366px and 390px. No browser errors or missing local assets were observed. Desktop and mobile screenshots were visually reviewed.

Another 17 focused Head Teacher state/date/navigation checks and 19 shared-link/2027-date regression checks passed, along with JavaScript syntax and whitespace checks. The regressions cover stale link settings and upcoming/elapsed 2027 task windows. Existing historical release manifests describe the earlier upstream release; they are not acceptance evidence for this candidate.

The current runtime fingerprints are `dashboard-vet-2026-09-14.sha256` and `dashboard-head-teacher-2026-09-14.sha256` in this directory. Each covers its entry page and every directly loaded stylesheet and script, including shared dependencies. Files use canonical LF line endings and are checked against staged Git contents before publication.
