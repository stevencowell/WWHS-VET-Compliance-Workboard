# TAS faculty allocations and timetable planning

The C16 workflow adds one annual duty with five steps: confirm the school milestones/contact; check approved classes and staff availability/qualifications in protected sources; prepare the matrix, room use and rotations; check conflicts and submit proposed corrections through the existing school process; confirm approval and hand over class readiness.

## Sources and limits

Guide C16 and its four linked resource identities were checked on 13 October 2026. The task links directly to the guide, C16 folder, matrix folder, EDVAL resources and timetable change instructions. Current school milestones, timetable lead, approved file versions and submission route remain unconfirmed. Historical EDVAL year folders do not establish current deadlines. No protected staff or student records are copied into the workboard.

The source register now contains 67 VET duties, 61 TAS duties and five weekly TAS checks (133 entries; 92 source records). The four C16 resources are included in the existing TAS source-checking group. The September whole-register audit date is retained; C16 is a focused addition, not a new audit of every source.

## Year semantics and preservation

- The 2027 occurrence is `2027-faculty-allocations-timetable::2027`. It becomes current at the existing Term 4 2026 boundary and remains the same occurrence through January 2027.
- Each later target year has its own explicit ID and record. Later cycles use October–December as an approximate Term 4 trigger, labelled for confirmation against the school calendar. No due date or school-calendar date is inferred.
- All TAS tasks includes each planning occurrence under both its preparation year and target year. Both filters use the same target-year completion tick; no duplicate record is created.
- Open saved older cycles remain visible when a new cycle begins. Completed older cycles stay complete. Future cycles are created before saved records are validated on a fresh load.
- Existing task IDs, checklist indices, state schemas, storage keys, date overrides, weekly checks, review ticks and completion records are unchanged. New data is written only by the existing user save/complete/restore actions.
- The five-step C16 copy and source panel are separate from the 29 provisional dated tasks copied from the 2026 calendar. Their source dates and editable schedules are unchanged.

## Verification

Focused Node tests cover Term 4 visibility, no invented due date, preparation/target-year filtering, January continuity, distinct future cycles through 2030, existing waiting cycles, early completion reviews, future-year cold reload and backup restoration, preservation of earlier records and saved dates, source coverage, authored copy and step guidance. The full Node suite passed 506 tests with no failures or skips (`node --test tests/*.test.mjs tests/*.test.cjs`). JavaScript syntax checks and `git diff --check` passed. Rebuilding the source-link payload is byte-stable. Browser and live-release verification are separate review steps.
