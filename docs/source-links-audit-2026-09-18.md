# VET and TAS source-link audit — 18 September 2026

## Coverage and result

The audit covers every loaded task definition: 61 VET core duties, 176 scheduled VET 2027 tasks, nine VET event templates, 60 TAS tasks and five TAS weekly checks. All 311 expose a source or clearly described school access route. This checks the site's loaded inventory; it does not certify that the inventory contains every possible school obligation.

The shared source register now contains 74 records in 12 update-watch groups: 70 mapped records and four additional watch records. Its destination types are 25 documents, 27 source pages, one calendar, three related guides, four folders, nine staff portals, four searches and one local app-design record. The local design record has no external authority; its task links to the appropriate working location instead.

## What changed

- Task cards show their source links and section/page locators before the suggested checklist. Multiple sections of the same guide remain visible.
- The handbook task links directly to the 2026 Term 1 guide and identifies the verified Whole School sentence separately from the workboard's suggested steps.
- Known RTO guides, school process notes, blank placement forms, TAS plans, maintenance and inspection documents, excursion procedures and chemical/SDS folders now have direct destinations.
- The TAS Faculty Management Plan folder remains available, alongside links to its working plan and action register.
- The Staff School Calendar route was verified in authenticated Sentral on 18 September: calendar 29 is the Staff School Calendar; calendar 17 is the Deputy's Diary. Both wings now use calendar 29. This verifies destination identity, not a fresh audit of every event date.
- TAS current, historical and weekly views, the source directory and AI preparation links use the reviewed catalogue. AI links use public catalogue metadata only, not saved private overrides.
- Each card can open its exact entry in the source register. Reset returns to the full selected wing.

## Remaining source gaps

- A current standalone School VET Handbook, approved rollover procedure and controlled 2027 RTO term guides were not established. Retain the labelled library or search route and confirm the current version.
- Some school records are held inside staff systems or folders. Those links are labelled as access routes, not as the actual document or proof of a requirement.
- Individual rotation allocations, meeting records and annotated notices were not added as new public links where their sharing could expose private content. Existing authorised guide and system routes remain available.
- Older school-held procedures and forms are labelled with their version limits. The older USI instruction is historical evidence, not an instruction to use superseded handling practices.
- 2026 material shown on a 2027 planning card is background only. Current 2027 instructions and deadlines still require checking.

## Verification and maintenance

Automated coverage and rendering checks cover all 311 definitions, safe URLs, exact source mapping and preservation of task data. Existing VET/TAS adapter, guidance, task-help and source-register checks pass. Disposable-browser checks verify representative direct links, exact-task navigation/reset, desktop/mobile layout and unchanged native/review storage.

Edit `task-sources/data.json` as the shared catalogue, then run `node scripts/build-task-source-links.mjs` to regenerate the browser metadata. Preserve task IDs, year/occurrence keys, private browser data and the distinction between source wording and suggested implementation.
