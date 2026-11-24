# specs/quint/refinement/application/browser-files-trash.mjs
- Lines: 383 | Kind: Quint refinement harness (imports and runs the prepared upstream module) | Verdict: KEEP (simplify)
- Covers: Files Trash/Restore/Empty custody of the shared `BrowserStorageVolume` (exact journal markers, Web Locks and single-realm fallback, 30-day retention boundary, refused placement/journal write) against `BrowserFilesTrash.qnt`. Duplicates: run by `test/quint-browser-files-trash-refinement.test.mjs` and again by the aggregate `refinement/application/index.mjs:88,120` (`test/quint-application-refinement.test.mjs`) (T4). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 348 | — | Real import: `BrowserStorageVolume` is loaded from `.eliza/client-features/plugins/plugin-files/src/browser/storage-volume.ts`. No source-text slicing. Good model of the target state. | Keep. | — |
| 2 | 9-11, 343-346 | P6 / D14 | The code under test is upstream-owned (`plugins/plugin-files`); Alpha only consumes it through `apps/app/src/browser/files.ts`, which is hashed as a "source" but never executed here. | Owner/upstream follow-up: this model belongs with `plugin-files` upstream. Until then keep; drop `apps/app/src/browser/files.ts` and the duplicate `vendor/eliza/...` paths from `sources` (pinning, not behaviour). | L |
| 3 | 342-347 | B5 | `checkClientFeatures()` + `captureInputs` hash 11 inputs before and after; receipt ceremony. | Rely on the test's exit; keep `checkTraces` comparison only. Coordinate with the `check-traces.mjs` receipt decision. | L |
| 4 | 20 | C3 / C5 | Local `tick` duplicates `support.mjs` `tick` (and `settle` in `browser-model-traces.mjs`). | Import from the shared `refinement/support.mjs`. | L |
| 5 | 349-375 | — | Replaces global `navigator` for the fallback branch and restores it; fine but must stay in `finally`. | None. | — |

## Proposed end state
- Keep the six schedules × two lock modes; they are the only coverage of Trash concurrency (`test/browser/**` Files journeys cover single-tab UI only).
- Run once (per-model test only, removed from the aggregate adapter list).
- Shared `tick`/`deferred` from `refinement/support.mjs`; source list trimmed to executed files.
- Long-term: move the model + harness upstream with `plugin-files` (D14 follow-up).
