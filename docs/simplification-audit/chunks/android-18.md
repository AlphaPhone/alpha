# Chunk android-18 — summary

34 files: small Gradle modules (local-speech, sense, sense-speech, three fixture APKs), Sense identity shims, signing/voice/upstream data records. Per-file reports are under `docs/simplification-audit/files/android/...`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| android/gradle/verification-reviewed-groups.json | SIMPLIFY (drop 6 KB changelog in `review`) | 150 | 150 (≈3 KB) |
| android/local-speech/build.gradle | SIMPLIFY | 53 | 42 |
| android/notification-fixture/build.gradle | KEEP | 20 | 20 (13 if synthetic key dropped) |
| android/notification-fixture/src/main/AndroidManifest.xml | SIMPLIFY | 9 | 8 |
| android/notification-fixture/src/main/java/.../FixtureActivity.java | KEEP (format) | 34 | 34 |
| android/notification-fixture/src/main/java/.../MediaFixtureActivity.java | DELETE (owner) | 76 | 0 |
| android/notification-fixture/synthetic-media-provenance.json | DELETE | 9 | 0 |
| android/paradee-voice/asr-inputs.json | SIMPLIFY (or fold into voice host record) | 26 | 20 (0 if folded) |
| android/private-peer-fixture/build.gradle | KEEP (−1 line) | 11 | 10 |
| android/private-peer-fixture/src/main/AndroidManifest.xml | KEEP (drop `debuggable`) | 7 | 7 |
| android/private-peer-fixture/src/main/java/.../PrivateSocketProbeService.java | KEEP (minor) | 61 | 61 |
| android/release-signer.json | KEEP (owner q on rotation) | 43 | 40 (25 without rotation) |
| android/sense-speech/build.gradle | KEEP (consistency) | 9 | 10 |
| android/sense/build.gradle | KEEP | 12 | 12 |
| android/sense/.../ConsentActivity.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/sense/.../IndicatorLeaseProvider.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/sense/.../ListenerActionReceiver.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/sense/.../ListenerControlProvider.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/sense/.../ListenerTileService.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/sense/.../ListeningService.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/sense/.../SenseApplication.java | KEEP / DELETE (owner) | 4 | 0–4 |
| android/signing/alpha-key-manifest.json | KEEP | 107 | 107 |
| android/signing/os-custody-expected.json | KEEP | 18 | 18 |
| android/signing/ota-tools.json | KEEP | 12 | 12 |
| android/signing/public/PROVENANCE.json | DELETE | 10 | 0 |
| android/signing/public/fingerprints.json | DELETE (owner confirm) | 88 | 0 |
| android/upstream-native-sources.json | KEEP (patch list empty) | 23 | 22 |
| android/video-fixture/build.gradle | DELETE | 60 | 0 |
| android/video-fixture/src/androidTest/.../VideoCopyInstrumentedTest.java | DELETE | 203 | 0 |
| android/video-fixture/src/androidTest/.../VideoCopyPreservationInstrumentedTest.java | DELETE | 182 | 0 |
| android/video-fixture/src/main/AndroidManifest.xml | DELETE | 6 | 0 |
| android/video-fixture/src/main/assets/qa-source.json | DELETE | 42 | 0 |
| android/video-fixture/src/main/java/.../VideoFixtureActivity.java | DELETE | 8 | 0 |
| android/voice-host/qualified-voice-host.json | KEEP (drop `asrSlot`, `componentBuild`) | 353 | 340 |

