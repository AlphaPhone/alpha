# specs/quint/refinement/services/android-gzip-asset-stage.mjs
- Lines: 138 | Kind: Quint refinement harness (imports real `protectGzipAssets`, `packagedGzipProblems` from `scripts/android-gzip-assets.ts`; one-layer merge from `test/fixtures/android-gzip-assets.mjs`) | Verdict: KEEP (SIMPLIFY)
- Covers: model `AndroidGzipAssetStage`: gzip OCR assets are wrapped so AAPT does not strip the `.gz`, protection is idempotent, malformed input and an existing sibling are refused, a refused raw removal is recoverable, and the APK audit reports missing/differing assets against the web build (6 traces). Duplicates: `test/android-gzip-assets.test.mjs` (same fixture `mergeGzipAssets`, same functions); `verify-apks.ts` checks real APK output. Importers: `index.mjs`, `test/quint-android-gzip-asset-stage.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-69 | T8 / fragility | Fault injection by replacing global `fs.rmSync` for the call. Works only because the script uses the default `fs` import; switching to `import {rmSync}` silently disables the fault and the trace then fails confusingly. | Give `protectGzipAssets(dir, {remove = fs.rmSync})` a port parameter and pass a refusing one. | Low |
| 2 | 106-107 | B5 | `scripts/build-android.ts` and `scripts/verify-apks.ts` are hashed but not executed. | Drop from receipt sources (keep manifest sources if the owner wants model reselection on edits). | Low |
| 3 | — | T4 | `test/android-gzip-assets.test.mjs` exercises the same functions; once tests are integration-only, one of them goes. | Keep this harness (it is the model link); trim the host test to cases this does not cover, or delete it. | Low |

## Proposed end state
Same 6 traces with an explicit remove port; receipt sources limited to the executed script, fixture and harness.
