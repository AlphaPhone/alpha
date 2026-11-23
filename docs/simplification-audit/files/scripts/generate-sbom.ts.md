# scripts/generate-sbom.ts
- Lines: 390 | Kind: release tooling (CycloneDX 1.6 SBOM from committed pins, optional staged runtime and APK manifest) | Verdict: KEEP, SIMPLIFY (reuse the licence collectors)
- Covers: `artifacts/sbom/alphaphone.cdx.json` with npm, fonts, OCR cores, Gradle coordinates (with Gradle-verified SHA-256), voice host, embedding host, elizaOS, staged runtime and APKs. Duplicates: re-walks the inputs `generate-licenses.ts` already collects (see that report, finding 10). Callers/importers: package.json `sbom`; `scripts/build-android.ts:316` and `scripts/sign-release-apks.ts:358` run it; `.github/workflows/android.yml:140` uploads its output; tests `sbom`, `voice-host-record`, `llama-cpp-only`, `sign-release-apks`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 120-173, 275-292 | C5 | `npmComponents`, `fontComponents`, `ocrComponents`, `gradleComponents`, `voiceHostComponents` re-read the same inputs as the licence collectors. | Consume the shared inventory (see `generate-licenses.ts`). | M |
| 2 | 312-313, 238 | — | `collectNotices` runs once in `withLicenceFlags` and again in `residentRuntimeComponents` (`packagedRuntime: true`), each a full walk of `node_modules`, fonts and Gradle. | One collection, passed in. | L |
| 3 | 91-98 | C1 | Third `interface ApkManifest` (also `qualify-head.ts:83`, `provision-unit.ts:56`). | Export it once from `verify-apks.ts` (the writer) or `scripts/apk.ts`. | L |
| 4 | 207-214 | C3 | `walkFiles` is another directory walker. | `scripts/lib/fs.ts`. | L |
| 5 | 124, 246 | C3 | npm purl construction written twice. | `npmPurl(name, version)`. | L |
| 6 | 363-368 | C3 | Hand-rolled argument parser (one of 14). | Shared `scripts/lib/args.ts` (`node:util parseArgs`). | L |
| 7 | 180-193 | A4 | `hostScope` is "legacy qualification record ..." whenever `vendor/eliza/plugins/plugin-local-inference/native/android/consumer.gradle` exists, and it exists at the current pin, so embedding-host libraries are always labelled legacy and the `WITH_RESIDENT_RUNTIME` side of that ternary is dead. Three string constants describe "legacy / superseded / requalification pending" embedding states. | Owner question: does the ARM64 embedding host still ship (`android:build:local` still runs `agent:build-embedding-host`)? If not, drop `embeddingHostComponents` and the qualified-host record from the SBOM; if yes, fix the scope test. | M |
| 8 | 182-186 | B1 | `embeddingInputsCurrent` turns any thrown error from `verifyEmbeddingInputs` into `false`. | Catch the specific mismatch error, or return a reason. | L |
| 9 | 3-42 | — | Long but accurate header; it is the documentation of what each hash proves. | Keep, trimmed with the split. | L |

## Proposed end state
About 250 lines: the CycloneDX renderer over the shared inventory, plus the two release-machine extensions (`--packaged-runtime`,
`--apks`). One `collectNotices` call, shared walker, purl helper, argument parser and `ApkManifest` type. Output stays deterministic and
byte-identical for unchanged inputs (`test/sbom.test.mjs`).
