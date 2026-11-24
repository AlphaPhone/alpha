# scripts/stage-embedding-host.ts
- Lines: 157 | Kind: build input stager/verifier (CLI + library) | Verdict: KEEP, SIMPLIFY
- Covers: verifies (Gradle/CI) or stages (from a build receipt) the ARM64 embedding host JNI libraries and the pinned BGE-384 model, binding them to the exact upstream native sources and to the voice host's engine bytes. Duplicates: none. Callers: `android/app/product.gradle:119` (`--verify`), `.github/workflows/resident-android.yml:327`, `scripts/android-build-preflight.ts:18`, `build-embedding-host.ts:13-14`, `generate-sbom.ts:49`, `prepare-embedding-host.ts:8`; listed in `quint-lib.ts:29`, `source-snapshot.ts:29`; Quint `android-build-input-readiness.mjs:14`, `services/manifest.json:2694`; tests `embedding-host-admission`, `embedding-library-source`, `embedding-native-contract`, `host-speech-admission`, `sbom`, plus T1 pins in `one-runtime-profile.test.mjs:59` (regex on product.gradle) and `embedding-host-admission.test.mjs:201` (reads this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-87, 100-124, 125-157 | D8 | 300-character conditions with many clauses and one generic message ("Embedding host build input qualification missing or changed"). | Named predicate per rule (`sameInputSet`, `validDigest`) and one message each; one statement per line. | Low |
| 2 | 8-9, 59 | C3 | Local sha256/hash and `git -C vendor` wrapper (17 twins). | Shared `scripts/lib` helpers. | — |
| 3 | 125-157 | C3 | Hand-rolled CLI parsing by argv length. | `parseArgs`. | — |
| 4 | 86 | B1 | Catch wraps every error into "Embedding host source admission changed: …"; acceptable (keeps cause). | Keep. | — |
| 5 | 11 | C6 | Model path/sha256/dimensions literal; check whether `android-stage-voice-models.ts` or the voice record already names the same model. | One owner constant if duplicated. | — |
| 6 | 103-108 | — | `allowAbsentRuntime` path for `--allow-unpackaged-runtime` developer APKs (AGENTS.md). | Keep. | — |

## Proposed end state
Same API (`verifyEmbeddingHost`, `verifyEmbeddingInputs`, `verifyEmbeddingEngine`, `embeddingLibrarySource`,
types) in readable form with shared helpers; tests collapse into one `embedding-host` integration file
over a fixture repo with a real git vendor checkout; no text pins.
