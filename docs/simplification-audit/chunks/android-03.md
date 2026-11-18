# Chunk android-03: summary

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| android/aosp/branding/system-entry/product-overlay/values/alpha-system-entry.xml | KEEP | 9 | 9 |
| android/aosp/branding/system-entry/test_native_plan.py | DELETE (owner confirm) | 187 | 0 |
| android/aosp/branding/tools.lock.json | KEEP (owner Q) | 8 | 8 |
| android/aosp/build-host/manifest.json | KEEP (owner Q: move upstream) | 16 | 16 |
| android/aosp/build-host/soong-memory.patch | KEEP (owner Q: move upstream) | 15 | 15 |
| android/aosp/pilot-system-update-enrollment.json | SIMPLIFY | 19 | 18 (12 with B3 fix; 0 if pilot retired) |
| android/aosp/pixel10a-composition.json | KEEP | 39 | 39 |
| android/aosp/pixel10a-ota-channel.json | KEEP | 30 | 30 |
| android/aosp/pixel10a-product.json | KEEP | 45 | 45 |
| android/aosp/product.json | KEEP (1-key trim) | 24 | 23 |
| android/app/cloud-deployment.generated.gradle | KEEP | 5 | 5 |
| android/app/product.gradle | SIMPLIFY | 160 | ~105 (~95 with one verify Exec) |
| android/app/proguard-rules.pro | SIMPLIFY | 84 | ~73 (~66 with component keeps trimmed) |
| android/app/src/androidTest/AndroidManifest.xml | KEEP | 23 | 23 |
| .../inbox-fixtures/oversize-page.pdf.base64 | data (store as binary, optional) | 1 | 0 (binary .pdf) |
| .../inbox-fixtures/password.pdf.base64 | data (store as binary, optional) | 1 | 0 (binary .pdf) |
| .../inbox-fixtures/too-many-pages.pdf.base64 | data (store as binary, optional) | 1 | 0 (binary .pdf) |
| .../assets/photo-filter-goldens.json | KEEP (data) | 1 | 1 |
| .../assets/trusted-worker.mjs | SPLIT (generate prelude) | 399 | ~37 checked in |
| .../assets/video-account-fixture.js | SIMPLIFY (small) | 85 | ~84 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `sha(path)` | helper | android/aosp/branding/system-entry/test_native_plan.py:16 | SHA-256→hex in `prepare.py`, `hidden-navigation-handle/test_hidden_handle.py`, `scripts/stage-alpha-os-branding.py` `digest`, ~40 in scripts | delete with the file |
| `envValue` + four other property/env reads | helper | android/app/product.gradle:13,17-18,22,25,33 | one another | one `input` closure in product.gradle |
| ABI list validation | helper (inline) | android/app/product.gradle:19-21 | product.gradle:138-139 | one local closure |
| private-QA update admission | helper (inline) | android/app/product.gradle:50-79 | scripts/update-channel.ts:24-57 `readUpdateChannel` (diverges on query-key case) | Node only; Gradle checks the digest |
| `sourceGit` | helper | android/app/product.gradle:105-108 | the `git()` wrappers in scripts (C3) | stays (Gradle side) |
| `alphaCloudWebHosts` | const (generated) | android/app/cloud-deployment.generated.gradle:2 | generated TS/Java twins | stays generated |
| `workerLeasePrelude` copy | generated code | android/app/src/androidTest/assets/trusted-worker.mjs:1-361 | vendor/eliza/plugins/plugin-workflow/src/services/workflow-worker-lease-prelude.ts | generate at instrumentation build |
| Pilot enrollment profile type | type | scripts/stage-os-update-enrollment.ts:8-10 (mirrors pilot-system-update-enrollment.json) | — | script |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `android/aosp/branding/system-entry/test_native_plan.py` (+ README lines 37, 51) | No runner. grep `test_native_plan` finds only the README. `test/python-suites.test.mjs` lists its suites explicitly. Its inputs `.cache/` are absent. | High (owner confirm) |
| `legacyOTACertificateSha256` in pilot-system-update-enrollment.json and its type member at stage-os-update-enrollment.ts:9 | Declared in the type, never read. The test does not reference it. | High |
| `physicalProduct` in android/aosp/product.json + test/aosp-product-lock.test.mjs:45 | No reader in scripts/ or vendor/eliza/packages/os/scripts | High |
| product.gradle:8-9 removed-profile refusal + regex in test/one-runtime-profile.test.mjs:57 | build-android.ts:89 and gradle-verification.ts:278 already strip these env vars | High |
| product.gradle:33-38 `ELIZAOS_APP_LINK_HOST` input | Nothing sets it, and the only accepted value is `cloudWebHost` | High |
| product.gradle:151-159 `verifyRuntimeWebProfile` + name at test/android-host.test.mjs:110 | build-android.ts:304-307 refuses the same `runtimeProfile` condition | High |
| proguard-rules.pro:11, 21, 23-26, 40-41, 58-59 | Subsumed by broader rules or name no compiled package. (`ai.elizaos.plugins` = bun-runtime, which is not a module.) `ElizaTasksWorker` does exist (upstream RESIDENT_HOST_CLASSES), but lines 42-44 cover it. | High (11, 21, 23-26, 58-59); Medium (40-41) |
| proguard-rules.pro:29-36 manifest component `{*;}` keeps | AAPT2 generates keeps for manifest classes; only ElizaAgentService needs member keeps | Medium (verify mapping.txt) |
| trusted-worker.mjs:1-361 checked-in prelude + test/trusted-worker-prelude.test.mjs | Verbatim vendor output, kept in sync by a marker-slicing test | Medium (needs a generation step) |
| video-account-fixture.js:20 `savedSignInRecoveryStatus` | Legacy pre-namespace recovery (A1). Delete with LegacyCloudRecovery. | High (coupled) |

