# Dashboard and AI Admin improvements

Prepared on 14 September 2026 from upstream commit `d5a3cb6b26c6c8923d1af6e25b81eb261477199c`. Steve approved this tested version for live publication on 14 September 2026.

## Result

- The operations home is a two-wing entrance. VET and Head Teacher TAS each have a separate dashboard, navigation, search, everyday links and administration pathway.
- VET shows the five requested everyday links: Evidence Central, Schools Online, VET Hub, Document Library — Courses and Document Library — VET Coordinator. TAS shows Sentral, Staff calendar, TAS Drive, the Head Teacher guide and the faculty plan, with search/portal destinations labelled honestly.
- The Courses shortcut uses the distinct course-training-assets PowerApp confirmed through the Head Teacher source document and authenticated library. The Coordinator shortcut retains the RTO procedures PowerApp.
- Search finds systems, mapped guide sections, work areas and task dialogs within the current wing. Home stays within that wing; Choose wing returns to the operations entrance.
- VET has its own home at `#vet-home`, with Today, annual cycle, workflows, systems, issues and AI Admin. TAS keeps its own home and faculty, teaching, reporting, people and calendar routes. VET Today is a stable daily view independent of the saved 2027 planning view. The August 2026 guided snapshot remains available as a labelled reference.
- Today distinguishes recorded follow-ups, dated reminders and past dates without a recorded status. Missing browser progress does not imply missed work. Dates remain source-dated reminders, not a live school or RTO feed.
- Each wing has role-specific AI starter prompts for meetings, notices, message drafts, document currency and handovers. VET also includes evidence-review preparation. Prepare job shows the required inputs and full prompt. Copy prompt includes a manual-copy fallback.

## Boundaries and maintenance

AI Admin does not activate an agent or connected service. The user copies a prompt into Codex or ChatGPT and provides the current sources. Future skills, tools and activation should be connected one job at a time after the workflow is tested.

The reusable dashboard and AI menu are in `assets/js/dashboard.js`, `assets/js/ai-admin.js` and their corresponding stylesheets. Each entry page loads only its own workboard data and application controller. Each workboard retains its own storage schema, verification rules and backup behaviour. Links honour the existing schema and link-default version checks.

Official evidence stays in authorised systems. No account credentials, student records or source-document contents are added. This release publishes only the approved dashboard, AI menu and supporting documentation; it does not send messages or update official records.

## Verification history

The initial dashboard browser integration suite passed 44 checks covering shortcut destinations, search and task opening, stable Today navigation, saved progress, local link overrides, AI routes, clipboard contents and fallback, and desktop/mobile layouts. The subsequent wing separation receives its own focused browser review of the hub, each wing, role-specific search and prompts, storage preservation and navigation.

The two-wing layout passed 82 browser checks and 24 scoped dashboard checks. These verified the two-card entrance, distinct everyday links, current-wing task searches, Home/Choose wing navigation, role-specific AI prompts and job counts, clipboard fallback, existing saved records and link settings, legacy task routes, and desktop/mobile layouts. The two entry pages load only their own task data. No browser errors or missing local assets were observed.

Another 17 focused Head Teacher state/date/navigation checks and 19 shared-link/2027-date regression checks passed, along with JavaScript syntax and whitespace checks. The regressions cover stale link settings and upcoming/elapsed 2027 task windows. Existing historical release manifests describe the earlier upstream release; they are not acceptance evidence for this candidate.

The current runtime fingerprints are `dashboard-vet-2026-09-14.sha256` and `dashboard-head-teacher-2026-09-14.sha256` in this directory. Each covers its entry page and every directly loaded stylesheet and script, including shared dependencies. Files use canonical LF line endings and are checked against staged Git contents before publication.