Total ≈1,659 lines now; confident removals ≈ 530 lines (video-fixture 501, provenance files 19, local-speech 11, misc); with owner-approved deletions (MediaFixtureActivity, fingerprints.json, Sense shims, rotation block, asr-inputs fold) ≈ 750.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `selectedParadeeAbis` / `paradeeAbiArgs` | Gradle locals | android/local-speech/build.gradle:2-4 | android/app/product.gradle:138-140 (verbatim) | new `android/paradee-abis.gradle` applied by both (and sense-speech) |
| `preparedSpeech` / `preparedSense` / `preparedNative` exec of `prepare-patched-native.ts` | Gradle local | local-speech/build.gradle:6-9, sense/build.gradle:3-6, video-fixture/build.gradle:26-29 | each other | keep per module (video copy deleted); optional `rootProject.ext.patchedNativeRoot` from the generator |
| UUID canonical check | idiom | FixtureActivity.java:17, MediaFixtureActivity.java:27 | PrivateSocketProbeService.java:58 (regex variant) | keep local per fixture APK; align on `UUID.fromString(x).toString().equals(x)` |
| `readBounded` | helper | MediaFixtureActivity.java:31 | VideoCopyPreservationInstrumentedTest.java:46 `readAll`; 7× app main (research C3) | deleted with files |
| `sha` / `hash` / `digest` SHA-256 hex | helper | MediaFixtureActivity.java:32, VideoCopyPreservationInstrumentedTest.java:33, VideoCopyInstrumentedTest.java:64, video-fixture/build.gradle:35 | 10× app Java, ~40× scripts | deleted with files |
| `Response extends PluginCall` | class | VideoCopyInstrumentedTest.java:45-51 | hand-written Capacitor call fakes in app androidTest | deleted |
| ASR slot record | data | android/paradee-voice/asr-inputs.json | qualified-voice-host.json `asrSlot` (16-23) + `models[asr-model]` (117-134) | one record in qualified-voice-host.json |
| `runtimeEnv.ELIZA_ASR_BACKEND` | data | asr-inputs.json:6-8 | scripts/host-speech-admission.ts:54 hard-codes `'ggml'` | delete the unread data key |
| public key fingerprints | data | signing/public/fingerprints.json | signing/os-custody-expected.json:5-17, release-signer.json:4 | os-custody-expected.json (the read copy) |
| `unsignedApkSHA256` | data | release-signer.json:19-22 | release-signer.json:38-41 | `privateProducerApproval` copy only |
| `PatchManifest` type | type | scripts/prepare-patched-native.ts:22-27 | scripts/quint-lib.ts:119 inline shape | one exported type (or none, once `patches` goes) |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `android/video-fixture/` (build.gradle, manifest, VideoFixtureActivity, 2 androidTest classes, qa-source.json, qa-long.mp4) | Not in `VERIFIED_TASKS` (gradle-verification.ts:32-38); grep `:video-fixture`, `videoqa`, `alphaVideoFixturePackage`, `VideoCopyInstrumentedTest`, `VideoCopyPreservation`, `qa-long`, `qa-source.json`, `native-video-source.json`: only inside the module. Tests target upstream `ai.eliza.plugins.media.VideoCopyEdits`. Move `qa-source.mp4` to `test/fixtures/`. | High |
| `android/video-fixture/src/main/assets/qa-source.json` | No reader; `sourceClasses` point at deleted `android/app/.../VideoCopyEdits.java`, `VideoEditSpec.java` | High |
| `android/notification-fixture/synthetic-media-provenance.json` | No reader (grep 0) | High |
| `android/signing/public/PROVENANCE.json` | No reader (grep `PROVENANCE` 0; only `.pem` files of that dir are read by test/os-update-enrollment.test.mjs) | High |
| `android/signing/public/fingerprints.json` | No reader of the committed copy; all its digests except `apex_payload` duplicated in os-custody-expected.json / release-signer.json | Medium (owner may want the ceremony record) |
| `MediaFixtureActivity.java` + manifest line 4 + `assets/synthetic-blue.mp4` + `PhotosForeignLibraryInstrumentedTest.java` + `android-instrumentation.ts:255` row | No script launches the activity or supplies `photosForeign*` args | Medium (owner) |
| `local-speech/build.gradle:11-14` vendor fallbacks | Module always staged (upstream-native-sources.json:7); `vendor/eliza/packages/app/platforms/android/local-speech` does not exist | High |
| `asr-inputs.json` `runtimeEnv` | No reader | High |
| `qualified-voice-host.json` `asrSlot.current`, both `componentBuild` strings | No reader (grep 0) | High |
| `qualified-voice-host.json` `asrSlot` block | Derivable from `models`; only read to prove it equals the derivation | Medium |
| `PrivateSocketProbeService` `!BuildConfig.DEBUG` + `buildConfig true`; manifest `android:debuggable` | Only debug variants exist (variantFilter) | High |
| `verification-reviewed-groups.json` `review` changelog text | No reader of `review` | High |
| Seven `android/sense/.../*.java` identity shims | Needed only because `componentPackage` = product package; listener never shipped | Low–Medium (owner, P-78) |
| `release-signer.json` `apkSigningRotation` + rotation code paths | Package renamed 2026-11-10, `lastRelease` null | Low (owner; high impact if an installed base exists) |
| `upstream-native-sources.json` `patches` + patch branch of `prepare-patched-native.ts` | `"patches": []` | Medium (owner) |

