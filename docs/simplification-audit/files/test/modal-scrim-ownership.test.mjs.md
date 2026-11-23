# test/modal-scrim-ownership.test.mjs
- Lines: 46 | Kind: integration in real Chromium (launched from node:test via `test/fixtures/modal-scrim-chromium.mjs`, which esbuild-bundles the real chat-overlay motion, calendar month focus and modal-inert modules) | Verdict: DELETE (duplicate of the refinement)
- Covers: opening a modal retires an older raised-composer scrim press and its compatibility click; drafts survive. Duplicates: `specs/quint/refinement/application/modal-scrim-ownership.mjs` calls the same `observeModalScrim()` and checks the same rows (`uninterrupted`, `wrongPointer`, `rearmed`, `fresh`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-46 | T4 | Second assertion pass over the exact Chromium run the refinement already performs; doubles a Chromium launch per test run. | Delete. | Low |
| 2 | fixture | - | `test/fixtures/modal-scrim-chromium.mjs` survives (refinement importer). | Keep; consider moving it under `specs/quint/refinement/application/`. | None |

## Proposed end state
File deleted; the refinement remains the single consumer of the Chromium driver.
