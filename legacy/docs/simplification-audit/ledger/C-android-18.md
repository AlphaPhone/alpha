# C-android-18 ledger (stage C, in-file cleanup)

Chunk: `docs/simplification-audit/chunks/android-18.md` (34 files). `android/notification-fixture/synthetic-media-provenance.json`
was already deleted by A5 (A65); skipped.

## Done
- `android/local-speech/build.gradle`: deleted the two unreachable fallbacks (`paradee` → `vendor/eliza/plugins/.../native/android`
  and the `vendor/eliza/packages/app/platforms/android/local-speech/consumer.gradle` branch, a directory that does not exist at the
  pin); body un-nested one level, byte-identical otherwise. `prepare-patched-native.ts` always stages
  `plugins/plugin-local-inference/native/android` (listed in `upstream-native-sources.json`), and the vendor fallback is the same
  pinned tree. (A4/B4)
- `licenses/android-runtime-classpath.json` (not owned; one-line fix my change would otherwise break, brief exception b):
  `inputFingerprint` `141b9577…` → `ecb91288…`. `androidDependencyFingerprint` hashed the removed `apply from: new File(ext.elizaSpeechSourceDir, …)`
  as a `…/local-speech/consumer.gradle: missing` entry; a missing file declares no dependency, so the resolved coordinates are
  unchanged. Verified: with the HEAD `local-speech/build.gradle` the function returns the recorded `141b9577…`; with mine
  `ecb91288…`. If another implementer later changes a linked module's `build.gradle`, the fingerprint must be recomputed
  (`node scripts/generate-licenses.ts --refresh-android`, needs Gradle).
- `android/gradle/verification-reviewed-groups.json`: replaced the ~6 KB dated admission changelog in `review` (no reader) with one
  sentence stating the rule; `reviewedAt` and `groups` unchanged. (A8)
- `android/paradee-voice/asr-inputs.json`: deleted unread `runtimeEnv` (`ELIZA_ASR_BACKEND`; no reader in scripts, tests,
  workflows or `vendor/eliza`). (A7)
- `android/voice-host/qualified-voice-host.json`: deleted unread `asrSlot.current` and both `abis[].componentBuild` build-history
  strings (no reader in scripts/test/.github/specs; upstream `sense-listener.mjs` reads only `asrSlot.paths`, `abis[].abi`,
  `libraries`). No committed digest of the file exists (checked). (A8/A7)
- `android/private-peer-fixture/src/main/AndroidManifest.xml`: removed hard-coded `android:debuggable="true"`; only the debug build
  type is built (`variantFilter`), which sets it, so `build-private-peer.py` / `resident_fixture.py` badging assertion
  `application-debuggable` still holds. Source hashes are recomputed per run (no pinned digest). (B4)
- `android/notification-fixture/.../MediaFixtureActivity.java`: `bytes()` video branch dropped the post-check
  `value.length>16384` that `readBounded(in,16384)` already makes impossible. (B4)

## Deleted tests and formal artefacts
None. (`test/one-runtime-profile.test.mjs`, which regex-pinned `local-speech/build.gradle`, was already gone.)

## Pins left broken
None found. `specs/quint/native/manifest.json` pins Sense shim paths and `android/sense/build.gradle`, both untouched.

## Skipped
- Video-fixture module deletion (A64/C14): needs `qa-source.mp4` moved to `test/fixtures/` plus edits in
  `test/browser/native-video-library-change.spec.ts`, `scripts/ci/affected.ts`, `android/consumer-host.json`,
  `test/android-host.test.mjs` (file move, stage F / own unit, as A5 recorded).
- MediaFixtureActivity + manifest line 4 deletion (Q-AND-26 Open); its "if kept" findings that change runner-visible text
  (#5 receipt save failure, #6 duplicate request) skipped as behaviour changes.
- `signing/public/fingerprints.json`, `signing/public/PROVENANCE.json` (Q-AND-28 Open; A5 kept PROVENANCE with it).
- `release-signer.json` rotation block and duplicate `unsignedApkSHA256` (Q-LEG-5/Q-AND-27 Open, D17); description shortening
  skipped with it.
- `upstream-native-sources.json` `patches` / patch machinery (Q-AND-29 Open).
- Seven Sense identity shims (Q-AND-30, R7/D7: P-78 kept); comment rewording skipped to leave the Quint-pinned files alone.
- notification-fixture synthetic signing key (Q-AND-35 Open).
- Shared `android/paradee-abis.gradle` and one locator for upstream speech sources (`sense-speech/build.gradle`,
  `local-speech/build.gradle:41` FFI include dir): needs a new file, `product.gradle` (not mine) and generator changes.
- Fold `asr-inputs.json` into `qualified-voice-host.json` / delete `asrSlot`: cross-file (paradee-runtime.ts, voice-host.ts,
  speech-candidate.ts, several tests); stage E/F.
- `PrivateSocketProbeService` `!BuildConfig.DEBUG` clause and `buildConfig true`: kept; the clause is part of a
  SecurityException guard (brief: keep every security check). UUID regex → canonical round-trip: changes accepted input; skipped.
- `FixtureActivity` failure text (#2) changes runner-visible text; prefs hoist (#4) and formatter splits: left for the format pass.
- `asr-inputs.json` / `qualified-voice-host.json` description shortening: copy only, low value; left.
- B1–B4 migration maps, types.md, helpers.md: no site in these files (helpers.md names MediaFixtureActivity's `sha`, kept local:
  separate APK).

## Verification
- `node --test` over `voice-host-record`, `voice-host-absent-admission`, `paradee-runtime`, `android-build-path`,
  `gradle-verification`, `sense-packaging-ndk`, `host-speech-admission`, `strict-build-inputs`, `upstream-pin-guard`,
  `ci-pin-bound-scripts`, `embedding-host-admission`, `resident-native-ci-admission`, `android-host`, `ci-emulator-evidence`,
  `verify-apks`: 146 tests, 144 pass, 1 skipped, 1 fail (`voice-host-record` notices: classpath fingerprint stale from the
  local-speech change). After the fingerprint update `test/voice-host-record.test.mjs` 14/14 pass.
- `node scripts/generate-licenses.ts --check`: exit 0, "Third-party notices are complete and current (121 entries)".
- `node --test test/sbom.test.mjs`: 8/8 pass.
- `javac` parse-only (`-XDshould-stop.ifNoError=PARSE -proc:none`) of `MediaFixtureActivity.java`: exit 0 (parse check, not a
  compile). Private-peer manifest parsed as XML.
- Not run: Gradle (no wrapper/settings in `android/`; host is generated by the pipeline), `build-private-peer.py`,
  `build-notification-fixture.ts`, any APK build, emulator, image or device run. No TypeScript changed, so `tsc` not needed.
