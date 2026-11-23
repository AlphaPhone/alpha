# scripts/embedding-native-contract.ts
- Lines: 64 | Kind: script (build/admission contract for the upstream embedding JNI library) | Verdict: KEEP + SIMPLIFY
- Covers: the exact upstream producer files, identity rewrite (package `ai.elizaos.app` → Alpha), JNI registration-table vs Java declaration check, required exported symbols. Shared by preparation and admission so both see the same closure. Callers: `scripts/prepare-embedding-host.ts:7,42-85`, `scripts/stage-embedding-host.ts:6,63-83`; tests `embedding-native-contract`, `embedding-host-admission`, `embedding-host-producer-closure`, `android-build-path`, `sbom`, `upstream-pin-guard`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-37,58 | A4 | `'exported'` mode (rewrite `Java_ai_elizaos_app_` symbols) is for an upstream that does not use `RegisterNatives`; the pinned `elizavoice-jni.cpp` uses it (3 matches), so only `'registered'` runs. | Require registered mode; delete the exported branches in `nativeBinding`, `nativeInputs`, `nativeGenerated`, `nativeRequiredSymbols`, `nativeCmakeOptions`. Fails loudly if upstream changes. | Low |
| 2 | 27,32 | A4 | `subset: 'full'` is a constant field. | Drop the field; hard-code in cmake options. | Low |
| 3 | 43-57 | — | Regex parse of Java/C++ is a build-time admission of third-party source text (not a test of our source); justified. | Keep. | — |

## Proposed end state
~40 lines: producer path list, registered-only binding, Java/registration check, symbol check.
