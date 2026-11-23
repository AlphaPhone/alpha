# specs/quint/services/WebReadingReview.qnt
- Lines: 112 | Kind: Quint model (live; product browser read-aloud) | Verdict: KEEP
- Covers: the browser "read aloud" excerpt review: wait for page text, sensitive-address/sensitive-text permanent refusal, typed text kept over late page text, one current speech fenced by a generation, close stops speech. Duplicates: none in Quint; the Playwright browser specs may drive the same dialog (check `test/browser/**/reading*` when the journeys are consolidated). Callers/importers: `quint:check`; `refinement/services/web-reading-review.mjs` (via `forward-replays.mjs`, aggregate); `test/quint-web-reading-review.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D11 | Header says "The web build's read-aloud review", but `apps/app/src/browser/reading-review.ts` is reached from `prototype/browser-adapter.ts:124` (`readPage`), i.e. the product Browser view on Android too. | Reword header to "The Browser read-aloud review". | Low |
| 2 | manifest | T10 | 11 symbol pins (`blocked`, `generation`, `edited`, `finish` …) on a 53-line file; generic words. | Drop `symbols`; keep `sources`. | Low |
| 3 | harness | — | `web-reading-review.mjs` imports the real page-reading helpers and bundles the real module (`loadBundled`); no slicing. Good. | Keep. | — |
| 4 | test | T4 / B5 | Runs in the forward-replay aggregate and again in `test/quint-web-reading-review.test.mjs` (240 s, asserts `traces === 47`). | Run once; assert `> 0`. | Low |

## Proposed end state
Model unchanged except header wording; manifest pins files only; one replay execution per lane.
