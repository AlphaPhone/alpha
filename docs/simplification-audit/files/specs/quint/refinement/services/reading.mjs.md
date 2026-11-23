# specs/quint/refinement/services/reading.mjs
- Lines: 52 | Kind: Quint refinement driver (real upstream `page-reading.ts` capability probe via `sourceModule`; real `apps/app/src/browser/content-question.ts` bundled and run in headless Chromium) | Verdict: KEEP, SIMPLIFY (jsdom instead of Chromium)
- Covers: `BrowserReadingState` (live, `manifest.json:795`): concurrent capability probes are deduplicated and an explicit unavailable answer refuses isolated reading; the question-review dialog composes the reviewed text exactly once on approval and refuses a late verified source after the selection changes. Duplicates: `test/quint-web-reading-review.test.mjs` replays a different model (`WebReadingReview`) over `reviewBrowserReading`; Playwright browser journeys may cover "Use in conversation" (tests-browser chunk). Callers: `services/index.mjs:19,77` only - no per-model host test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-50 | cost | Launches Chromium for two traces of a DOM dialog that only needs `<dialog>`, buttons and a status role. `scan-review-dialogs.mjs` runs comparable dialogs in JSDOM. | Run in JSDOM (with `showModal` shim) to drop the browser dependency from the services lane. | Low |
| 2 | 11 | B5 | `capture()` re-hashes and asserts nothing changed before import: receipt ceremony; duplicated in `scan.mjs:30-35` and `scan-review-dialogs.mjs:67-70`. | One helper in `support.mjs` (it already has `beforeImport`). | Low |
| 3 | 9 | — | Pins `content-question.ts` and the generated `.eliza/client-features/.../page-reading.ts` by path; real imports. | Keep. | — |
| 4 | — | P1 | Only in the services aggregate. | Own runner entry. | High if forgotten |

## Proposed end state
Same two observations, JSDOM instead of Chromium, shared capture helper, own runner entry with a path filter on
`apps/app/src/browser/content-question.ts` and its bundle inputs.
