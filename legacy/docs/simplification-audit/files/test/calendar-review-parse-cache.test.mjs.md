# test/calendar-review-parse-cache.test.mjs
- Lines: 44 | Kind: transplant + source-text (slices `createCalendarReviewParses` out of `prototype/calendar-approval-adapter.ts` between `export function createCalendarReviewParses` and `/** Presentation only`, evals it with `new Function`; third test regex-matches adapter source) | Verdict: DELETE
- Covers: Calendar markup is parsed once per unchanged message (render performance), forgotten parses are dropped, the adapter uses the cache. Duplicates: markup parsing in `test/calendar-approval-ui.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | T2 | Slices an *exported* function out of text: it could simply be imported, but the adapter module pulls `connection-ui`. | Delete. | None |
| 2 | 39-44 | T1 | Four regexes on adapter source (`cache.retain(...)`, `parses.delete(this)`). | Delete. | None |
| 3 | 16-37 | T3 | Memoisation is an optimisation, not behaviour; a regression shows as slowness, not wrong output. | Accept the loss, or one Playwright perf budget on a long streamed reply if the owner wants it. | Low |

## Proposed end state
Deleted. No replacement needed; if the adapter is split (D2/D3), `createCalendarReviewParses` lives in a pure module
and can be covered as part of calendar integration if ever needed.
