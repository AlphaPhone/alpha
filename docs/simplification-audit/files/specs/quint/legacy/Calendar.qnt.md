# specs/quint/legacy/Calendar.qnt
- Lines: 161 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE
- Covers: Calendar.tla translation (views, offline outbox, undo-before-send, conflict keeps Google copy, bad-event isolation, picker/read-only access); 8 scenario runs. Duplicates: live models `application/CalendarPresentation`, `CalendarFormControls`, `CalendarApprovalReview`, `CalendarAgentSelection`, `CalendarDeviceWrites`; native `CalendarSync`. Callers/importers: `legacy/manifest.json`; `specs/quint/refinement/legacy/calendar-navigation.mjs:12` (inputs list, hashed); `refinement/legacy/index.mjs`; `test/quint-historical-calendar-navigation.test.mjs`; `test/quint-legacy-campaign-report.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6 / D11 | Historical design translation. `legacy/manifest.json` entry says "Historical current/proposed design comparison at source ef9fbf7cd7 (or a view-refresh design), not a runtime conformance claim". It models no live product code as it stands; DECISIONS D11 retires `specs/quint/legacy`. | Delete model, its manifest entry, harness and test. | Low |
| 2 | manifest | T4 | Live application models cover the current implementation of the same surface (`application/CalendarPresentation`, `CalendarFormControls`, `CalendarApprovalReview`, `CalendarAgentSelection`, `CalendarDeviceWrites`; native `CalendarSync`). | Rely on the live models. | Low; see coverage note |
| 3 | — | T10 / B5 | Harness (`refinement/legacy/calendar-navigation.mjs` (+ `.md`), which hashes `apps/app/src/prototype/model.js`, `template.html`, `subview-accessibility.ts`, `canonical-calendar-drafts.ts`, `runtime/agent-calendar.ts`) hashes or reads product files as text and compares against recorded mismatch receipts; it does not import product modules. | Delete with the model. | None |
| 4 | 3-40 | A2 / D4 | Outbox, `remote`/`flips` and `conflictKeepsGoogleTest` model client-side linked sync, which DECISIONS D4 deletes from the renderer. | Nothing to port. | None |
| 5 | manifest | A7 | Manifest `sources` still names `apps/app/src/prototype/calendar-adapter.ts`, a file in the D4 deletion scope. | Removed with the entry. | None |

## Proposed end state
Delete `specs/quint/legacy/Calendar.qnt`, its `legacy/manifest.json` entry, `refinement/legacy/calendar-navigation.mjs` (+ `.md`), which hashes `apps/app/src/prototype/model.js`, `template.html`, `subview-accessibility.ts`, `canonical-calendar-drafts.ts`, `runtime/agent-calendar.ts`, `legacy/manifest.json`; `specs/quint/refinement/legacy/calendar-navigation.mjs:12` (inputs list, hashed); `refinement/legacy/index.mjs`; `test/quint-historical-calendar-navigation.test.mjs`; `test/quint-legacy-campaign-report.test.mjs`.. Lower the `legacy` floor in
`test/quint-checker.test.mjs:32` (and then drop the `legacy` family from `scripts/quint-lib.ts:43`,
`scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts` once the Core models have moved, see
chunk summary). Invariants that encode still-wanted UX rules (UndoBeforeSend, view/top navigation stability) should be checked against the live twin's
invariant list before deletion; if missing, add them to the live model, not to a historical one.
