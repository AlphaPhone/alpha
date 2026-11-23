# scripts/android-gzip-assets.ts
- Lines: 69 | Kind: script (Android sync step: protect `*.gz` web assets from the AGP asset merger; APK check) | Verdict: KEEP, SIMPLIFY
- Covers: wraps each `*.gz` in the synced web payload once so the APK carries the original bytes (OCR `eng.traineddata.gz`), and lists packaged-gzip problems for `verify-apks.ts`. Duplicates: two directory walkers in this file (26, 51) and ~10 elsewhere in `scripts/`. Callers/importers: npm `android:sync` (`protect`); `scripts/verify-apks.ts` (`packagedGzipProblems`); Quint `specs/quint/refinement/services/android-gzip-asset-stage.mjs` (imports both functions: good); `test/android-gzip-assets.test.mjs`, `test/quint-android-gzip-asset-stage.test.mjs`; listed in `quint-lib.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-39, 51-60 | C3 | Two hand-written recursive walkers. | One `walkFiles(dir)` from `scripts/lib/fs.ts`. | None |
| 2 | 18 | C3 | Repo-root spelling #3 of 9. | Shared `ROOT`. | None |
| 3 | — | T1 | `test/android-gzip-assets.test.mjs:50` regex-matches `verify-apks.ts` source for the call to `packagedGzipProblems`. | Delete that assertion; the Quint gzip stage model and the function tests cover the behaviour. | None |
| 4 | — | T4 | `test/quint-android-gzip-asset-stage.test.mjs` runs the same model `check-quint-refinement` runs. | Keep one execution (in the refinement lane). | Low |

## Proposed end state
~55 lines with one shared walker; unchanged CLI. Integration coverage: the Quint gzip stage refinement (imports the real module) plus `verify-apks` in the Android build.