## Cross-file actions
1. **Remove video-fixture module**: delete `android/video-fixture/**`; move `android/video-fixture/src/main/assets/qa-source.mp4` → `test/fixtures/qa-source.mp4`; update `test/browser/native-video-library-change.spec.ts:7`, `scripts/ci/affected.ts:14` (`browserReadAndroid`; `test/ci-affected.test.mjs` scans test/browser to keep it complete), `android/consumer-host.json:46`, `test/android-host.test.mjs:119,122`.
2. **Retire foreign-Photos campaign** (owner): delete `MediaFixtureActivity.java`, `notification-fixture/src/main/AndroidManifest.xml:4`, `notification-fixture/src/main/assets/synthetic-blue.mp4`, `notification-fixture/synthetic-media-provenance.json`, `android/app/src/androidTest/.../PhotosForeignLibraryInstrumentedTest.java`, `scripts/android-instrumentation.ts:255`; re-run `test/android-instrumentation-runner.test.mjs`.
3. **Shared Paradee ABI fragment**: new `android/paradee-abis.gradle`; edit `android/app/product.gradle:138-140`, `android/local-speech/build.gradle:2-4`, `android/sense-speech/build.gradle:5-8`; the generator (`scripts/android-host.ts` / upstream consumer-host) must copy the new file into the generated host if it does not already ship `android/` verbatim; keep `test/one-runtime-profile.test.mjs:54-68` regexes green.
4. **One locator for upstream speech sources**: `local-speech/build.gradle:11-14,41` and `sense-speech/build.gradle:2` → `prepare-patched-native.ts` root.
5. **One ASR record**: fold `android/paradee-voice/asr-inputs.json` into `android/voice-host/qualified-voice-host.json`; edit `scripts/paradee-runtime.ts:47-56,89-91`, `scripts/voice-host.ts:18,45,80-87,118-125,162`, `scripts/ci/speech-candidate.ts:35-37`, `scripts/host-speech-admission.ts:54` (if `runtimeEnv` is kept as data), tests `test/paradee-runtime.test.mjs`, `test/voice-host-record.test.mjs`, `test/voice-host-absent-admission.test.mjs`, `test/android-build-path.test.mjs`; `scripts/source-snapshot.ts:26` lists `android/paradee-voice`.
6. **One fingerprint record**: delete `android/signing/public/fingerprints.json` and `PROVENANCE.json`; optionally have `scripts/ci/release-custody-proof.py` read `appSignerSha256` from `android/release-signer.json` and drop it from `os-custody-expected.json` (update `release-custody-proof.test.py:79-81`).
7. **Sense shims** (owner): `android/aosp/pixel10a-composition.json:29` componentPackage → `ai.eliza.sense`; delete seven `android/sense/src/main/java/.../*.java`; update `test/always-on-listener.test.mjs:13`, `test/aosp-pixel10a.test.mjs:15`, `specs/quint/native/manifest.json:216-218,257-259,322`.
8. **Rotation block** (owner): `android/release-signer.json:10-24`, `scripts/sign-release-apks.ts:77,216`, `scripts/update-apk-admission.ts:37,80,110`, `.github/workflows/release-cloud-app-signing.yml:157-183`, `scripts/owner/pilot-rotation.ts`, `scripts/pilot-update.ts:381`, tests `test/sign-release-apks.test.mjs:298-305`, `test/update-apk-admission.test.mjs`.
9. **Empty native patch list** (owner): `android/upstream-native-sources.json:22`, `scripts/prepare-patched-native.ts:22-60`, `scripts/quint-lib.ts:119`, its tests.
10. **Private peer fixture trims**: `private-peer-fixture/build.gradle:7`, `PrivateSocketProbeService.java:56`, manifest line 4 — all three in one change (their bytes are hashed together by `scripts/ci/build-private-peer.py` and re-checked by `scripts/ci/resident_fixture.py`, recomputed per run, so no pinned digest to update).

