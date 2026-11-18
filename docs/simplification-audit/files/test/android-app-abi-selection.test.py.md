# test/android-app-abi-selection.test.py
- Lines: 82 | Kind: transplant (slices the ABI-selection block and the `buildTypes {}` block out of `android/app/product.gradle` by text marker and brace counting, wraps them in a hand-written Groovy driver, runs it with the Groovy jar from the local Gradle wrapper cache) | Verdict: DELETE
- Covers: debug ABI filters follow `ELIZA_ANDROID_TARGET_ABIS`/`ELIZA_ANDROID_BUN_TARGET`; release is fixed to `arm64-v8a`; invalid selections fail. Duplicates: `test/android-runtime-staging-selection.test.mjs` (same env validation in `stage-local-agent-runtime.ts`), `test/android-host.test.mjs:77-80` (release/debug filters in the generated profile), every real `android:build`. Callers/importers: `test/python-suites.test.mjs:28` (skipped when no Groovy jar is cached).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-30 | T2/T10 | Cuts Gradle source at a comment marker (`// Debug ABIs use the same explicit target`) and a brace scan; the comment is load-bearing. | Delete. | Low |
| 2 | 35-52 | T3 | Fake `TypeConfig`, `project`, `debug` closure: the driver defines half the behaviour under test. | Delete. | Low |
| 3 | 24 | T9 | Silently skipped on machines without a cached Gradle distribution (via `python-suites.test.mjs`). | Moot. | - |
| 4 | - | C7 | One of the Python tests behind a Node wrapper (two languages for one job). | Removing it shrinks `python-suites.test.mjs`. | - |

## Proposed end state
File deleted and its line removed from `test/python-suites.test.mjs`. ABI validation is covered where it is implemented in
TypeScript (`runtimeStagingSelection`) and by the real Gradle build; `product.gradle` keeps one ABI-list closure (android-03
report). `verify-apks.ts` already reads the APK's `lib/` ABIs, which is the release check that matters.
