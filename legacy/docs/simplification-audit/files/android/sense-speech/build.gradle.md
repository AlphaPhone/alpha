# android/sense-speech/build.gradle
- Lines: 9 | Role: `:sense-speech` module — the shared paradee-voice consumer packaged into the separate Sense listener APK, with a `voice-host.ts --verify` preBuild check | Verdict: KEEP (consistency fix)
- Importers: `android/consumer-host.json:44` (`appDependency: false`), referenced as `ext.elizaSenseSpeechProject = ':sense-speech'` by `android/sense/build.gradle:9`. Text/path pins: `test/android-host.test.mjs:119,122` (module name).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | C7 | `ext.elizaParadeeSourceDir = file('../../vendor/eliza/plugins/plugin-local-inference/native/android')` reads upstream directly, while `local-speech/build.gradle:6-10` and `sense/build.gradle:3-7` read the same module from `prepare-patched-native.ts`'s root. | Use the prepared root here too (same exec block as sense), so all three modules compile one authenticated tree. | Low (patches list is empty, bytes identical). |
| 2 | 5-8 | C5 | `verifySenseVoice` runs `voice-host.ts --verify` without the `paradeeAbiArgs`/`--allow-absent` that `product.gradle`'s `verifyVoiceHost` passes. | Share the ABI fragment proposed for local-speech (`android/paradee-abis.gradle`) and pass the same args, or document why Sense always requires staged outputs. | Low |
| 3 | — | A4 (owner) | Sense APK is development-only while P-78 stands (research §1). | Lives or dies with `android/sense`. | — |

## Local types and helpers
None.

## Proposed end state
~10 lines: prepared-root source dir, native dir, apply consumer.gradle, verify task with shared ABI args.

## Verification
`./gradlew :sense:assembleDebug` via the generated host (with staged voice outputs); `node --test test/sense-packaging-ndk.test.mjs test/android-host.test.mjs`.
