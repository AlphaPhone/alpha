# android/video-fixture/build.gradle
- Lines: 60 | Role: Gradle descriptor of the "Alpha Video QA" APK that compiles `AlphaMediaConfig` plus upstream `VideoCopyEdits` and runs two instrumented test classes against real codecs/MediaStore | Verdict: DELETE (module)
- Importers: module `video-fixture` in `android/consumer-host.json:46` (`appDependency: false`). No script, workflow or package.json builds or runs it: grep `video-fixture:` / `:video-fixture` / `videoqa` / `alphaVideoFixturePackage` → only this file; not in `scripts/gradle-verification.ts:32-38` `VERIFIED_TASKS`. Text/path pins: `test/android-host.test.mjs:119,122` (module name lists), `scripts/ci/affected.ts:14` and `test/browser/native-video-library-change.spec.ts:7` (the `qa-source.mp4` asset path, not this file).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-60 | A7 | Never-built module. Its tests exercise upstream `ai.eliza.plugins.media.VideoCopyEdits` (T5: tests of upstream belong upstream). | Delete `android/video-fixture/` except `src/main/assets/qa-source.mp4`, which moves to `test/fixtures/qa-source.mp4` (update `native-video-library-change.spec.ts:7` and `scripts/ci/affected.ts:14`). Remove the module row in `consumer-host.json:46` and `'video-fixture'` from both arrays in `test/android-host.test.mjs:119,122`. | Low; loses a manual physical-codec campaign nobody runs. |
| 2 | 2-5 | A7 | `alphaVideoFixturePackage` property choosing between `…videoqa` and `…videoqa.preservation` — no caller sets it. | Goes with the module. | — |
| 3 | 31-50 | B3 / B5 | `stageVideoSources` copies `AlphaMediaConfig.java`, then immediately compares the digest of the copy with the source (`if(digest(source)!=digest(target))throw`) and writes a receipt `native-video-source.json` that nothing reads (grep: only this file). | Goes with the module. | — |
| 4 | 26-30 | C3 | Third copy of the `prepare-patched-native.ts` exec. | Goes with the module. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `digest` closure (SHA-256 hex) | helper | 35 | 10× Java, ~40× scripts (C3) | deleted |
| `preparedNative` exec | Gradle local | 26-29 | `local-speech/build.gradle:6-9`, `sense/build.gradle:3-6` | deleted |

## Proposed end state
File deleted (0 lines).

## Verification
`node --test test/android-host.test.mjs test/ci-affected.test.mjs`; `npx playwright test test/browser/native-video-library-change.spec.ts` after the asset move; `npm run android:build:local` (generator must no longer include the module).
