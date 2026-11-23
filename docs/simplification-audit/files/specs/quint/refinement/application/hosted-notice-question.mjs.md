# specs/quint/refinement/application/hosted-notice-question.mjs
- Lines: 236 | Kind: Quint refinement harness (source campaign, `HostedNoticeQuestion`, live) | Verdict: KEEP
- Covers: a retained hosted-result question opens a review dialog, rechecks the exact token/body before one consumption, never composes after owner loss/blur/failed acknowledgement, refuses sensitive text, and tap resolution does not overlap (`apps/app/src/runtime/hosted-notice-question.ts`, `browser/content-question.ts`). Duplicates: none found. Callers/importers: `test/quint-hosted-notice-question.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-41 | — | Already the target pattern: esbuild bundle of the real module, two port stubs (`./alpha-client`, `../prototype/local-ocr`), `import()` of the output; no source text read. | Keep; cite as the reference for porting siblings. | — |
| 2 | 49-53, 176-179 | — | Installs JSDOM `window/document/HTMLElement` on `globalThis` per scenario and restores descriptors. Correct; a shared `withDomGlobals()` helper would serve other JSDOM harnesses too. | Optional: move to `support.mjs`. | L |
| 3 | 46-47 | — | Patches `showModal`/`scrollIntoView` because JSDOM lacks them. Necessary. | Keep. | — |
| 4 | test wrapper | B5 | Asserts `traces === 23`, `observedFields.length === 19`. | Drop exact counts. | L |

## Proposed end state
Unchanged harness (23 schedules); runs once from the manifest runner.
