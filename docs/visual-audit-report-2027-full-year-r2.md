# 2027 full-year visual audit report — R2 LF release freeze

## Verdict

**PASS — the LF-normalised VET candidate and separately frozen Head Teacher TAS runtime reproduce the accepted visual result with no visual, responsive, keyboard, touch, contrast, privacy-presentation or print regression. No Stage 15 R2 rework is required for these exact bytes.**

This R2 exists because release preflight changed text-file line endings and therefore changed the byte-level manifests. It does not carry the earlier PASS across by assertion: both new manifests were reproduced, both browser suites were rerun, all route families were freshly rendered at laptop and exact 390 px, and all 16 PDF pages were rendered back to pixels and inspected.

This remains local acceptance evidence. It is not deployment proof, operational activation authority, source/delegation approval or proof that any school, course or learner is compliant.

## R2 frozen-candidate binding

### VET 2027 full-year candidate

- R2 candidate digest: `c6fbb4236e4dcadff317901e80a31ccaaa4af05f7932471cc5261f41809a933f`
- Frozen inputs: 9
- Canonical manifest: `docs/candidate-digest-2027-full-year.sha256`, excluded from its own inputs

| Frozen VET input | R2 SHA-256 |
| --- | --- |
| `index.html` | `0b6cb66487a3503d600ef19556335c3f582390c9acc4d9fd3e3d0c417495e8e6` |
| `assets/css/site.css` | `fa1520443d8aafb312f3d30c8b59f7a880afbd1cd5936dc379c820e556ab3040` |
| `assets/js/app-v2.js` | `aada13413a0a01621b2a453ae670ad7e084c42220c728c9a7d9bf58088b2202a` |
| `assets/js/data/config.js` | `d63cf843a90b0a94a1f104e00d19c1df56e20d6e23eb4afe187c3ca1e9a2413f` |
| `assets/js/data/tasks.js` | `54a8ce6baa1d7cc3a715230d950125c5e2235345a64494d96a4a1879493cbfb9` |
| `assets/js/data/term1-2027.js` | `d26b5f968519ce6096695d6c8051785fd6f6a1e34a9adaafb5549c40bdd21fee` |
| `assets/js/data/reference.js` | `59349eed7d7c4f6a5ec0652bba099628a1c741d0b1da34336dad07d783145656` |
| `docs/source-map-2027-full-year.md` | `fbf169364bc5415fe41e82de9d7dd49a22a0e41f998032c8f0c2bfc44606aba9` |
| `docs/foundation-manifest-2027-full-year.md` | `68b4b16d735023e9cb28b0b8b3c2508b4a853b7cfa44059955f882c379478ed0` |

### Connected Head Teacher TAS runtime

- R2 connected runtime digest: `32bf370df5ca50c6cc1bdee929c814dc547a6b8503ec8f6a30b46d68e04df8dd`
- Frozen inputs: 4
- Canonical manifest: `docs/connected-head-teacher-runtime-2027-full-year.sha256`, excluded from its own inputs

| Frozen connected-runtime input | R2 SHA-256 |
| --- | --- |
| `head-teacher-tas/index.html` | `4e9f44d111298179f7e3398cde83308ca242f5c111171897eb56e96ac27c8576` |
| `head-teacher-tas/assets/css/site.css` | `d6fc388ee5063091de90da7a26aa1d5d7302abd145a6a0af967d8b4ca5e1f77a` |
| `head-teacher-tas/assets/js/data.js` | `735cca00260d7dcff8942ea0f27e31495a5bf584e5f2bf750e93fd85d7d18388` |
| `head-teacher-tas/assets/js/app.js` | `e1ccf2cada32382b2b0643d1d01485b464a62246fe4872fb97c0aa93b61f895f` |

The digest helper reproduced both manifests immediately before this report. Every audited text input contained zero carriage-return bytes; the repository line-ending policy declares LF for text and binary handling for PNG/PDF. Any later change to a listed input invalidates the corresponding R2 finding.

## Independent R2 method

This audit reapplied the Stage 15 VET visual standard and its required source, network and visual-quality references. It used the full-year source map, foundation manifest and integration manifest as the scope and authority boundary.

Fresh evidence covered:

- 18 routes at 1440 × 900 and exactly 390 × 844 CSS pixels, totalling 36 route/viewport checks;
- the operations gateway, guided annual cycle, Term 1 compatibility route, Terms 2–4, Today, Year plan, Workflows, Systems, Issues and handover, plus all seven Head Teacher TAS routes;
- six keyboard/dialog/drawer journeys;
- fresh full-page-family contact inspection plus original-size 390 px inspection; and
- five A4 landscape PDFs rendered back to 16 PNG pages.

The R2 suite returned **PASS** with zero screen warnings, zero screen failures, zero blank PDF pages, zero text items outside a PDF media box and zero print failures.

## Visual delta from the earlier accepted freeze

**Observed visual delta: none.**

The R2 gateway, guided action, four term shells, workflow cards, system cards, issue alerts, Head Teacher landing/calendar/task views and print pages retain the same hierarchy, content density, selected states, spacing, wrapping, colour, privacy notices and authority separation seen in the earlier accepted evidence.

No change was observed in:

