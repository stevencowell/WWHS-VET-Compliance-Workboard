# 2027 full-year integration manifest

## Candidate identity and state

- Product: WWHS VET Compliance Workboard.
- Base repository commit before the local 2027 work: `8c87bfe6b67774ca9670a130f66a53f814fd9808`.
- Build ID: `wwhs-vet-compliance-workboard-2027-full-year-v1`.
- Candidate route: `#cycle-2027`; selected-term routes are `#term1-2027` through `#term4-2027`.
- Source contract: `docs/source-map-2027-full-year.md`.
- Foundation contract: `docs/foundation-manifest-2027-full-year.md`.
- Current integration state: local candidate under active source-bound verification. It is not accepted merely because this manifest exists.
- Freeze state: the current LF-canonical VET candidate digest is `c6fbb4236e4dcadff317901e80a31ccaaa4af05f7932471cc5261f41809a933f`; the separately frozen LF-canonical Head Teacher TAS runtime digest is `32bf370df5ca50c6cc1bdee929c814dc547a6b8503ec8f6a30b46d68e04df8dd`. Both are under fresh independent audit and are not accepted merely because the hashes exist. Any later candidate/runtime change invalidates the affected digest and audit.

## Integrated files and boundaries

The final candidate digest must cover, at minimum, the following shared runtime and full-year contract inputs in a fixed order:

1. `index.html`
2. `assets/css/site.css`
3. `assets/js/app-v2.js`
4. `assets/js/data/config.js`
5. `assets/js/data/tasks.js`
6. `assets/js/data/term1-2027.js`
7. `assets/js/data/reference.js`
8. `docs/source-map-2027-full-year.md`
9. `docs/foundation-manifest-2027-full-year.md`

Audit reports, hash-helper files and this integration manifest are not candidate inputs. The exact excluded helper `docs/candidate-digest-2027-full-year.sha256` contains the nine VET path/hash lines above in that order; hashing its canonical LF/tab bytes produces the VET digest. The separately excluded helper `docs/connected-head-teacher-runtime-2027-full-year.sha256` covers `head-teacher-tas/index.html`, CSS, data and application files in that order; hashing its canonical LF/tab bytes produces the connected-wing digest. This split prevents a VET audit from concealing an unrelated wing change.

## Current generated inventory

At this integration pass, the source model generates:

- 12 annual gates across four school terms;
- 10 Term 1 weeks, 10 Term 2 weeks, 10 Term 3 weeks and 11 Term 4 weeks;
- 176 planned 2027 task instances: 11 annual/setup, 41 Term 1, 41 Term 2, 41 Term 3 and 42 Term 4;
- 9 fresh-occurrence interrupt templates;
- 62 planned controls requiring independent verification;
- 90 planned controls with one or more hard dependencies; and
- one fixed late-mode control: `2027-t2-w10-entry-cutoff`, open 28–30 June 2027, due 30 June and `exception-only` after the window.

These counts are integrity evidence for the current generated model, not a compliance claim. Recalculate them at freeze; a mismatch requires investigation and a refreshed manifest/digest.

## Integrated operating sequence

| Gates | Term purpose | Integrated control outcome |
| --- | --- | --- |
| 1–2 | Sources, roles and delivery readiness | Preserve 2026, open clean 2027 instances, verify current sources/calendar/delegation/access, then confirm profile, trainer, delivery and controlled-resource readiness. |
| 3–6 | Learners, first assurance, delivery assurance and Term 1 close | Establish authorised enrolment/onboarding/support/privacy controls; run weekly RTO and operational cycles; close Term 1 only through an independently checked handover. |
| 7–8 | Mid-year data/reports and 30 June/Term 2 close | Reconcile qualification, SBAT, USI, competency, evidence and reporting work against live owner-system state; audit Stage 6 entries and enforce the NESA ACE 14.2 cut-off. |
| 9–10 | HSC/progressive outcomes and Term 3 close | Refresh unpublished NESA/RTO/local dates before acting; reconcile progressive outcomes, exam-entry state, applicable estimates, placement and HSC delivery through controlled systems. |
| 11–12 | Final outcomes/records and annual assurance/handover | Complete source-gated final data, reporting, markbook, record, privacy, validation, finance/planning and 2028 handover controls through the final student day. |

Each term exposes only its own gate strip, weekly controls and selected work. The guided route still draws from the entire dependency/date model, so a user cannot bypass the annual sequence by navigating directly to a later term.

## Integrated role, recurrence and exception controls

- Role/accountability data is preserved on every generated instance. Annual activation uses Principal/delegate accountability; operational work uses the Head Teacher VET/Coordinator structure; the Coordinator Assistant remains a doer rather than receiving invented authority.
- Weekly RTO notice, operational focus and assurance records are independent occurrences. Term openings refresh sources and accept the previous handover. Term and annual closures require a different authorised verifier.
- Interrupt templates create a new privacy-safe identity per occurrence and can pre-empt the normal queue. Their formal evidence stays in the authorised incident, placement, RTO, school or learner-support system.
- Dependency resolution fails closed for missing IDs. Hard dependencies and earlier gates cannot be bypassed. An ordinary prerequisite may be bypassed only through a verified owned exception with a privacy-safe reason.
- Future tasks may be inspected but cannot close verified or not applicable before their window. The 30 June late-mode rule rejects ordinary green closure after the authorised date.
- Waiting/exception records require owner plus chase date; critical work also requires escalation. Not-applicable closure requires current-source authority and does not function as a quick skip.
- Browser-local hand-offs advance through saved transitions rather than allowing a direct jump to accepted or verified.

