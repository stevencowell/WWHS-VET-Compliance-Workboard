# WWHS VET Compliance Workboard — Stage 14 content audit R3

## Audit identity

- **Verdict:** `PASS`
- **Audit date:** 30 August 2026
- **Frozen VET manifest:** `docs/candidate-digest-2027-full-year.sha256`
- **Bound VET digest:** `c6fbb4236e4dcadff317901e80a31ccaaa4af05f7932471cc5261f41809a933f`
- **VET inputs:** 9, in the fixed order declared by `docs/integration-manifest-2027-full-year.md`
- **Frozen connected-wing manifest:** `docs/connected-head-teacher-runtime-2027-full-year.sha256`
- **Bound Head Teacher TAS digest:** `32bf370df5ca50c6cc1bdee929c814dc547a6b8503ec8f6a30b46d68e04df8dd`
- **Connected-wing inputs:** 4, in the separately declared order
- **Audit boundary:** Read-only Stage 14 audit of the complete current LF-canonical candidate against `docs/source-map-2027-full-year.md`, `docs/foundation-manifest-2027-full-year.md`, `docs/integration-manifest-2027-full-year.md` and the senior VET supplementary content contract. The integration record, digest helpers and audit reports are excluded from candidate inputs.

## Freeze and publication-byte verification — PASS

1. `node qa/candidate-digest.cjs --verify` reproduced both exact digests above.
2. An independent PowerShell pass recalculated every listed raw file hash: **9/9 VET** and **4/4 connected-wing** entries matched.
3. Direct SHA-256 of each canonical LF/tab manifest reproduced its aggregate digest:
   - VET: `c6fbb4236e4dcadff317901e80a31ccaaa4af05f7932471cc5261f41809a933f`
   - Head Teacher TAS: `32bf370df5ca50c6cc1bdee929c814dc547a6b8503ec8f6a30b46d68e04df8dd`
4. All 13 bound text inputs contain LF line endings and **zero carriage-return bytes**.
5. `.gitattributes` resolves each bound HTML, CSS, JavaScript and Markdown input to `text eol=lf`.
6. For all 13 inputs, `git hash-object --no-filters` and `git hash-object --path=<file>` produced identical Git blob IDs. Git's clean filter will therefore not alter the accepted raw bytes when staged.
7. JavaScript syntax passed for all seven bound JavaScript inputs.

The producer reported that R2 was mechanically line-ending-normalised after release preflight. No raw pre-normalisation snapshot was retained, so this independent report does **not** claim a byte-by-byte proof of that historical delta. That absence is not used as an assumption: R3 fully re-audits and accepts the complete current candidate on its own exact digests.

The R2 report is superseded for release purposes but remains preserved as audit history.

## Current-candidate content acceptance

### Source and sequence fidelity — PASS

- `node qa/full-year-structure.cjs` passed with **176 tasks**, **59 canonical tasks**, **48 mapped sources**, **4 terms**, **41 weekly control points** and **12 gates**.
- Term structure is 10/10/10/11 weeks. Task IDs, canonical IDs, source IDs and dependencies resolve; the graph is acyclic and has no reverse term/week edge.
- Fresh checks of the [NSW Department of Education 2027 calendar](https://education.nsw.gov.au/schooling/calendars/2027) confirm the candidate's Eastern student windows: Term 1 3 February–9 April, Term 2 29 April–2 July, Term 3 20 July–24 September and Term 4 12 October–20 December. Development-day openings remain scaffold dates, not invented NESA, RTO or WWHS deadlines.
- The public [NESA Timetable of Actions](https://www.nsw.gov.au/education-and-training/nesa/key-dates/timetable-of-actions) still publishes 2026 material at the audit date. The candidate imports no 2026 NESA deadline into 2027 and leaves affected actions behind current-source gates.
- The only fixed 2027 VET due date is **30 June 2027** for Stage 6 VET entries, source-bound to [NESA ACE Rule 14.2](https://curriculum.nsw.edu.au/ace-rules/ace14/vet-entries). Its late mode permits an owned exception only, not a normal green closure.
- [NESA ACE Rule 14.3](https://curriculum.nsw.edu.au/ace-rules/ace14/vet-units) confirms that RTOs determine unit-of-competency outcomes. The workboard preserves that assessor/RTO boundary.
- Workplace-learning controls reconcile to the current Department checklist: preparation before placement, documented student/host contact on day one or two, post-placement review as soon as practicable and within four weeks, and formal incident action in the authorised incident process.

### Roles, authority and completion controls — PASS

- Accountable, doer and verifier roles remain distinct. The VET Coordinator Assistant is never assigned as the accountable or verifier role in the 2027 model.
- Principal/delegate authority, school delivery authority, trainer/assessor readiness and the local Coordinator/Assistant/deputy split are explicit gates rather than invented delegations.
- Sixty-two tasks require different-person independent verification; ninety tasks carry hard dependencies. Each later term is locked to the preceding verified term close.
- Every 2027 task has a live-source verification instruction and privacy-safe evidence-pointer type.
- A fresh no-write functional run passed **9/9 scenarios** with zero runtime errors: four-term routes, date refresh and future locking, cross-term locks, missing dependencies failing closed, verified/not-applicable guards, independent verification, critical waiting/exception ownership and escalation, the hard 30 June late rule, ordered hand-offs and unique workplace occurrences.

### Evidence, privacy and controlled material — PASS

- Official evidence remains in Evidence Central, Schools Online, VET Schools Hub, approved school/RTO records and authorised workplace-learning or incident systems. Browser state is limited to status, role, dates and a bounded safe reference.
- No wording makes a tick, saved status, export or system agreement proof of competence, evidence sufficiency or compliance.
- No student names, USIs, health/support information, assessment evidence, outcomes, host/incident details, staff credentials, passwords, direct private Drive document/folder IDs or controlled assessor packages were found in the public candidate.
- Authenticated links remain staff front doors with existing sign-in and permission boundaries. Work-account Google Drive searches are used where private direct IDs must not be published.
- Static scans found no placeholder URL, blank configured system destination, `href="#"`, TODO/FIXME destination or republished controlled package.

### Connected Head Teacher TAS boundary — PASS

- All 21 Head Teacher TAS system records have non-blank HTTPS destinations.
- The wing clearly labels its dated 2026 baseline, uses separate browser storage and authority, and never converts TAS completion into VET compliance status.
- Its four runtime inputs are independently frozen under the connected digest above rather than being concealed inside the VET content digest.

## Retained authority gates — not Stage 14 defects

This `PASS` applies to publication of the clearly labelled training-preview candidate. It does not authorise operational activation or establish full-year compliance. Six gates remain explicit:

1. import and independently verify the published 2027 NESA Timetable of Actions when available;
2. reconcile each term against current authenticated RTO 90333 guidance and later Hub notices;
3. reconcile the complete WWHS/Sentral 2027 operational calendar without treating NSW term windows as local deadlines;
4. approve the Principal/delegate role matrix, deputy coverage, access and verifier delegations;
5. approve either a shared authenticated action register or a formal device-local operating decision; and
6. test every protected launcher while signed in with the authorised education account and confirm its destination and permission boundary.

## Final disposition

`PASS` for Stage 14 content acceptance of VET digest `c6fbb4236e4dcadff317901e80a31ccaaa4af05f7932471cc5261f41809a933f`, with connected Head Teacher TAS digest `32bf370df5ca50c6cc1bdee929c814dc547a6b8503ec8f6a30b46d68e04df8dd` independently reproduced. There are no open Stage 14 content findings. Any change to a bound input or controlling source invalidates the affected checks and requires a fresh digest-bound audit.
