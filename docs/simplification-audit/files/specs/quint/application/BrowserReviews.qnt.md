# specs/quint/application/BrowserReviews.qnt
- Lines: 85 | Kind: Quint model (live, 5 runs, invariants + 4 witnesses, 10 symbol pins) | Verdict: KEEP
- Covers: the browser confirmation dialogs (`BrowserReviews`): one open review per identity, approval only while shown and unlocked (rechecked at the click), one settlement per request, listeners removed with the dialog. Duplicates: Playwright `operation-review-accessibility.spec.ts`, `review-visual-viewport.spec.ts`, `browser-external-handoff.spec.ts` exercise the dialog visibly. Callers/importers: manifest (sources `browser/review.ts`, `browser/screen-locked.ts`, `prototype/browser-adapter.ts`); harness `browser-reviews.mjs` (74 lines) bundles the real `review.ts` (`loadBundled`) into JSDOM; only `test/quint-browser-reviews.test.mjs` runs it (not in the aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Symbol pins include `browser-adapter.ts` fragments `reviews`, `confirming`; the harness does not touch the adapter. | Drop `browser-adapter.ts` from `sources`/`symbols`; pin `review.ts` and `screen-locked.ts` only. | None |
| 2 | — | — | `review.ts` has 9 product importers; the model is of a live, shared mechanism. | None | — |

## Proposed end state
Unchanged model; manifest narrowed to the two files the harness actually executes.
