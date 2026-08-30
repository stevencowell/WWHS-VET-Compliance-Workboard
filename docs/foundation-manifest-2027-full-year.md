# 2027 full-year foundation manifest

## Purpose

Extend the accepted Term 1 operating-cycle pattern into one calm, source-bound WWHS VET Compliance Workboard for the whole 2027 school year. The workboard is a privacy-safe workflow and launch layer: it sequences staff action, makes unresolved ownership visible and points to authorised systems. It is not an RTO record, a shared team database, an assessment instrument or proof that a learner, course or school is compliant.

The controlling operating contract is `docs/source-map-2027-full-year.md`. Where a task depends on an unpublished or inaccessible local source, the foundation exposes a verification gate rather than substituting a date or requirement.

## Owned foundation and routes

- `assets/js/data/term1-2027.js` owns the generated 2027 operating model: four terms, twelve gates, independent weekly occurrences, annual controls and fresh interrupt templates. The historical filename is retained to avoid an unnecessary script-path migration; `window.VET_WORKBOARD.operatingCycle2027` is the current model and `termOne2027` is only a compatibility alias.
- `assets/js/app-v2.js` owns the dependency-cleared queue, selected-term and selected-week views, date-window enforcement, waiting/exception metadata, independent verification, privacy-safe state normalisation and compatible backup migration.
- `assets/css/site.css` owns the responsive four-term, gate, week and task presentation.
- `assets/js/data/config.js` owns product identity, build compatibility, stable storage namespace and approved system front doors.
- `assets/js/data/reference.js` and `assets/js/data/tasks.js` remain the controlling reference and canonical task registers used by generated 2027 instances.
- `index.html` owns the connected gateway and navigation. `#cycle-2027` is the canonical annual route. `#term1-2027`, `#term2-2027`, `#term3-2027` and `#term4-2027` are stable selected-term routes; the earlier Term 1 bookmark remains compatible.
- `head-teacher-tas/` remains the connected but separately scoped Head Teacher TAS wing.

## Source boundary

| Domain | Foundation treatment |
| --- | --- |
| NSW 2027 calendar | Uses published Eastern Division student windows and published school-development-day openings as the annual scaffold. Every term still requires the live WWHS/Sentral calendar check. |
| 30 June VET entry control | Uses the current NESA ACE Rule 14.2 prohibition on Stage 6 VET entries after 30 June. The 2027 control has a 28–30 June action window and a fixed 30 June deadline. |
| Other NESA actions | Remain current-source gates because the public Timetable of Actions had not published a 2027 set at the source-map freeze. No 2026 date is inherited. |
| RTO 90333 requirements | Remain authenticated current-source gates. The available public manual is a 2025–2026 source and does not authorise 2027 due dates. |
| WWHS dates and roles | Meeting, reporting, placement, trial, graduation, allocation, deputy and verifier facts remain gated to the current WWHS/Sentral calendar and formal Principal delegation. |
| Assessment and competency | The RTO/qualified assessor and authorised owner systems remain authoritative. The site stores no competency judgement, learner result or controlled assessment content. |
| Workplace learning | Uses the current Department procedure's relative sequence: approved preparation before placement; contact on Day 1 or 2; formal incident action within 24 hours where required; post-placement review as soon as practicable and within four weeks. Actual dates, hours, providers and learner arrangements remain local/source-gated. |

## Annual structure

The foundation exposes twelve progressive gates without showing all annual work at once.

| Term | Published scaffold | Gates | Weekly controls |
| --- | --- | --- | --- |
| Term 1 | Staff setup from 28 January; students 3 February–9 April | 1 Sources and roles; 2 Delivery ready; 3 Learners ready; 4 First assurance; 5 Delivery assurance; 6 Term 1 close | Weeks 1–10 |
| Term 2 | Staff development 27–28 April; students 29 April–2 July | 7 Mid-year data and reports; 8 30 June and Term 2 close | Weeks 1–10 |
| Term 3 | Staff development 19 July; students 20 July–24 September | 9 HSC and progressive outcomes; 10 Term 3 close | Weeks 1–10 |
| Term 4 | Staff development 11 October; students 12 October–20 December | 11 Final outcomes and records; 12 Annual assurance and handover | Weeks 1–11, including the final student day |

The one-step view presents only the next date-open, dependency-cleared action. The experienced view exposes the selected term and week from the same state. Future controls remain visible for planning but cannot be closed early.

## Role and accountability foundation

