# specs/quint/refinement/application/calendar-approval-review.mjs
- Lines: 88 | Kind: Quint refinement harness (bundles real `runtime/calendar-approval-client.ts`) | Verdict: KEEP
- Covers: typed Calendar approval decisions consume one exact authenticated read, refuse copied/mutated/foreign/expired/retired rows, never replay an uncertain decision, against `CalendarApprovalReview.qnt` (29 option schedules). Duplicates: `test/browser/calendar-approval-queue.spec.ts` covers the UI; `test/calendar-approval-ui.test.mjs` covers text helpers in `calendar-approval.ts` (different module). Run twice: `test/quint-calendar-approval-review.test.mjs` and aggregate `index.mjs:1,115` (T4). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | — | Real client bundled; transport and connection are the only ports. Target shape. | Keep. | — |
| 2 | 29-83 | D8 | Minified style: 50-line loop body with many statements per line. | Reformat with Prettier (D9) and split the per-option body into `runSchedule(options)`. | L |
| 3 | 5 | — | Calls `captureSources` at import time (module side effect). | Move into `checkCalendarApprovalReview`. | L |
| 4 | — | B5 | Wrapper asserts `receipt.traces === 29` (exact-count). | Drop the count; keep the named-outcome assertions. | L |

## Proposed end state
Same 29 schedules in a readable `runSchedule`; single run lane; no import-time side effect.
