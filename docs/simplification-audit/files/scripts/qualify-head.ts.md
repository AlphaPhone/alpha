# scripts/qualify-head.ts
- Lines: 465 | Kind: manual tool (local re-run of CI qualification) | Verdict: DELETE (owner confirm)
- Covers: runs `npm run verify`, `android:build`, bundle audit, storage specs on three engines, full Chromium and production Playwright projects locally, writes `test-results/qualify/<sha>/result.json`, and binds emulator/resident campaign records to the built APK hashes. Duplicates: CI workflows (android.yml, browser.yml, android-emulator.yml, resident-android.yml) run every step; `releaseBlockers`/`verify-apks` already judge distribution. Callers/importers: no npm script, workflow or doc; tests `qualify-head.test.mjs` (3), `pilot-units.test.mjs` (imports `CAMPAIGNS`, `candidateManifest`, `verdict`, … and slices this file's text at line 234), `docs-links.test.mjs` (uses its name as an example string); comment in `android-resident-instrumentation.ts:34`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7/P2 | Re-runs the whole CI matrix serially (hours) with no caller; the evidence it writes is read by nothing. | Delete with `test/qualify-head.test.mjs` and the qualify-head cases in `pilot-units.test.mjs`. | low (owner may run it by hand before releases) |
| 2 | 190-198 | — | `CAMPAIGNS` binds campaign records to APK hashes: the only place that ties emulator results to a candidate build. | If the owner wants this binding, keep only `readCampaigns`+`candidateManifest` as a ~80-line `scripts/candidate-evidence.ts`. | — |
| 3 | 83-90 | C1 | Third `ApkManifest` interface. | Gone with file. | — |
| 4 | 200 | B1 | `readJsonFile` swallows parse errors to `undefined`. | — | — |
| 5 | 313-317 | C3 | Another git wrapper. | — | — |
| 6 | 419-421 | B4 | Checks that `scripts/audit-production-bundle.ts` exists in its own repo. | — | — |

## Proposed end state
Deleted. Release qualification is the CI required checks plus `verify-apks` release blockers. Owner question: is APK-hash binding of emulator campaigns wanted; if yes, keep a small `candidate-evidence.ts` run by the release workflow.
