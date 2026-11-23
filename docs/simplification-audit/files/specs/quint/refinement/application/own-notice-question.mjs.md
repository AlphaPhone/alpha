# specs/quint/refinement/application/own-notice-question.mjs
- Lines: 86 | Kind: Quint scenario/witness/random trace replay; source transplant of two whole files (T2/T10) | Verdict: PORT (easy)
- Covers: `reviewOwnNoticeQuestion` (`apps/app/src/prototype/own-notice-question.ts`, live) and the review sheet `reviewContentQuestion` (`browser/content-question.ts`): recheck before consume, Home/blur cancels, dismiss releases the tap, changed notice reported, third-party notice refused. Model `OwnNoticeQuestion.qnt`.
- Duplicates: `test/own-notice-question.test.mjs` spawns `scripts/test-own-notice-question.ts` (T9, unit-level duplicate of the same function). Importers: `test/quint-own-notice-question.test.mjs` (replay + one example test), plus grep hits in `reminder-adapter-fixture.mjs`, `services/inbox-coordinator-ports.mjs`, `scripts/inbox-adapter-fixture.ts` that reference the product function name, not this file.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-28, 42 | T2/T10 | `compile()` reads both files, deletes every `import` line by regex, strips `export`, concatenates and runs in `vm`, then re-supplies the stripped imports (`noticeExcerpt`, `noticeReviewable`, `sensitiveReadingText`, `recognizeLocalText`) by hand. | `loadProductModule('apps/app/src/prototype/own-notice-question.ts', {stubs: {'../prototype/local-ocr': 'export const recognizeLocalText=async()=>({text:""})'}})` with `window/document` globals from JSDOM. | Low. |
| 2 | 12-13 | D13 | Imports `.ts` and `.eliza/client-features/...` directly from Node; works only under the tsx loader. | Goes away with the bundled load. | Low. |
| 3 | 14 | C5 | Uses `assistant-model-traces.mjs`, the second copy of the replay engine. | Move to the merged replay helper. | Low. |

## Proposed end state
Imports the real module; one test file (`test/quint-own-notice-question.test.mjs`); delete `test/own-notice-question.test.mjs` and `scripts/test-own-notice-question.ts` unless they cover a case the 89 model traces do not.
