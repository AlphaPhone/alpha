# specs/quint/services/AndroidGzipAssetStage.qnt
- Lines: 58 | Kind: Quint model, live (6 tests, 4 invariants); models build tooling | Verdict: KEEP (owner question on build-tool models)
- Covers: protection of `*.gz` web assets from the AGP asset merger (`scripts/android-gzip-assets.ts`): one staged representation, a refused removal keeps the exact input, the published asset is single, and the audit matches the exact bytes. Sources: `scripts/android-gzip-assets.ts`, `build-android.ts`, `verify-apks.ts`, `vendor/eliza/plugins/plugin-files/src/documents/local-ocr.ts` (all exist). Duplicates: `verify-apks.ts` checks the packaged bytes on every real APK build. Callers: harness `refinement/services/android-gzip-asset-stage.mjs` (138 lines, which imports `protectGzipAssets, packagedGzipProblems` and the merge fixture `test/fixtures/android-gzip-assets.mjs`), wrapper `test/quint-android-gzip-asset-stage.test.mjs`, aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.3 | `build-android.ts` and `verify-apks.ts` are broad sources: any edit to them selects this model for Apalache, although only the gzip step is modelled. | Narrow `sources` to `scripts/android-gzip-assets.ts` (plus the vendor OCR file that ships the `.gz` assets). | low |
| 2 | 18 | — | `malformedInput` sets `raw: 3`, outside `Generations`, to model a malformed input. It is clear enough. | — | none |
| 3 | whole | §2.11 | Build-tool model. | KEEP; owner question. | owner |

## Proposed end state
Unchanged model, narrower `sources`.
