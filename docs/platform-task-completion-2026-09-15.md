# Platform task completion

Steve requested the existing TAS Task Complete feature across both workboard wings and authorised live publication on 15 September 2026.

The VET wing now provides Task Complete alongside tasks in Today, the year plan, all four 2027 term views, the guided views, weekly controls and workflow task lists, including separately tracked event occurrences. The TAS wing already has the matching controls on Today, Calendar and area cards.

One click saves every action step, the source check and the stated-result check with a **Task complete** status. References, notes, assignments, independent-verifier declarations, prerequisite exceptions and hand-off state are preserved. This personal checklist status is separate from **Verified**: it cannot satisfy prerequisites, open a formal gate, increase verified totals or bypass verification dates, evidence requirements, independent checking or hand-off rules. Read-only items are excluded.

Completed tasks remain visible from VET Today for their separate verification. Undo restores the exact prior record during the current page session; it cannot overwrite later edits. Completion persists through reload and compatible backup restoration. Unticking a completed action step reopens progress. Failed completion, Undo and form saves restore the prior state.

Validation:

- 17 VET state regression checks cover completion, reload, Undo, rollback, edits, references, separate verification, formal gates, task rendering and independent event records.
- The 17 existing TAS completion checks remain the sibling-wing regression baseline.
- Browser checks confirmed the VET weekly workflow and Today shortcuts, all five action steps plus both personal confirmation checks, Undo and reopening by editing a step.
- Guided 2027 and fast annual-cycle cards visibly expose the controls. Desktop and narrow-screen layouts were inspected without document overflow. No browser warnings or errors were recorded.
- Test records were confined to the local preview. Live saved progress was not modified.

The additional runtime changes are confined to VET. Immediately before publication, upstream commit `47ada42` was included intact: its combined TAS calendar links and clickable task totals are preserved. Both current runtime fingerprint manifests were refreshed to describe the combined release, and all 34 VET/TAS regression checks passed on it.
