# test/android-gzip-assets.test.mjs
- Lines: 53 | Kind: tooling integration (real `protectGzipAssets`/`packagedGzipProblems` on temp dirs with a model of the Android asset merger from `test/fixtures/android-gzip-assets.mjs`) + source-text (47-53) | Verdict: KEEP lines 13-45; DELETE 47-53; MERGE into `test/tooling/android-build.test.mjs`
- Covers: `.gz` web assets (the OCR traineddata) survive the Android asset merger under their published name and the APK verifier flags a missing or changed one. Duplicates: `test/quint-android-gzip-asset-stage.test.mjs` (Quint replay via `specs/quint/refinement/services/android-gzip-asset-stage.mjs`, which imports the same fixture). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-45 | - | Real functions on real files; protects OCR in the shipped APK. | Keep (one of the two: this or the Quint replay; prefer keeping both only if the model stays live). | Low |
| 2 | 47-53 | T1, T5 | Regex over package.json `android:sync`, `verify-apks.ts` source, and a `vendor/eliza` file. | Delete. | None |
| 3 | 8 | - | `fixtures/android-gzip-assets.mjs` is also imported by the Quint harness, so it survives. | - | - |

## Proposed end state
Two cases (merger round-trip with verifier, deterministic wrap and refusals) in the Android build tooling file. Wiring of
`protect` into `android:sync` is proven by `verify-apks` failing on a real build, not by reading package.json.
