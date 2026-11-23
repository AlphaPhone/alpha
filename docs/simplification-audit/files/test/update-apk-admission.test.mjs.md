# test/update-apk-admission.test.mjs
- Lines: 117 | Kind: tooling (release gate) for `scripts/update-apk-admission.ts`; test 4 is a real integration with openssl, aapt2 and apksigner | Verdict: KEEP, MERGE into `test/tooling/app-update.test.mjs`
- Covers: before an update manifest is published, only the exact compiled public channel, package, version, flavor/HOME markers, verified signer and an exactly approved signing rotation are admitted; real SDK signatures bind the binary identity and reject tampered or unsigned APKs and targetSdk < 35. Duplicates: channel metadata parsing overlaps `update-channel.test.mjs` test 6. Callers/importers: `npm test`. Imports `scripts/update-apk-admission.ts`, `apk.ts`, `provision-unit.ts` (`PACKAGE`), `toolchain.ts`, `update-channel.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 61-117 | — | Strong real-tool integration of a release rule; keep. | Keep. | none |
| 2 | 63-65 | T9 | Skips silently without Android SDK 36 and JDK 21; if the `npm test` CI lane has no SDK this case never runs in CI. | Run the tooling file in the lane that already has the SDK (Android build lane), and make the skip a failure there (`ALPHA_REQUIRE_ANDROID_SDK=1`). | medium |
| 3 | 23-32 | T4 | Compiled-channel metadata admission repeats `update-channel.test.mjs:50-56`. | Keep one set when merging. | none |
| 4 | 34-59 | T3 | Refusal tables with hand-built records; they gate a release and are cheap. | Keep (tooling that gates a release). | none |
| 5 | — | cost | ~12 openssl/aapt2/apksigner spawns, 10-20 s. | Acceptable in the Android lane only. | none |

## Proposed end state
`test/tooling/app-update.test.mjs` holds this file plus `update-channel.test.mjs` (one helper for fake xmltree metadata,
one temp-dir helper). The real-SDK case runs where the SDK exists and fails rather than skips there.