- the calm `Your one safe next action` guided entry;
- the four-term/term-week information architecture;
- laptop or exact-390 containment;
- navigation, drawer or dialog placement;
- heading and card wrapping;
- touch-target presentation;
- owner-system and privacy warnings;
- Head Teacher TAS wing identity or reciprocal navigation;
- handover/interrupt contrast; or
- printed page composition and control suppression.

The LF-only byte change therefore creates a new release digest but no rendered visual change.

## Findings by severity

### Critical

None.

### High

None.

### Medium

None.

### Low

None requiring correction.

## R2 rendered and accessibility evidence

- Every route retained one H1, a valid skip target, the expected active navigation state and no blank link.
- All 36 views retained exact document containment; at 390 px, client and document widths remained 390 px with no horizontal page overflow.
- Long headings, dates, badges, task cards, alerts, source notices and forms wrapped naturally. No meaningful text, card, dialog or control was accidentally cropped.
- VET action targets retained the enhanced 44 × 44 CSS-pixel floor. Head Teacher TAS retained its accepted touch treatment: compact controls meet the applicable floor, checkbox indicators sit inside larger labelled activation rows, and the separated inline-link exception remains unchanged.
- The VET skip link remained first in keyboard order and focused `main-content`.
- Both mobile drawers closed on Escape and returned focus to their triggers.
- Both task dialogs remained named and contained, closed on Escape and returned focus to their originating controls.
- No console error, uncaught page error or HTTP failure occurred in the final screen suite.

The corrected `Continuity` text still computes as `#83ddc8` on `#072e56`, or **8.57:1**. Other representative VET and Head Teacher text pairs remain above 4.5:1, and status meaning remains expressed through text and structure as well as colour.

## Photographic target reconciliation

- Stage 01 qualifying-photograph target: **0**.
- R2 qualifying photographs rendered: **0**.
- Result: **target met**.

The source-map exception remains justified. This is a staff compliance and operations workboard, not a student learning package, practical demonstration or photographic observation task. Photographs would be decorative, raise privacy/rights risk and weaken the next-action hierarchy. No visible `img`, `picture`, `svg` or `canvas` appeared in the audited route family; restrained CSS gradients remain interface treatments, not claimed learning visuals.

## Privacy-safe and placeholder presentation

- No blank or placeholder destination appeared in the rendered routes.
- No direct Google Drive or Docs item identifier, private learner record, credential, authenticated-link override or private sentinel appeared in the interface or print.
- Staff-facing notices continue to direct official evidence and sensitive information to authorised owner systems.
- The gateway and connected wing remain visually related but authority-separated; TAS work is not presented as VET compliance evidence.

## R2 print evidence

| Output | Pages | Bytes | Result |
| --- | ---: | ---: | --- |
| VET Term 1, Week 10 | 3 | 256,127 | PASS |
| VET Term 2, Week 10 | 3 | 294,675 | PASS |
| VET Term 3, Week 10 | 3 | 294,275 | PASS |
| VET Term 4, Week 11 | 2 | 205,183 | PASS |
| Head Teacher TAS calendar | 5 | 103,265 | PASS |

All 16 pages remained non-blank A4 landscape pages at 842.88 × 595.92 pt. Fresh pixel inspection found no overlap, crop, stretch or unreadable reduction. Cards remained intact across page boundaries.

Print continued to remove navigation, dialogs, inputs, actionable task controls and interrupt actions. VET term/week controls remain only as static sequence context. The Head Teacher TAS calendar contains no visible button or input in print.

## R2 acceptance matrix

| Gate | Result | R2 evidence |
| --- | --- | --- |
| Freeze integrity | PASS | Both LF manifests reproduced exactly; 13 audited text inputs contain zero CR bytes. |
| Hierarchy and relevance | PASS | Gateway, guided, term, workflow, system, issue and connected-wing hierarchy is unchanged and purposeful. |
| Responsive containment | PASS | 36 route/viewport checks; no page overflow or meaningful crop at laptop or exact 390 px. |
| Keyboard and focus | PASS | Six focused journeys passed, including skip, Escape and focus return. |
| Touch and contrast | PASS | VET 44 px actions retained; accepted HT targets unchanged; handover contrast remains 8.57:1. |
| Privacy/placeholders | PASS | Owner-system boundary remains prominent; no rendered private or placeholder content. |
| Photo coverage | PASS | Source-bound target 0; rendered count 0. |
| Print | PASS | Five PDFs/16 pages; no blanks, clipped text or interactive-entry controls. |
| Visual regression | PASS | Fresh screen and print inspection found no rendered delta from the earlier accepted freeze. |

## Controlled residual conditions

1. This is a local R2 PASS. Release still requires cache-busted live route, asset and responsive verification.
2. Operational activation remains separate from publication and depends on the authorised source, delegation and calendar gates recorded elsewhere.
3. Connecting a shared authenticated register or changing owner-system destinations requires a new visual/privacy pass.
4. Any candidate/runtime input change invalidates the corresponding digest and this report.
5. The zero-photograph exception applies only to the declared staff operations scope.

## Final R2 acceptance statement

The exact LF-normalised VET candidate and connected Head Teacher TAS runtime retain the previously accepted visual experience without regression. They remain calm for a new coordinator, efficient for experienced staff, contained at exact 390 px, keyboard operable, touch-usable, contrast-safe, privacy-safe in presentation and print-safe. **Stage 15 R2 visual acceptance is granted with PASS and no required rework.**
