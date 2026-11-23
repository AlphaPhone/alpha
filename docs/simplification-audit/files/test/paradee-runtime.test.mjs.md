# test/paradee-runtime.test.mjs
- Lines: 86 | Kind: tooling integration (real `verifyParadeeRuntime` / `verifyParadeeAppLinkage` from `scripts/paradee-runtime.ts` over a temp tree with real nested git repositories and a gitlink; plus `selectedAndroidAbis` / `abiArguments` from `scripts/android-abis.ts`) | Verdict: MERGE into `test/tooling/android-build-inputs.test.ts` (Paradee voice section); move the ABI case to the android-abis section
- Covers: the build gate for staged Paradee voice outputs: explicit unpackaged lane admits only full absence; complete bytes never mean qualification; ASR slot pins (qwen3 pair, parakeet single file, unknown backend); path traversal and duplicate records refused; unrecorded assets refused; exact clean nested FFI checkout required; app linkage requires the exact inference bytes per ABI; ABI selection (default needs both, explicit arm64/x86); build record must name the pinned source and native commits. Duplicates: `test/android-build-path.test.mjs` and `test/voice-host-absent-admission.test.mjs` call the same verifier (scripts report). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-31 | D8 | Fixture builders are statement soup (one-line functions with 6+ statements). | Rewrite as readable helpers in the merged file. | None |
| 2 | 77, 82 | - | `import` in the middle of the file; the ABI parser case tests `android-abis.ts`, not Paradee. | Move to the android-abis section of the same tooling file. | None |
| 3 | 79-86 | T4 | Six single-assert ABI cases each rebuild the full fixture (`complete` + git init twice). | Fold into two table-driven cases (requested ABI x present ABIs; byte change in requested vs unrequested ABI). | Low |
| 4 | 14-17 | - | Cost: two `git init` + commit per fixture, ~17 fixtures; a few seconds. | Run in the Android-build lane only (path filter `scripts/paradee-runtime.ts`, `scripts/android-abis.ts`, `android/paradee-voice/**`). | Low |

## Proposed end state
A `describe('Paradee voice outputs')` in `test/tooling/android-build-inputs.test.ts` with one readable fixture builder and about ten cases: unpackaged lane, complete-but-unqualified, ASR slot rules (qwen3, parakeet, unknown backend), traversal/duplicate records, unrecorded asset, FFI checkout (changed, missing, absent submodule, wrong head), app linkage per ABI, ABI matrix (table-driven), source/native commit pins. The `selectedAndroidAbis`/`abiArguments` case moves next to other ABI tests.
