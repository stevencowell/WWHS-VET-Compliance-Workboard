# TAS 2027 planning dates

The 29 dated 2026 TAS definitions now have separate 2027 planning occurrences. Together with 31 ongoing definitions and five weekly checks, each year has 65 base register entries. Saved historical occurrences can increase a browser's totals.

The carry-forward uses the same month and day, including every captured milestone. It does not establish official 2027 school or NESA dates. Weekend dates are flagged; no weekday or school-term alignment is assumed. Conditional activities still require an applicability check.

## Using the plan

- Select 2027 in the full TAS register or the workboard Calendar year selector.
- Open a 2027 task and choose **Edit or confirm dates**.
- Save a provisional adjustment, or tick source confirmation and name the current source checked. Changing a confirmed date clears the confirmation checkbox.
- **Restore 2026 pattern** restores that task's provisional baseline.

Changes are browser-local in `scheduleOverrides` within the existing TAS v2 state and are included in its Export backup / Restore backup flow. They do not edit Sentral, the public defaults, 2026 records, task completion or official evidence. Existing task notes remain intact. Another tab's newer data blocks a stale save.

Each planned task uses `2027-<canonical task id>::2027` for its progress identity. Date edits stay within 2027, so they retain that occurrence identity. The task's canonical ID preserves its direct source links, step guidance and AI preparation profile. Source passages from 2026 remain labelled as background.

The forecast selects the current year's dated tasks; 2027 planned dates participate in its 21-day window during 2027. Future-year preparation is available from the register and calendar now. No 2028 calendar is inferred. Ongoing term grouping remains approximate pending a verified annual school calendar.

## Validation

Data, adapter, source, guidance and AI tests cover separate years, provisional status, schedule validation and backup restoration. Disposable browser tests cover editing, confirmation, resetting, reload persistence, milestone ordering, preserved notes, stale-tab protection, downloaded backups, desktop and mobile layout. Tests do not modify user browser records.
