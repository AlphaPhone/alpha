# test/fixtures/android-gzip-assets.mjs
- Lines: 15 | Kind: support fixture (a model of the Android asset merger: unwraps one gzip layer and strips one `.gz` suffix, recursively) | Verdict: KEEP (optionally move to `test/support/`)
- Covers: lets tests show that `.gz` web assets (the OCR traineddata) survive the merger under their published name.
- Callers/importers: `test/android-gzip-assets.test.mjs:8` (whose report keeps lines 13-45) and `specs/quint/refinement/services/android-gzip-asset-stage.mjs:8,107` (live model `specs/quint/services/AndroidGzipAssetStage.qnt`). Both importers survive, so this file does too.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-14 | C3 | A small recursive walker, one of the ~11 directory walkers. It is tailored (it rewrites while walking) and only 9 lines. | Keep. | None |
| 2 | path | D11 | A shared test/spec helper, not a fixture file. | Move to `test/support/android-asset-merger.mjs` if `test/support` becomes the helper home, and update both imports. | None |
