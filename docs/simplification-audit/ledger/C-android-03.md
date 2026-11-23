# C-android-03 (stage C, chunk android-03)

All 20 files in `chunks/android-03.files.txt` still exist. No B1-B4 migration-map, `types.md` or `helpers.md` row
names these files, so no shared-module replacement applied.

## Done

- `android/app/product.gradle`: deleted the removed-profile refusal (`ELIZA_RUNTIME_PROFILE` / `ELIZA_LOCAL_EMBEDDINGS`
  property throw). `build-android.ts` and `gradle-verification.ts` already strip those inputs. Trimmed the header comment
  so it says what the file does now (A8).
- `android/app/product.gradle`: replaced the `ELIZAOS_APP_LINK_HOST` input with `def appLinkHost = cloudWebHost`. The
  input was read, trimmed, DNS-checked and then had to equal `cloudWebHost`. Nothing sets it (git grep). The BuildConfig
  field `ELIZAOS_APP_LINK_HOST` and the `appLinkHost` manifest placeholder keep their names and values. Fixed the
  BuildConfig comment, which wrongly said `"" when none` (B3/D5).
- `android/app/product.gradle`: deleted the `envValue` closure. Its only caller was the App Link input above (A7).
- `android/app/product.gradle`: deleted the `verifyRuntimeWebProfile` preBuild task, which refused synced assets that
  name a removed Cloud profile. `build-android.ts` refuses the same `runtimeProfile` condition before sync (A1/A8).
- `android/app/product.gradle`: removed `issue #395` from the source-commit comment (A8).
- `android/app/proguard-rules.pro`: deleted `-keep class com.getcapacitor.community.** { *; }`, which line 9
  `com.getcapacitor.** { *; }` already covers. Deleted the `NativeProcessSupervisor` and `browsersurface.**` keeps and
  their comment, which `ai.eliza.plugins.** { *; }` already covers. Deleted the "Developer hooks…" comment, which had
  no rule (B4/A8). These deletions do not change R8 output.
- `android/aosp/product.json`: deleted the `physicalProduct` key. It has no reader in scripts/, specs/ or
  `vendor/eliza/packages/os`. The description now names the Pixel descriptor by path (A7).
- `android/aosp/pixel10a-ota-channel.json`: removed "(issue #400)" from `description`. No reader parses the
  description and no digest pins the file (A8).
- `android/app/src/androidTest/assets/video-account-fixture.js`: A5 had already removed the
  `savedSignInRecoveryStatus` answer. No further change.

## Deleted tests and formal artefacts

- `test/one-runtime-profile.test.mjs`: source-text. It regex-pinned the deleted Gradle refusal (line 57) together
  with other `product.gradle`, `build.gradle` and script text. Its remaining cases cover the removed-profile refusals
  that scripts-02 deletes.
- `test/android-app-abi-selection.test.py`: transplant. It sliced `product.gradle` from
  `// Debug ABIs use the same explicit target` to the `def envValue` marker and ran the slice under Groovy. The marker
  is gone with the dead closure.
  - Removed its runner entry from `test/python-suites.test.mjs`, along with the `noGroovy`/`gradleHome` consts and
    `globSync`/`homedir` imports that only that entry used.
- Updated expectations in behavioural tests, removing only the cases for deleted features:
  - `test/android-host.test.mjs`: removed `verifyRuntimeWebProfile` from the task-name list.
  - `test/release-signing.test.mjs`: removed the three regexes on the deleted App Link input lines.
  - `test/aosp-product-lock.test.mjs`: removed the `physicalProduct` assertion.
- No Quint, Lemma or `specs/` reference to these files (git grep `proguard-rules.pro`, `app/product.gradle`,
  `aosp/product.json`, `pixel10a-ota-channel.json` in specs, LemmaScript-files.txt, .github: none).

## Pins left broken

None found. `test/update-channel-gradle.test.py` slices `// One-tap app update` … `\nandroid {`. That region is
unchanged, and it defines its own stubs.

## Skipped

- `system-entry/test_native_plan.py` deletion and its README lines: Q-AOSP-6 (Open).
- `product.gradle` private-QA admission cut to a digest check, and the lowercase `x-goog-*` divergence: Q-AND-31 (Open).
- `product.gradle` single property/env `input` closure and shared ABI-list closure: these change empty-string and
  whitespace handling in edge cases, and Gradle cannot run here to check them. Not applied.
- `product.gradle` merge of the four preBuild `Exec` tasks into one script: optional, needs a new script (not owned).
- `pilot-system-update-enrollment.json` `legacyOTACertificateSha256` and the routing-key single source:
  - Q-AND-32 (Open) covers the whole pilot.
  - The staging receipt records `sha256(profileBytes)`, so any byte change alters a recorded identity.
  - The type member is in `scripts/stage-os-update-enrollment.ts` (not owned).
- `proguard-rules.pro`:
  - Line `ai.elizaos.plugins.**`: upstream `android-native-agent.ts` and `platform-sync.ts` can add the bun-runtime
    plugin, so "never compiled" is not provable.
  - `HostedDeliveryWorker`/`ElizaTasksWorker` `{*;}` keeps and manifest-component `{*;}` keeps: they change R8 member
    shrinking and need a release `mapping.txt` (Medium).
  - `androidx.**`: Q-AND-38 (Open).
- `trusted-worker.mjs` split into a harness plus a generated prelude, and the harness endpoint re-check:
  - The split needs new files, a generator step and a host srcDir (stage F / U-T3).
  - Any byte change breaks the frozen SHA in `scripts/ci/resident-native.py` and `ResidentWorkflowCrashInstrumentedTest`.
- PDF `.base64` fixtures stored as binary: needs `IsolatedPdfInstrumentedTest.java` (not owned).
- `video-account-fixture.js` model-id relaxation: it would weaken a fixture assertion and is not a simplification.
- `tools.lock.json` (Q-AOSP-8), `build-host/manifest.json` and `soong-memory.patch` (Q-AOSP-9, D14),
  `pixel10a-composition.json` sense block (D7, Q-AND-30): owner or upstream.
- Optional rename of the `alpha-system-entry.xml` overlay: the file must not move in this stage.
- `androidTest/AndroidManifest.xml`, `photo-filter-goldens.json`, `cloud-deployment.generated.gradle`,
  `pixel10a-product.json`: the reports call for no change.

## Verification

- `node --test test/android-host.test.mjs test/release-signing.test.mjs test/aosp-product-lock.test.mjs
  test/verify-apks.test.mjs test/aosp-release-signing.test.mjs test/aosp-retain-known-good.test.mjs
  test/owner-sign-aosp-release-edges.test.mjs test/enroll-release-keys.test.mjs test/app-update.test.mjs
  test/google-workspace-return-native.test.mjs test/gradle-verification.test.mjs test/python-suites.test.mjs`
  (node v26.13.0): 82 tests, 81 pass, 0 fail, 1 skipped (grpc not installed).
- `python3 -c json.load` on both edited JSON files: OK.
- Not run:
  - Gradle (no Gradle assemble or compile, per the brief). No generated host project exists here. No Java was edited.
  - `test/update-channel-gradle.test.py`: needs `JAVA_HOME`/`GRADLE_LIB`; its slice is unchanged.
  - `npm run android:build:local`, release `mapping.txt`, instrumentation.
  - The Groovy edits were checked only by reading. Every reference to `appLinkHost`, `envValue`,
    `verifyRuntimeWebProfile` and `ELIZAOS_APP_LINK_HOST` was checked with git grep.
