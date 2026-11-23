# specs/quint/application/FilesTree.qnt
- Lines: 189 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP
- Covers: Volume-based Files browser and identity-bound agent moves: names unique per folder, no overwrite without confirm, reversible trash, only reviewed moves. Duplicates: `test/android-instrumentation-runner.test.mjs:216` only asserts no Android test class named FilesTree (unrelated). Callers/importers: `specs/quint/refinement/application/surfaces.mjs` (`filesTree`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)), README; mentioned in `specs/quint/legacy/README.md:111` (historical).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | surfaces.mjs 108-135 | — | Harness imports upstream `BrowserStorageVolume` and drives it with a controlled library port (import-based); checks three schedules only. | None. | — |
| 2 | manifest sources | P6 | Sources: 6 shared upstream files + AlphaFilesPlugin.java + selection-adapter.ts. | Keep; harness covers only upstream volume; AlphaFilesPlugin side is unrefined. | — |
| 3 | 2-4 | A8 | Header comment refers to "the reviewed files-browser design model" (legacy history). | Reword to describe the model. | None. |

## Proposed end state
Unchanged; comment cleanup; per-model runner when the aggregate goes.
