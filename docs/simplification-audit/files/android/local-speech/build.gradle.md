# android/local-speech/build.gradle
- Lines: 53 | Role: Gradle descriptor of the `:local-speech` module (shared paradee-voice Java API + JNI consumer from the patched upstream tree, or a Java-only library in the unpackaged developer lane) | Verdict: SIMPLIFY
- Importers: module `local-speech` in `android/consumer-host.json:42`. Text/path pins: `test/one-runtime-profile.test.mjs:54,67-68` (regex `if \(unpackaged && !nativeOutput\.exists\(\)\) \{` and `tasks\.register\('verifySpeechInputs', Exec\) \{\s+workingDir`; `doesNotMatch` on profile words), `scripts/voice-host.ts:215-227` (walks `android/local-speech/src/*`), `scripts/source-snapshot.ts:26`, `test/android-host.test.mjs:122` (module name list).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-4 | C6 / C3 | ABI selection `def selectedParadeeAbis = project.findProperty('elizaParadeeAbis')… throw new GradleException('Invalid elizaParadeeAbis')` and `paradeeAbiArgs` are a verbatim copy of `android/app/product.gradle:138-140`. | Move the three lines to one `android/paradee-abis.gradle` (sets `ext.paradeeAbiArgs`) applied by both scripts, or have the generator put `paradeeAbiArgs` on `rootProject.ext`. | Low; both must keep the same accepted set `arm64-v8a`,`x86_64`. |
| 2 | 11-14 | A4 / B4 | Two fallbacks that cannot run: `if (!paradee.isDirectory()) paradee = file('../../vendor/eliza/plugins/…/native/android')` and `ext.elizaSpeechSourceDir = file('../../vendor/eliza/packages/app/platforms/android/local-speech'); apply from: …consumer.gradle`. `plugins/plugin-local-inference/native/android` is listed in `android/upstream-native-sources.json:7`, so `prepare-patched-native.ts` always stages it under `preparedSpeech.root` (it throws otherwise); `vendor/eliza/packages/app/platforms/android/local-speech` does not exist at the pin (ls: no such directory). | Delete lines 11-15 and the closing `}` of the `else`, unindent the body. | Low; the prepare step already fails loudly if the module is missing. |
| 3 | 1, 5, 16, 21-22, 40, 52 | A8 (minor) | Comments are mostly accurate "why" notes; line 1 ("One explicit selection controls…") duplicates product.gradle's comment. | Keep the comments that explain the unpackaged lane (21-22) and OkHttp (52); drop line 1 once #1 moves the code. | None |
| 4 | 41 | C7 | FFI include dir is read from `vendor/eliza/...` directly while the Java sources come from `preparedSpeech.root`; `sense-speech/build.gradle:2` also uses the vendor path. Three different ways to locate the same upstream module. | Use `preparedSpeech.root` for all paths (patches are empty, so bytes are identical) or vendor for all; pick patched root for consistency with `consumer-host.json`. | Low; `verifySpeechInputs` authenticates the header either way. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `selectedParadeeAbis` / `paradeeAbiArgs` | Gradle locals | 2-4 | `android/app/product.gradle:138-140` (verbatim) | `android/paradee-abis.gradle` (new, applied by both) |
| `preparedSpeech` (exec `prepare-patched-native.ts` + JsonSlurper) | Gradle local | 6-9 | `android/sense/build.gradle:3-6`, `android/video-fixture/build.gradle:26-29` | Keep per module (one exec each; cheap), or expose once via `rootProject.ext` from the generator |

## Proposed end state
ABI selection applied from a shared fragment; `preparedSpeech` exec; `paradee` taken from the prepared root with no fallbacks; the unpackaged Java-only branch and the packaged `consumer.gradle` branch; `verifySpeechInputs`; OkHttp compileOnly. ~42 lines. Keep the two regex-pinned snippets byte-identical or update `test/one-runtime-profile.test.mjs` in the same change.

## Verification
`node --test test/one-runtime-profile.test.mjs test/android-host.test.mjs test/voice-host-absent-admission.test.mjs`; `npm run android:build:local` (both variants) and `npm run android:build -- --allow-unpackaged-runtime` without staged voice outputs (exercises the Java-only branch).