- Leadership controls are accountable to the Head Teacher VET and/or VET Coordinator, performed by the Coordinator or Coordinator Assistant, and verified by the Head Teacher VET or Principal/authorised delegate.
- Annual activation controls are accountable to the Principal or authorised delegate, performed by the Head Teacher VET/Coordinator/Assistant and verified by the Principal or authorised delegate.
- Weekly, term and annual assurance closures require a different authorised person to verify the work.
- A displayed role, assignment or browser-local hand-off does not create authority. The Principal must confirm the actual 2027 role, deputy, access, escalation and independent-verifier split.
- Hand-offs use ordered saved states only: none, sent, accepted or returned, then verified.

## Recurrence and interrupt foundation

- Each school week owns a separate RTO-notice control, focused operational tasks and a separately verified weekly close. A later week never reuses an earlier completion record.
- Each term begins by accepting the previous handover and refreshing current RTO, NESA, school-calendar, role and delivery-state sources.
- Progressive evidence, cross-system reconciliation, trainer readiness, SBAT, workplace learning, privacy, validation and improvement controls recur where the source map identifies a continuing risk.
- Nine source-bound interrupt templates create fresh 2027 occurrences for workplace learning, delivery change, new-course authority, enrolment change, support/RPL, incident response, coordinator handover, discrepancy/corrective action and validation/improvement.
- Interrupts can pre-empt the normal guided queue. They keep the formal incident, assessment, learner and evidence record in the authorised owner system.

## Dependency, date and exception controls

- Missing prerequisite IDs fail closed. Ordinary dependencies may be bypassed only by a verified, privacy-safe owned official-system exception; hard dependencies and earlier gates cannot be bypassed.
- Generated term-opening, weekly update, weekly close and term-assurance controls retain hard sequence dependencies so an entire period cannot be made green by closing one downstream card.
- Verified and not-applicable closure is rejected before a task's opening window.
- The 30 June Stage 6 entry control is `exception-only` after its authorised window. A missed statutory control cannot be converted into a late normal-green completion.
- Verified closure requires all action steps, a privacy-safe owner-system reference, current-source confirmation, the stated `Done when` confirmation and a verifier. Independent tasks additionally require a different authorised checker.
- Not-applicable closure requires current-source confirmation, authority reference, privacy-safe reason and verifier; independent controls retain the different-person requirement.
- Waiting and exception work requires a role/system owner and chase date. Critical waiting/exception work also requires an escalation date. Due chase and escalation records return to the priority queue.

## Privacy, storage and migration boundary

- The browser stores only allowlisted workflow metadata: task state, checked steps, privacy-safe references, role assignment, chase/escalation dates, hand-off state, bounded history, gap state and interrupt-occurrence identity.
- Import normalisation allowlists state, record, history and occurrence fields. Unknown or private sentinel fields are discarded rather than carried through another backup.
- Export contains privacy-safe workboard metadata only. Authenticated/private link overrides, official evidence and personal information are explicitly excluded and remain device-local or in the owner system.
- The stable storage namespace remains `wwhs-vet-compliance-workboard:v3` to protect existing local evidence trails.
- The full-year build accepts its own schema-3 backup, the accepted Term 1 prototype and the accepted 2026 schema-3 build. A Term 1 import preserves valid Term 1 records and occurrences without overwriting newer Term 2–4 state; a 2026 import maps only recognised 2026 records. Neither migration imports authenticated links.
- Shared team state remains `not-connected`. Browser state must not be represented as the current state of another staff member's work.

## Connected Head Teacher TAS wing

The formal gateway presents VET Compliance and Head Teacher TAS as related areas with different operating authority. The VET header/navigation links to `head-teacher-tas/`; that wing returns to Operations home and exposes a companion VET entry. Its existing local-state and procedure-only privacy controls remain separate from the VET storage namespace. The 2027 expansion must not convert Head Teacher TAS work into VET compliance work or silently update its dated 2026 baseline.

## Activation gaps

Publication of this privacy-safe candidate does not activate 2027 operations. Before staff treat it as the live annual register, an authorised school process must record:

1. the published 2027 NESA Timetable of Actions and applicable HSC dates;
2. current authenticated RTO 90333 term guides, notices and controlled instructions;
3. the complete 2027 WWHS/Sentral calendar and every affected local date;
4. formal Principal delegation for roles, deputies, access, escalation and verifier separation;
5. successful signed-in testing of every work-account front door and sharing boundary; and
6. either a school-approved shared action register or formal acceptance that status remains device-local.

## Foundation handoff and invalidation

Stage 12 may integrate and freeze the full-year candidate only after syntax, task/dependency/source integrity, storage migration, privacy, route, keyboard, print and exact-390-pixel shell tests pass. The photograph target remains 0 because this is a staff operations workboard, not a student learning package; visual quality is assessed through hierarchy, status clarity, contrast, focus, touch targets, containment and print.

Re-open the source map and invalidate affected controls whenever a controlling source changes a date, sequence, role, evidence destination, escalation model or system boundary. Release authority does not override these activation gates.
