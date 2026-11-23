# specs/quint/services/BrowserReadingState.qnt
- Lines: 120 | Kind: Quint model, live (8 tests, 7 invariants, 3 witnesses) | Verdict: KEEP; add a per-model wrapper
- Covers: isolated native page extraction, the separate user-reviewed "ask about page" question draft and its empty-excerpt fallback, and the per-page sensitivity block. Properties: speech only of the reviewed excerpt, only for a current foreground isolated non-sensitive page, a single-use token, and the fallback never speaks. Sources: `apps/app/src/browser/reading-review.ts`, `browser/content-question.ts` (exist); `sharedSources` upstream `BrowserReviewedReading.java`, `BrowserReadingWorld.java`, `BrowserPageReading.java`, `src/page-reading.ts`. Duplicates: `services/WebReadingReview.qnt` (`test/quint-web-reading-review.test.mjs`) is a neighbouring model of the reading review. Check for overlap when the browser model cluster is grouped (§2.11). Callers: harness `refinement/services/reading.mjs` (52 lines), which bundles the real `content-question.ts` and upstream `page-reading.ts` and **launches Chromium** (runtime cost). Only the aggregate runs it; there is no wrapper.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | coverage | Aggregate-only. | Add a wrapper `test/quint-browser-reading-state.test.mjs` before the aggregate goes. | high if the order is wrong |
| 2 | harness 11 | B5 / C3 | The same `capture` re-hash lambda as `workflow.mjs:8`. | Share or delete it, as there. | low |
| 3 | — | §2.11 / T4 | `BrowserReadingState` and `WebReadingReview` both model the reviewed-excerpt rule. | Ask during the browser-cluster grouping whether one module with both invariant sets is enough. Do not merge blind. | low |
| 4 | — | — | Upstream code holds the isolation and token mechanics, and `reading-review.ts`/`content-question.ts` are local. Live. | KEEP. | none |

## Proposed end state
Unchanged model with its own wrapper. It may later be grouped with `WebReadingReview` into one browser-reading module.