## Cross-file actions
1. **Private-QA update admission, one implementation**: android/app/product.gradle:43-79 → digest-only check; scripts/update-channel.ts stays the admission; test/update-channel-gradle.test.py (slices product.gradle between `// One-tap app update` and `\nandroid {`) is shrunk or deleted; test/update-channel.test.mjs and test/verify-apks.test.mjs are re-run. Fixes the bug where Node accepts lowercase `x-goog-*` keys but Gradle refuses them.
2. **Remove the removed-profile refusals**: product.gradle:8-9, 151-159; test/one-runtime-profile.test.mjs:57; test/android-host.test.mjs:110 (the task-name list); keep build-android.ts:89,304-307.
3. **App Link host input removal**: product.gradle:33-38,96; comments in GoogleWorkspaceReturn.java:10, apps/app/src/runtime/google-workspace-return.ts:3, scripts/render-assetlinks.ts:15,430 (which mention ELIZAOS_APP_LINK_HOST). Keep the BuildConfig field name `ELIZAOS_APP_LINK_HOST`, which AlphaConnectionPlugin, CloudSignInCallbackInstrumentedTest and specs/quint/refinement/native/credential-coordinator-platform.mjs:144 use.
4. **Merge the preBuild Exec tasks (optional)**: product.gradle:117-149, a new scripts/verify-android-inputs.ts, test/android-host.test.mjs:110.
5. **Trusted worker generation**: android/app/src/androidTest/assets/trusted-worker.mjs → harness file + generator (scripts/android-instrumentation.ts or agent:stage-android), the androidTest assets srcDir in the generated host (android/consumer-host.json / scripts/android-host.ts), test/trusted-worker-prelude.test.mjs (delete), scripts/ci/resident-native.py:39-42 (frozen digest), ResidentWorkflowCrashInstrumentedTest.java:348 fixture `trustedWorkerSha256`.
6. **System-entry Python test deletion**: test_native_plan.py and android/aosp/branding/system-entry/README.md:37,51. Keep portable_tools.py (used by test_hidden_handle.py and test/aosp-fresh-presets.test.py).
7. **soong-memory upstream move (owner)**: android/aosp/build-host/{manifest.json,soong-memory.patch}, scripts/pixel10a-source-contract.ts:49-55, test/aosp-staging-patches.test.mjs:50-62, vendor/eliza/packages/os/android/patches/ (upstream PR, then advance the pin).
8. **Pilot enrollment single source**: pilot-system-update-enrollment.json and scripts/stage-os-update-enrollment.ts:8-31, test/os-update-enrollment.test.mjs.
9. **PDF fixtures as binary**: the three .base64 files, IsolatedPdfInstrumentedTest.java:38.
10. **ProGuard trim**: proguard-rules.pro only, verified via release mapping.txt + scripts/verify-apks.ts + minified instrumentation.