## Text/path pins
- `test/one-runtime-profile.test.mjs:54,67-68` — regexes on `android/local-speech/build.gradle` (`if \(unpackaged && !nativeOutput\.exists\(\)\) \{`, `tasks\.register\('verifySpeechInputs', Exec\) \{\s+workingDir`).
- `test/sense-packaging-ndk.test.mjs:14-20`, `test/quint-indicator-provider.test.mjs:28-33` — regexes on `android/sense/build.gradle`.
- `specs/quint/native/manifest.json:216-218,257-259,322,1581` — Sense shim paths and `android/sense/build.gradle`.
- `test/android-host.test.mjs:119,122` — module name arrays (local-speech, notification-fixture, private-peer-fixture, sense, sense-speech, video-fixture).
- `test/gradle-verification.test.mjs:139,153-155` — notification-fixture build.gradle path; `reviewedAt` date; `groups` equals metadata groups.
- `scripts/gradle-verification.ts:32-38,62` — `VERIFIED_TASKS` (notification-fixture, private-peer-fixture), `REVIEWED_GROUPS` path.
- `scripts/source-snapshot.ts:21,26` — notification-fixture build.gradle + src, `android/voice-host`, `android/paradee-voice`, `android/local-speech/build.gradle`.
- `scripts/voice-host.ts:215-227` — walks `android/local-speech/src/*`; `:18` `VOICE_ASR_SLOT` path.
- `scripts/ci/build-private-peer.py:8`, `scripts/ci/resident_fixture.py:26`, `test/resident-native-ci-admission.test.mjs:47,51` — private-peer-fixture source set and build.gradle hashed.
- `scripts/ci/affected.ts:14`, `test/browser/native-video-library-change.spec.ts:7` — `android/video-fixture/src/main/assets/qa-source.mp4`.
- `NotificationAccessTestDriver.java:14,32`, `CrossAppNotificationsInstrumentedTest.java:66` — fixture package/class names and UI strings `Posted `, `Cleaned `, `Tapped … count 1`.
- `README.md:292` — `android/signing/ota-tools.json` `reviewedTargets: []`.
- Signing records: `scripts/enroll-release-keys.ts:41`, `scripts/ci/release-custody-proof.py:114-116`, `scripts/ci/sign-os-ota.py:55,217,223`, `scripts/stage-os-update-enrollment.ts:30`, and the `release-signer.json` reader list in its report.
- `android/upstream-native-sources.json` — `scripts/prepare-patched-native.ts:9`, `scripts/quint-lib.ts:119`, ~22 `specs/quint/refinement/native/*.mjs` (`nativeManifest` constant), `specs/quint/{native,services}/manifest.json`, `android/consumer-host.json:119`.
- `android/voice-host/qualified-voice-host.json` — ~14 scripts, 2 workflows, `licenses/`, generated third-party notices, 11 tests (listed in its report).

## New patterns
- **NEW-a — Unrun physical-device QA modules.** A whole Gradle module (APK + instrumented tests + generated-source staging + evidence JSON) built for a one-off qualification and never wired into any runner (`video-fixture`; `MediaFixtureActivity` campaign half). Treatment: delete, or add a runner and list it with the other campaigns. Close to A7 + T9 but at module scale.
- **NEW-b — Twin data records kept equal by validators.** Two committed JSON files restating the same digests/licences (asr-inputs vs voice host `asrSlot`/models; fingerprints.json vs os-custody-expected.json vs release-signer.json; `unsignedApkSHA256` twice in release-signer.json), plus code whose only job is proving the copies agree. Treatment: one record, derive the rest. Data-file form of C6 + B3.
- **NEW-c — Patch machinery with an empty patch list.** `upstream-native-sources.json` `"patches": []` while the patch application/validation code and "patched" naming remain.

## Owner questions
1. Is the foreign-Photos permission campaign (`MediaFixtureActivity` + `PhotosForeignLibraryInstrumentedTest`) still wanted? No script drives it today.
2. Was any build signed with the previous app key `0438dccb…` installed under `ai.alphacompute.alphaphone`? If not, the `apkSigningRotation` block and rotation code paths can go.
3. May the Sense `componentPackage` change to `ai.eliza.sense` so the seven empty identity subclasses can be deleted (listener never shipped; P-78)?
4. Keep `android/signing/public/fingerprints.json` as the ceremony record (and drop `os-custody-expected.json`), or delete it as an unread copy?
5. Is local native patching retired for good (`"patches": []`), so the patch branch of `prepare-patched-native.ts` can be removed?
6. Should the notification fixture keep its own synthetic signing key, or is the default debug key enough (separate UID comes from the package)?