## Privacy-safe state and compatibility integration

- State, records, bounded history, assignments, gaps and interrupt occurrences are reconstructed from explicit allowlists. Unknown top-level and nested fields are not re-exported.
- Completion metadata is limited to status, checked actions, privacy-safe official-record reference, verifier, source/`Done when` confirmation, independent check, dependency exception, chase/escalation, waiting owner and hand-off state.
- Export declares its exclusions and omits all authenticated link overrides. It is a continuity backup, not an RTO submission, learner record or shared-register snapshot.
- Same-build restore replaces portable state only after normalisation while retaining this device's approved links.
- Term 1 prototype restore merges recognised annual/Term 1 task records and valid fresh occurrences while preserving newer Term 2–4 work. Accepted 2026 restore merges only recognised canonical 2026 task state. Unsupported products, schemas or build IDs are rejected.
- The stable `:v3` storage key preserves accepted local history while build ID/versioning distinguishes the full-year model.

## Connected Head Teacher TAS integration

- The gateway remains a formal choice between the VET Compliance and Head Teacher TAS wings.
- VET navigation reaches `head-teacher-tas/`; the companion wing returns to Operations home and links back to the VET workboard.
- Head Teacher TAS retains its own storage, source baseline and procedure-only workflows. The 2027 VET expansion does not merge records, roles or compliance status across wings.
- Connected-wing regression evidence must cover its landing page, main routes, reciprocal navigation, mobile drawer, keyboard Escape/focus return, privacy wording, local backup boundary and absence of runtime/console errors.

## Known controlled exceptions and activation gaps

- The current public NESA source did not yet contain the 2027 Timetable of Actions. Every affected date remains a live-source verification gate.
- A complete approved 2027 RTO coordinator pack and complete WWHS/Sentral staff calendar were not available to this static candidate. No prior-year operational deadline is treated as a 2027 fact.
- Principal delegation, deputies, role split, escalation and independent-verifier authority remain locally controlled.
- Shared authenticated team state is not connected. The site remains truthful about device-local status.
- Work-account front doors still require signed-in staff acceptance in the intended school environment.
- The 30-photograph supplementary-course floor is not applicable. This product contains no student learning package and uses no photographs as compliance evidence.

These exceptions permit a clearly labelled privacy-safe public workflow candidate; they do not permit operational activation or a claim of full-year compliance.

## Required freeze and acceptance evidence

Before release, one exact candidate digest and a separate connected-wing digest must pass fresh, independent Stages 14–16. Acceptance must include at least:

1. **Source and model integrity:** JavaScript syntax; unique task/occurrence IDs; no missing source/canonical/dependency IDs; correct 10/10/10/11 week boundaries; no inherited 2020–2026 due dates; exactly one authorised fixed 2027 VET date unless the source map is refreshed.
2. **Sequence enforcement:** clean annual rollover; all 12 gates; prior-term and prior-week hard locks; future-date visibility without early closure; missing dependencies failing closed; independent closure; chase/escalation resurfacing; interrupt pre-emption; and 30 June exception-only late behaviour.
3. **Completion safety:** verified, waiting, exception and not-applicable validation; different-person verification; ordered hand-offs; owner-system references without copied evidence; no route that makes an unsupported control green.
4. **State/privacy:** same-build restore; Term 1 and 2026 compatible merge; preservation of newer work; authenticated links remaining device-local; malicious unknown/private sentinel fields stripped on import and absent from export; repeated event occurrences remaining independent.
5. **Functional routes and links:** gateway, annual and four term routes, Today/Year/Workflows/Systems/Issues context, role views, setup, all 41 week controls, every configured system link, print/export/import and the connected Head Teacher TAS wing without blank destinations or console/page errors.
6. **Visual and accessibility:** calm one-action view; experienced selected-term/week view; visible focus; named controls; keyboard-only operation; drawer/dialog Escape and focus return; contrast/touch targets; print boundary; exact 390 CSS pixel containment with no horizontal overflow; representative laptop and mobile rendered evidence for all four terms and the connected wing.
7. **Truthful wording:** public training-preview and device-local limitations remain visible; NESA/RTO/WWHS facts stay source-gated; no learner/assessment/incident/private content is exposed; no text claims that the workboard proves competence or compliance.

If any acceptance finding changes a candidate-source file, recalculate the digest and rerun every affected audit. Content, visual and operational acceptance must name the exact final digests. No producer self-certification substitutes for those records.

## Release and live-verification gate

Steve has authorised commit, push and GitHub Pages publication only after the exact expanded candidate is accepted. The release record must keep these states separate:

- **Local accepted:** exact VET and connected-wing digests, passing reports and clean scoped diff.
- **Committed:** commit hash containing only the accepted scoped work.
- **Pushed:** intended remote branch contains that commit.
- **Deployed:** GitHub Pages has served the pushed revision.
- **Live verified:** cache-busted rendered inspection confirms the gateway, 2027 annual/term routes, connected Head Teacher TAS wing, live asset revision, privacy boundary, keyboard paths and exact-390 layout.

A successful push or HTTP 200 is not rendered acceptance. If deployment bytes or rendered behaviour differ from the accepted digests, stop, correct or redeploy, and repeat the affected verification.

## Invalidation rules

Invalidate this integration record when any candidate input changes, a controlling source changes the displayed sequence/date/role/evidence destination, storage compatibility changes, shared state is connected, a new system front door is introduced, or a route/accessibility/privacy test regresses. Operational activation remains a separate school-authority decision after publication.