## Text/path pins
- product.gradle: test/update-channel-gradle.test.py:10-11 (T2 slice), test/one-runtime-profile.test.mjs:54-57, test/android-host.test.mjs:105-110, test/app-update.test.mjs:95, test/google-workspace-return-native.test.mjs:87, test/cloud-sign-in-flow.test.mjs:78, test/release-signing.test.mjs:177, test/login-surfaces.test.mjs:242, test/android-app-abi-selection.test.py:29, test/gradle-verification.test.mjs:18 + scripts/gradle-verification.ts:55, scripts/source-snapshot.ts, scripts/android-host.ts, android/consumer-host.json:114.
- cloud-deployment.generated.gradle: scripts/cloud-deployment.ts:87 (writer, `--check` in `npm run verify`), scripts/source-snapshot.ts:11, specs/quint/refinement/application/account-sheet.mjs:78.
- proguard-rules.pro: android/consumer-host.json:77, scripts/source-snapshot.ts:20.
- trusted-worker.mjs: test/trusted-worker-prelude.test.mjs (marker `// Instrumentation-only trusted harness.`), scripts/ci/resident-native.py:39-42 (SHA freeze), ResidentWorkflowCrashInstrumentedTest.java:348.
- AOSP JSON: test/aosp-product-lock.test.mjs:43-45, test/verify-apks.test.mjs, test/aosp-pixel10a.test.mjs, test/pixel10a-source.test.mjs, test/always-on-listener.test.mjs, test/aosp-capabilities.test.mjs, test/aosp-secure-camera-policy.test.mjs, test/aosp-release-signing.test.mjs, test/aosp-retain-known-good.test.mjs, test/owner-sign-aosp-release-edges.test.mjs, test/enroll-release-keys.test.mjs, test/os-update-enrollment.test.mjs, test/aosp-staging-patches.test.mjs:50-62; android/signing/alpha-key-manifest.json; scripts/enroll-release-keys.ts (writes the digests).
- alpha-system-entry.xml overlay: android/aosp/branding/system-entry/manifest.json:91 (sha256), prepare.py:373,388, scripts/stage-alpha-os-branding.py:110-113, test/aosp-fresh-presets.test.py:79-80.
- androidTest manifest label "Alpha share verification": PhotosMultiShareInstrumentedTest.java:50, ShareFlowAssertions.java:71.
- No hits in specs/quint/**/manifest.json, test/support/feature-parity.mjs or LemmaScript-files.txt for these files.

## New patterns
- NEW (fixture encoding): the same fixture directory mixes binary `.pdf` files and base64-wrapped `.pdf.base64` files with decode code in the test. Store fixtures in their native format.
- NEW (generated output checked in with a sync test): upstream-generated code is copied into a product asset and kept honest by a marker-slicing equality test plus a frozen digest (trusted-worker.mjs). Generate it at build time instead. This is close to D6/D13, but the treatment is "generate, don't copy".
- Research correction: android research P19 says `ElizaTasksWorker` is "not found". It is staged from upstream `RESIDENT_HOST_CLASSES` (vendor/eliza/packages/app/scripts/mobile/android/resident-host-sources.mjs:38). Its explicit keep is redundant only because of the ListenableWorker rule.

## Owner questions
1. Delete `android/aosp/branding/system-entry/test_native_plan.py` (never run, needs fetched AOSP inputs), or wire it into a CI lane that fetches those inputs?
2. Is the pilot OS-update enrollment (`pilot-system-update-enrollment.json`, `scripts/stage-os-update-enrollment.ts`) still needed? Only its test invokes it, and no script, workflow or doc does.
3. Can private-QA builds be required to go through `build-android.ts`/`build-archive.ts`, so Gradle only checks the digest and Node is the single admission? (This also fixes the lowercase `x-goog-*` divergence.)
4. Should `soong-memory.patch` move upstream next to `soong-app-native`?
5. Can `generate-alpha-os-branding.ts` use `vendor/eliza/packages/os` boot-animation tooling instead of a separate elizaOS/os checkout pinned by `tools.lock.json`?
6. Drop the wholesale `androidx.**` ProGuard keep (measure size gain; coordinate upstream)?
7. Is the P-78 `sense` (always-on listener) block in `pixel10a-composition.json` in product scope?
