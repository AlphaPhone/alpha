# specs/quint/refinement/application/browser-reviews.mjs
- Lines: 74 | Kind: Quint ITF replay driver (bundles real `apps/app/src/browser/review.ts`, jsdom) | Verdict: KEEP
- Covers: browser review dialogs: duplicate refusal, cancel on hide/lock/Back, listener cleanup, against `BrowserReviews.qnt` (scenarios, witnesses, 40 random walks). Duplicates: none found for listener cleanup; review-dialog journeys in `test/browser/**` cover approve/deny UI only. Callers/importers: `test/quint-browser-reviews.test.mjs` (not in the aggregate index).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17 | — | Real module via `loadBundled`; no text slicing. | Keep. | — |
| 2 | 29-31, 57-58 | D10 | Lock state is simulated by inserting a button with `aria-label="Wake"`, because product `screen-locked.ts` detects lock by that label. The harness inherits a label-driven product rule. | When `screen-locked.ts` keys on a data attribute/state (D10), update the driver. | L |
| 3 | 9 | C5 | Depends on `browser-model-traces.mjs` (to merge with `calendar-itf.mjs`). | Follow the merge. | L |

## Proposed end state
Unchanged apart from the shared trace module import path.
