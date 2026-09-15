# Calendar task completion

Prepared locally from commit `538d2bc` on 14 September 2026. Steve authorised careful publication on 15 September, with explicit instructions to preserve concurrent work. The Morning Launchpad task confirmed it made no Workboard edits or publication and has none planned. A fresh isolated checkout confirmed GitHub main still matched `538d2bc`. The exact saved patches were recovered from this task's history and all 13 state regression checks passed again before release.

Each editable, open dated TAS calendar card now has a **Task Complete** button beside **Open**. One click marks all action steps, dated milestones and the two completion checks, saves the current task cycle and shows **Task complete** across the workboard. Existing references, verifier details, notes, other task cycles, weekly checks and link settings are preserved.

The new `completed` status closes the personal workboard task. `verified` retains its existing requirements for a reference, verifier and completed checks. The shortcut does not invent those details or alter official systems. Historical and procedure-only entries remain read-only. Already verified and not-applicable tasks keep their existing status.

**Undo** restores the exact previous record, including an absence of prior progress, during the current page session. It is invalidated by a later edit and is not retained across a reload. Saved completion itself survives reload and backup restoration. Individual steps remain editable through **Open**; changing one reopens the task and updates the dialog status, confirmation and due label.

## Validation

- 13 state regression checks passed: all-box completion; reference preservation; unrelated state preservation; double-click behaviour; Undo from an unreviewed task; reload/sanitisation; verified-status requirements; invalid imported completion; read-only exclusions; existing closed states; stale Undo protection; failed completion saves; failed Undo saves and retry.
- Browser verification confirmed 7/7 boxes for the information evening task and 10/10 boxes for the Year 12 reporting task, including all three milestones.
- Browser reload preserved completion. Editing a checkbox reopened the task and its form correctly; Save progress also persisted.
- Desktop and narrow-screen layouts were inspected. Buttons remained usable without horizontal overflow. Keyboard Enter activation and Undo passed. No browser errors or warnings were recorded.
- JavaScript syntax and Git whitespace checks passed.

Tests ran on a local preview origin; live user progress was not modified. Only the Head Teacher TAS application, stylesheet, entry-page cache versions, this note and its runtime fingerprint file are changed. The VET runtime and historical acceptance evidence remain unchanged.
