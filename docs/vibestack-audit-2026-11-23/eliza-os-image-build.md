# eliza-os-image-build: develop 7a124190a1 → vibestack-dp 769b4f00d

Slice: AOSP image staging and build, signing and trust, role overrides, APK distribution facts, runtime
payload, release metadata, and the build entry points Alpha calls.
Trees read: `eliza-develop` (7a124190a), `eliza-vs` (769b4f00d), `alpha-develop`, `alpha-vs` (3d7ca9727).
Read-only. Nothing was built, run, installed or fetched. Paths below are relative to those trees.

## Summary

| Class | Count |
|---|---|
| OK | 30 |
| NOT_APPLICABLE | 22 |
| CHANGED | 8 |
| MISSING | 3 |
| UNIMPLEMENTED | 1 |
| UNMODELED | 1 |
| UNVERIFIED | 4 |

Verdict: not proven. The image, signing, OTA and build behaviours all have a vibestack rule and code, and
the reviewed AOSP data (Pixel 10a source inventory, device templates, SystemUI patches, system updater) is
byte-identical. Two things stop the phone's APK build from the vibestack pin as the port stands:

1. The host generator refuses any Maven dependency with a fixed version. Alpha's host profile has 15.
2. The inference engine is no longer a submodule of the upstream checkout, and its build script moved.
   Alpha's embedding-host build still asks for both.

How the phone reaches this slice today matters for reading the rest:

- From vibestack `.vibe` code: `generateAndroidHost`, `stageRuntimePayload`, `verifyCommittedWorkspace`,
  `otaMain`, `prepareListenerSystemui`, `verifyListenerSystemui` (`alpha-vs/scripts/upstream-os.ts`).
- From legacy files kept in vibestack, by relative path: `packages/os/aosp/stage-launcher-overlay.ts`
  (executed by `alpha-vs/scripts/stage-aosp.ts:469`), `aosp/launcher-provisioning.mjs`,
  `aosp/soong-app-native.mjs`, `android/build-consumer.mjs`, `android/apk-distribution.mjs`,
  `android/android-manifest-facts.mjs`, `android/toolchain.ts`.
- From 27 develop scripts Alpha copied into `alpha-vs/scripts/os-ported/os/` ("retire when @elizaos/os
  offers it"). 26 are byte-identical to the develop pin apart from a header line and import paths;
  `stage-android-native.py` is modified for Node. Signing, release records, product composition, listener
  staging, image verification, secure camera, clock and APK admission all run from these copies, not
  from vibestack.

So for most of the image pipeline the phone keeps develop's code by carrying it. Vibestack's own
versions of those tools exist but are not on the phone's path, and nothing proves them equal to develop.

Vibestack usage in this slice: every rule in the 17 image, build and update specs has a Quint block.
`spec/lock.json` records no `spec/os/**` entry at all (5 entries, all `spec/app` and the index), so no
os rule is accepted or proved there. One proof file exists (`spec/os/build/androidHost.proof.dfy`).
Conformance drivers exist for 2 of the 17 specs (`os__build__androidBuild`, `os__image__firstRun`), and
only the second has a `driver:` script in `packages/os/package.json`. The other tests are hand-written
`*.test.vibe` files that do not import generated conformance cases.

## Develop PRs since 2026-11-13 touching the slice

| PR | Subject | Disposition |
|---|---|---|
| 85f016d5f (2026-11-13, no PR number in first-parent log) | Install privileged launcher JNI with `prebuilt_priv_app_native` | In `src/image/stage-launcher.vibe:502`. Not in `aosp/stage-launcher-overlay.ts` (gap 04) |
| #39775 | pnpm-linked consumer dependencies; provisioning inside the atomic launcher stage | OK |
| #39795 | Embedded cloud-only agent service in the consumer host | NOT_APPLICABLE (Alpha used the resident host); present in `android/consumer-host.mjs` |
| #39835 | Provisioning XML comments | OK |
| #39815 | Native stager admits only the target ABI | NOT_APPLICABLE upstream (no Python stager); Alpha carries the script |
| #39813, #39810 | Pixel reconstructed-input and project-list locks | OK, file identical |
| #39796 | Entries added to `packages/scripts/alphaphone-imports.manifest.json` | Guard file absent (gap 07) |
| #39661 | Resident watchdog retry (`resident-host-sources.mjs`) | Not covered here (agent service slice) |
| #39734, #39736, #39738, #39743, #39838, #39845, #39846, #39622, #39630 | `packages/scripts` repository tooling | NOT_APPLICABLE (phone build never called them) |
| #39868, #39877, #39880, #40007 | Agent container image | NOT_APPLICABLE (not the phone) |

## Gaps

### eliza-os-image-build-01 (high, CHANGED): a Maven dependency with a fixed version is refused
- Develop: `packages/app/scripts/mobile/android/consumer-host.mjs:490-513` admits either a toolchain
  version key or a fixed `group:artifact:version` (refusing only `latest` and `-SNAPSHOT`).
- Vibestack: `packages/os/src/build/android-host-profile.vibe:361` sets `artifactValid` false whenever
  `coordinate` is present; `spec/os/build/androidHost.md:188-198` says a version comes only from a
  toolchain key; `packages/os/test/build-host-profile.test.vibe:135` expects `DependencyNotPinned`.
  Schema 1 is refused too (`android-host-profile.vibe:426`, `FieldDropped`).
  `packages/os/android/host-templates/toolchain.json` has 12 keys; none for Credential Manager, Google
  ID, browser, OkHttp, Media3, WorkManager, UI Automator, Espresso accessibility or Robolectric.
- Phone: `alpha-vs/android/consumer-host.json` has 15 `coordinate` dependencies, passed unchanged by
  `alpha-vs/scripts/android-host.ts:28-32`. `pnpm android:host` is refused, so no Gradle project and no APK.
- Fix: admit a fixed coordinate in schema 2 as develop did (one rule and one line in
  `android-host-profile.vibe`), or add the keys to `toolchain.json` and move Alpha's entries to
  `module` + `toolchainVersion`. Several are already supplied by os modules
  (`android/sign-in/build.gradle:13-14`, `android/media/build.gradle:15-16`) and can simply be dropped.
- Not in wave3.md.

### eliza-os-image-build-02 (high, CHANGED): the inference engine is no longer a pinned submodule, and its build script moved
- Develop: `.gitmodules` pins `plugins/plugin-local-inference/native/llama.cpp`;
  `packages/app/scripts/paradee-voice/build-native.ts`; `packages/app/scripts/stage-elizavoice-lib.ts:45`
  imports `aosp/compile-libllama.ts`.
- Vibestack: no `.gitmodules`, no gitlink. The engine is a consumer checkout named by
  `ELIZA_INFERENCE_ENGINE_DIR` and checked against `packages/os/android/local-inference/engine.lock.json`
  (`scripts/engine.ts:20-29`). Same engine commit (5c5d6163c8). The builder is at
  `local-inference/scripts/build-native.ts`. `scripts/aosp/{compile-libllama,compile-libllama-paths,compile-shim,vulkan-source-contract,zig-toolchain}.ts`,
  `build-helpers/omnivoice-merged.ts` and `scripts/lib/repo-root.ts` are gone (no longer imported).
- Phone: `alpha-vs/scripts/build-embedding-host.ts:68,92` runs `git submodule update --init` for
  `packages/os/android/local-inference/llama.cpp` and `:122` runs `scripts/paradee-voice/build-native.ts`.
  Neither exists, so `android:build:local` stops at `agent:build-embedding-host`.
  `alpha-vs/scripts/embedding-native-contract.ts:9-19,27-28` lists seven absent producer inputs.
- Fix (Alpha side): clone the engine at the lock's commit, set `ELIZA_INFERENCE_ENGINE_DIR`, call
  `scripts/build-native.ts`, and rebuild the producer input list from the files that exist.
- Overlaps the local-inference slice. Not in wave3.md.

### eliza-os-image-build-03 (medium, CHANGED, in wave3 G): resident host class staging has no successor
- Develop: `packages/app/scripts/mobile/android/resident-host-sources.mjs:1-12,21` stages the resident
  runtime classes into the consumer's package from data: sockets, notification, environment hook,
  lifecycle hooks (`rootPublication`, `ready`), notification classes and 15 helper sources
  (`alpha-develop/android/consumer-host.json`, `residentHost`).
- Vibestack: replaced by the `agent-service` os module with `agentService.{notification,launchHook}`
  (`spec/os/build/androidHost.md:214`); `residentHost.{classes,sockets,helpers}` are `FieldDropped`
  (`androidHost.md:294`, `android-host-profile.vibe:425`). No lifecycle hook, no `unavailableStatus`.
- Phone: Alpha now subclasses the service and carries 22 ported classes, unbuilt (wave3.md item G).
- Fix: none upstream unless the owner wants the hooks back; build and test Alpha's subclass.

### eliza-os-image-build-04 (medium, CHANGED): `aosp/stage-launcher-overlay.ts` is a stale copy on the phone's build path
- Develop: `packages/os/scripts/android/stage-launcher-overlay.ts:522-540` emits
  `prebuilt_priv_app_native` for a privileged launcher and always requires the reviewed patch (85f016d5f:
  AOSP reserves `prebuilt_priv_app` for generated rules).
- Vibestack: `packages/os/aosp/stage-launcher-overlay.ts:518-533` still emits `prebuilt_priv_app` and
  skips the patch record for privileged launchers. `src/image/stage-launcher.vibe:502` has the fix, so
  the package holds two implementations that disagree.
- Phone: Alpha executes the stale file (`alpha-vs/scripts/stage-aosp.ts:469`) and imports `renderOverlay`
  and `REVIEWED_PRIVILEGED_PERMISSIONS` from it. Alpha does not pass `--native-abi`, so the wrong rule is
  not emitted today; its Python stager writes the right one. Any caller that uses
  `--native-abi --native-install soong` with a privileged launcher gets an `Android.bp` AOSP rejects.
- Fix: apply 85f016d5f to the copy, or delete it and have Alpha call `stageLauncher` from `@elizaos/os/image`.

### eliza-os-image-build-05 (medium, UNMODELED): legacy helpers the phone builds with have no rule binding and lost their tests
- Develop tests: `packages/os/scripts/__tests__/stage-launcher-overlay.node.test.ts`,
  `launcher-provisioning.node.test.ts`, `packages/app/scripts/mobile/android/build-consumer.test.mjs`,
  `packages/app/scripts/mobile/artifact-inspection/apk-distribution.test.mjs`.
- Vibestack: `android/build-consumer.mjs`, `android/apk-distribution.mjs`,
  `android/android-manifest-facts.mjs`, `aosp/launcher-provisioning.mjs` and
  `aosp/stage-launcher-overlay.ts` are kept (the first four identical to develop). No file under
  `packages/os/test` references `buildAndroidConsumer`, `apkDistributionProblems`, `renderNativeOverlay`
  or `renderProvisioningOverlay`. The spec rules bind to the `.vibe` modules only.
- Phone: its APK build, APK facts and launcher staging run through these files. Gap 04 is what drift
  here looks like. `alpha-vs/.github/workflows/android.yml:71` still runs the removed upstream test.
- Fix: bring the four develop tests along, or retire the files and route Alpha through
  `buildAndroid`, `stageLauncher` and the `apk.vibe` readers.

### eliza-os-image-build-06 (medium, UNIMPLEMENTED): secure camera and clock staging cannot be called
- Develop: `packages/os/scripts/android/secure-camera.mjs:76,164` (`verifySecureCameraSource`,
  `writeSecureCameraOverlay`), `aosp-clock-handlers.mjs:14,25` (`clockProductRequirement`,
  `verifyAospClockHandlers`).
- Vibestack: rules exist (`spec/os/image/provisioning.md:294,311`). The code is in
  `src/image/provisioning.vibe:434,449,554` but `src/image/index.vibe:42-51` does not export it, the CLI
  has no command for it, and only `test/image-provisioning.test.vibe` calls it. `composeProduct` handles
  DeskClock itself (`compose-product.vibe:291,474`); nothing stages the camera overlay.
- Phone: unaffected today (`alpha-vs/scripts/stage-aosp.ts:12-13` uses the carried copies). The copies
  cannot be retired until this is reachable.
- Fix: export the three functions from `src/image/index.vibe`.

### eliza-os-image-build-07 (medium, MISSING): nothing upstream guards the files and exports Alpha imports
- Develop: `packages/os/scripts/downstream-consumers.json` with
  `scripts/__tests__/downstream-consumers.node.test.ts` (34 paths must keep existing);
  `packages/scripts/alphaphone-imports.manifest.json` with
  `packages/scripts/__tests__/alphaphone-imports-manifest.test.ts` (845 modules and export names; #39796
  added entries).
- Vibestack: neither file nor a counterpart. Recent commits removed exports nothing in-tree imports
  ("Export only what other modules import", "Keep launcher staging helpers private").
- Phone: an upstream change can remove a path or export Alpha uses and upstream CI stays green. Gap 06
  is one case.
- Fix: one test in `packages/os/test` that asserts the path-imported files and the `@elizaos/os/{build,image}`
  names Alpha's `scripts/upstream-os.ts` reads.

### eliza-os-image-build-08 (medium, UNVERIFIED): vibestack's own image tools are not shown equal to the develop scripts Alpha still runs
- Develop: the 26 scripts under `packages/os/scripts/android/` that Alpha copied
  (`aosp-release-signing.mjs`, `aosp-release-record.mjs`, `pixel10a-product.ts`, `pixel10a-release.mjs`,
  `sense-listener.mjs`, `verify-launcher-image.mjs`, `image-apk-admission.mjs`, `cuttlefish-product.mjs`,
  `verify-source-lock.ts`, `verify-device-source.mjs`, `vendor-api.mjs`, `generate-release-keys.ts`, ...).
- Vibestack: `src/image/{signing,signing-record,key-ceremony,compose-product,listener,verify-device,apk,source-lock}.vibe`
  with rules in `spec/os/image/*.md`. I compared rule lists, tool arguments
  (`signing.vibe:426-440` against develop `aosp-release-signing.mjs:588-700`), record kinds and command
  sets. I did not compare every refusal, and nothing was run.
- Phone: no loss while Alpha runs the copies. The risk arrives when a copy is retired.
- Fix: before retiring each copy, replay its develop test file against the `.vibe` function.

### eliza-os-image-build-09 (medium, UNVERIFIED): no os spec is accepted in the lock and most have no conformance driver
- `spec/lock.json` has no `spec/os/**` key. Drivers exist for `os__build__androidBuild` and
  `os__image__firstRun` only; `test/drivers/java/system-updater/*Replay.java` is referenced by no driver
  script. Image, signing, staging, product, listener, source-lock, operator and updater specs are covered
  by hand-written tests.
- Phone: the rules that describe its image and update path are unproved and unlocked upstream.
- Fix: accept the os specs and add drivers, starting with `image/staging`, `image/signing`, `update/operator`.

### eliza-os-image-build-10 (low, CHANGED): a stale generated host is no longer refused by Gradle
- Develop: `consumer-host.mjs:763-770` records `generationInputs` digests;
  `consumer-host/settings.gradle:4-8` fails with "Generated Android host is stale". `settingsAdmission`
  runs before any module is configured.
- Vibestack: `generationInputs` is dropped (`androidHost.md:295`, `android-host-profile.vibe:424`);
  `host-templates/settings.gradle:4` skips the check when absent. Settings admission becomes ordinary
  admission before `preBuild` (`android-host-profile.vibe:485`).
- Phone: `build-android.ts` regenerates the host first, so the normal build is safe. A direct `./gradlew`
  run on an old `android/` after `consumer-host.json` or `app.config.json` changed is no longer caught.
- Fix: write the profile and identity digests into the generated project and check them in `settings.gradle`.

### eliza-os-image-build-11 (low, CHANGED): the shared AOSP lock moved and changed shape
- Develop: `packages/os/android/aosp.lock.json` with `supportedProducts` and a `gsi-android17` profile.
- Vibestack: `packages/os/aosp/aosp.lock.json`; `targets` replaces `supportedProducts`; the GSI profile
  is removed.
- Phone: Alpha's product is admitted through `requiredSourceFiles`, which is unchanged, so staging logic
  holds. Its descriptors still name the old path (see contract mismatches).
- Fix: update Alpha's descriptors.

### eliza-os-image-build-12 (low, CHANGED): the Soong native patch has new bytes
- Develop: `packages/os/android/patches/soong-app-native/manifest.json:7,18` (patch fe0e8ed1,
  `prebuilt_etc_test.go` after 7ed2e713).
- Vibestack: `packages/os/aosp/patches/soong-app-native/manifest.json:7,18` (12762ad6, cb22d282). Only a
  test fixture name changed (`AlphaPhone` to `ElizaHost`).
- Phone: an AOSP tree already patched from develop fails the patch check until `build/soong` is reset
  and re-patched.
- Fix: note it in the image runbook.

### eliza-os-image-build-13 (low, CHANGED): tool interfaces differ from the scripts they replace
- Develop: flag-driven CLIs (`aosp-release-signing.mjs` `parseSigningArgs`, `aosp-release-record.mjs`
  `main`), synchronous functions, `apk-release-record.mjs:242,246,315,365` exports `DOMAIN_SCRIPT`,
  `parseDomainInventory`, `parseIntegrityExport`, `inPlaceUpdateFailures`; OTA `check` returns
  `{problems}`.
- Vibestack: `eliza-os sign-release --request FILE`, `release-record --request FILE` (`src/cli.vibe`
  usage); effect functions; the four update-readback names are not exported
  (`src/image/apk.vibe:828-884`); OTA `check` returns `{admitted:true}` or fails
  (`ota-operator.vibe:245-248`); `loadProfile`, `provisioningComponents` and `admitImageApk` take one
  options object.
- Phone: none today. Each retirement of a carried copy needs a wrapper change.
- Fix: none required; record it in the retirement plan.

### eliza-os-image-build-14 (low, MISSING): the Python native stager, the listener APK checker and the SystemUI test have no upstream file
- Develop: `packages/os/scripts/android/stage-android-native.py`, `verify-sense-apk.py`, `sense.test.mjs`.
- Vibestack: absent. Native admission is in `stage-launcher.vibe` (`spec/os/image/staging.md:82`),
  listener archive checks in `listener-admission.vibe:111` and `apk.vibe:231`.
- Phone: Alpha carries a modified `stage-android-native.py` (190 changed lines, Node runtime). It did not
  carry `verify-sense-apk.py`, which its copied `sense-listener.mjs:381` runs.
- Fix: Alpha side; or move Alpha to `stageLauncher` and `stageListener`.

### eliza-os-image-build-15 (low, MISSING): hosted CI emulator and WebView fixtures are deliberately absent
- Develop: `packages/app/scripts/mobile/android/hosted-fixture/{ci-emulator-display,ci-emulator-diagnostics,webview-provider}.mjs`.
- Vibestack: `spec/os/index.md:16-21` assigns them to the consumer. No file.
- Phone: Alpha carries them (`alpha-vs/scripts/os-ported/app/android/hosted-fixture/`). They are Alpha's
  to maintain from now on.
- Fix: none; owner should know the ownership moved.

### eliza-os-image-build-16 (low, UNVERIFIED): the pinned Node runtime archives were not fetched
- `packages/os/aosp/runtime/node.lock.json` names two release archives on the eliza repository
  (`android-node-v26.13.1-ndk-29.0.14206865`). `stageRuntimePayload`
  (`src/build/runtime-payload.vibe:426`) needs them. Develop used Bun
  (`packages/app/scripts/lib/android-bun-artifacts.lock.json`). No network here, so their existence and
  digests are unchecked.
- Fix: one fetch-and-hash on a networked host.

### eliza-os-image-build-17 (low, UNVERIFIED): release records written by the carried develop signer are read by a strict vibestack decoder
- Alpha signs with the develop copy (`alpha-vs/scripts/sign-aosp-release.ts:26`) and applies updates
  with vibestack `otaMain`. The decoder refuses unknown fields
  (`src/image/signing-record.vibe:97`). Field by field the develop record
  (`aosp-release-record.mjs:403-468`) fits the schema (`signing-record.vibe:55-95`), and the journal and
  known-good kinds match. No record was decoded.
- Fix: decode one real `release-record.json` with `eliza-os ota check`.

## Contract mismatches with Alpha's port

1. `alpha-vs/android/consumer-host.json`: 15 dependencies use `coordinate`; `eliza-vs`
   `android-host-profile.vibe:361` refuses them (gap 01).
2. `alpha-vs/scripts/build-embedding-host.ts:68,92,122`: `packages/os/android/local-inference/llama.cpp`
   (no submodule) and `scripts/paradee-voice/build-native.ts` (actual: `scripts/build-native.ts`).
3. `alpha-vs/scripts/embedding-native-contract.ts:9-19,27-28`: `local-inference/package.json`,
   `scripts/aosp/*.ts` (5 files), `build-helpers/omnivoice-merged.ts`, `scripts/lib/repo-root.ts`,
   `elizavoice-jni/*` (actual: `src/main/elizavoice-jni/*`) do not exist.
4. `alpha-vs/scripts/{prepare-embedding-host.ts:27,63,82, stage-embedding-host.ts:41, native-build-inputs.ts:38-42, voice-host.ts:202-203, build-pinned-voice.ts:14,36, ci/admit-cloud-signing-input.py}`:
   `llama.cpp`, `jniLibs`, `native`, `paradee-voice/native`, `model-catalog/voice-model-versions.json`
   (actual: `voice-model-versions.json`), `scripts/voice/build-phonon2-gguf.ts` (actual:
   `scripts/build-phonon2-gguf.ts`), `src/main/java/ai/elizaos/app/ElizaVoiceNative.java` do not exist.
5. `alpha-vs/android/aosp/product.json:8,21` and `pixel10a-product.json:15` name
   `vendor/eliza/packages/os/android/{aosp.lock.json,sources/pixel10a-stallion.json}`. The files are under
   `packages/os/aosp/`, and Alpha's own scripts expect that (`stage-aosp.ts:60`, `aosp-pixel10a.ts:30`), so
   descriptor and script disagree.
6. `alpha-vs/.github/workflows/android.yml:71` runs
   `vendor/eliza/packages/os/scripts/__tests__/stage-launcher-overlay.node.test.ts`, which does not exist.
7. `alpha-vs/scripts/os-ported/os/*` resolve upstream data relative to themselves, which lands in a
   nonexistent `alpha-vs/scripts/android/`: `pixel10a-product.ts:30` (device templates),
   `system-updater-staging.mjs:8`, `sense-listener.mjs:12,386` (SystemUI chip, `config.xml`),
   `sense-listener.mjs:318-320` (`plugins/plugin-local-inference/native/android/inputs.json`),
   `secure-camera.mjs:19-21`, `verify-source-lock.ts:10-11`, `pixel10a-release.mjs:24,27`,
   `generate-release-keys.ts:32`, `cuttlefish-product.mjs:33`. The data is in `eliza-vs/packages/os/aosp/`.
   `sense-listener.mjs:381` runs `verify-sense-apk.py`, which was not copied.
8. `alpha-vs/scripts/upstream-os.ts:55-57` re-exports nine effect functions without `run`
   (`aaptManifestTree`, `readApkBuildFlags`, `provisioningComponents`, `releaseRecordProblems`,
   `loadProfile`, `verifyDeviceSource`, `verifySource`, `assertStockVendorApi`, `readNativeLibraries`); a
   caller gets an Effect, and their parameters differ from develop's. No Alpha script uses them yet.
9. `alpha-vs/android/embedding-host/qualified-host.json` and `voice-host/qualified-voice-host.json`
   record 18 `inputs[].path` values under `packages/app/...` with develop digests; none exists upstream.
10. `alpha-vs/test/*` still reads 40-odd develop paths under `packages/os/scripts/android/`,
    `packages/os/android/signing/key-manifest.json` and
    `packages/os/android/sense/systemui/chip/source` (listed as "mapped" in
    `scripts/legacy-retirement.json`); those tests cannot pass against the vibestack pin.

Every name `upstream-os.ts` reads from `@elizaos/os/build` (5) and `@elizaos/os/image` (33) exists.
The option shapes of the six calls Alpha actually makes match.

## Confirmed OK

| Behaviour | Develop | Vibestack rule | Vibestack code |
|---|---|---|---|
| Pixel 10a source inventory, project-list and reconstructed-input locks (#39810, #39813) | `os/android/sources/pixel10a-stallion.json` | `image/sourceLock.md:118` | `os/aosp/sources/pixel10a-stallion.json` (identical) |
| Device templates, device requirements, secure-camera contract, system-updater sources, SystemUI ops/chip/assist patches | `os/android/{devices,device-requirements,sources,system-updater,sense}` | `image/product.md:91`, `image/listener.md:110` | `os/aosp/...` (identical) |
| Provisioning XML carries no comment AAPT2 rejects (#39835) | `launcher-provisioning.mjs` | `image/provisioning.md:28` | `aosp/launcher-provisioning.mjs` (identical), `provisioning.vibe:337` |
| pnpm-linked dependencies stay inside package roots (#39775) | `consumer-host.mjs:224` | `build/androidHost.md:85` | `android-host.vibe:352-353` |
| Provisioning staged inside the atomic launcher stage (#39775) | `stage-launcher-overlay.ts` | `image/staging.md:200` | `stage-launcher.vibe:30` |
| Descriptor limits, reviewed privileged permission set | `stage-launcher-overlay.ts:38` | `image/staging.md:30,43` | `stage-launcher.vibe` |
| Privileged launcher JNI rule (85f016d5f) | `stage-launcher-overlay.ts:522` | `image/staging.md:82` | `stage-launcher.vibe:502` |
| Default Home, assistant and autofill | `launcher-provisioning.mjs:89,156` | `image/provisioning.md:28` | `provisioning.vibe:279,337` |
| Dialer and SMS handlers enabled without assigning a role | Alpha-owned on develop (`alpha-develop/scripts/aosp-telephony-roles.ts`) | `image/provisioning.md:108`, `image/firstRun.md:30` | `provisioning.vibe:330` |
| Image feature and capability overlay | `image-capability.mjs` | `image/provisioning.md:184,200` | `provisioning.vibe:352,377` |
| Image APK admission (mocks, release row, debug-only development) | `image-apk-admission.mjs:76` | `image/apk.md:180` | `apk.vibe:798` |
| Release blockers and cloud-speech QA receipt | `apk-release-record.mjs` | `image/apk.md:96,161` | `apk.vibe:762,766` |
| In-place update admission and data comparison | `apk-release-record.mjs:260` | `image/apk.md:223-274` | `apk.vibe:821,868,872,884` |
| Reviewed patch admission (preimage, postimage, revision) | `image-apk-admission.mjs:180` | `image/sourceLock.md:191` | `source-lock.vibe:387` |
| Source lock, device source, stock vendor API | `verify-source-lock.ts`, `verify-device-source.mjs`, `vendor-api.mjs` | `image/sourceLock.md:23,166` | `source-lock.vibe:355-382` |
| Listener staging and qualification | `sense-listener.mjs` | `image/listener.md:34-286` | `listener.vibe:177`, `listener-admission.vibe:152` |
| SystemUI bundle verify and prepare | `sense-systemui.mjs:35,92` | `image/listener.md:110` | `listener-systemui.vibe:127,131` |
| Product composition for Pixel 10a and Cuttlefish, DeskClock once | `pixel10a-product.ts`, `cuttlefish-product.mjs`, `aosp-clock-handlers.mjs:14` | `image/product.md:31-202` | `compose-product.vibe:656` |
| Update-channel enrollment over reviewed updater sources | `system-updater-staging.mjs` | `image/product.md:231-270` | `compose-product.vibe:750` |
| Signing tool arguments, token signing, AVB chain | `aosp-release-signing.mjs:588-700` | `image/signing.md:91-183` | `signing.vibe:426-440` |
| Key generation and decryption | `generate-release-keys.ts`, `decrypt-release-keys.ts` | `image/signing.md:29-77` | `key-ceremony.vibe:195,251` |
| Descriptor, channel and gate problems | `pixel10a-release.mjs` | `image/signing.md:207-326` | `signing-record.vibe:133,164,204` |
| Release compatibility record | `aosp-release-record.mjs:267` | `image/signing.md:264` | `signing-record.vibe:300` |
| Cable update: seven commands, journal, fallback, known-good, stock recovery | `aosp-ota-update.mjs:1397-1550` | `update/operator.md:25-333` | `ota-operator.vibe:237`, `ota-journal.vibe:31`, `ota-retention.vibe:25` |
| Booted-image verification | `verify-launcher-image.mjs` | `image/verification.md:35-248` | `verify-device.vibe:346` |
| Device lease, instrumentation result, isolated test user | `app/scripts/lib/{device-lease.ts,instrumentation-result.mjs,isolated-android-user.mjs}` | `image/harness.md:28,100,151` | `device.vibe:564,597,834,1101` |
| Committed workspace verification and export | `app/scripts/lib/{immutable-workspace-source.mjs:19,committed-source.mjs:12}` | `build/sourceIntegrity.md:20,44,122` | `source-integrity.vibe:258,337` |
| Payload inventory, addon and model rules, workflow worker pin | `app/scripts/lib/stage-android-agent.ts` | `build/runtimePayload.md:74,91,105` | `runtime-payload.vibe:426` |
| APK build, verification and publication | `app/scripts/mobile/android/build-consumer.mjs` | `build/androidBuild.md:28-176` | `android/build-consumer.mjs` (identical), `android-build.vibe:655` |
| Toolchain pin, all-or-none signing, version override, 16 KiB extraction, byte preservation | `consumer-host.mjs`, `consumer-host/app.gradle` | `build/androidHost.md:67,214,333,354` | `android-host.vibe:482-488`, `android/host-templates/app.gradle` |

## Not applicable (22)

- #39795: Alpha used the resident host, not the embedded cloud-only agent.
- #39815: vibestack has no Python native stager and no dual-ABI walk to fix.
- #39734, #39736, #39738, #39743, #39838, #39845, #39846, #39622, #39630: `packages/scripts` repository
  tooling the phone build never called (9).
- #39868, #39877, #39880, #40007: agent container image (4).
- `packages/os/trust` and `contracts` (Ed25519 manifest trust, release sequence store): Alpha's key
  manifest leaves those keys out (`alpha-vs/android/signing/alpha-key-manifest.json:4`).
- `packages/os/release/schema` with `sign-image-release.ts` and `verify-image-release.ts`: Eliza's own
  image releases.
- `packages/os/android/{vendor/eliza,products,releases,builder}`, `release-trust.json`,
  `hardware-targets.json`, `Makefile`: Eliza's own distribution; Alpha composes its own product.
- The `gsi-android17` lock profile: Alpha builds Pixel 10a and Cuttlefish only.
- `packages/os/android/signing/key-manifest.json`: the key list now comes only from the consumer
  (`spec/os/image/signing.md:29`); Alpha already passes its own.
- `packages/app/scripts/aosp/compile-libllama*.ts`, `compile-shim.ts`, `zig-toolchain.ts`,
  `vulkan-source-contract.ts`: the voice library stager no longer imports them.
- `packages/app/scripts/lib/android-bun-artifacts.lock.json`: Node replaces Bun by design
  (`packages/os/aosp/runtime/node.lock.json`).

## Not covered

- `packages/os/quint` models for the on-device system updater and app updater
  (`SystemUpdate*.qnt`, `OtaFreshAdmission.qnt`) against `spec/os/update/updater.md` and
  `spec/os/appUpdate/*.md`, and the Java under `aosp/system-updater`. Only the staging model
  (`LauncherNativeInstall.qnt`) was mapped.
- `packages/os/native/ota-trust` and `ota-publisher` against `src/app-update/*.vibe`.
- #39661 and the agent service lifecycle that replaced `resident-host-sources.mjs`.
- The Node runtime and agent bundle contents (`@elizaos/agent/bundle`), and on-device inventory checks.
- Workflow worker production (`packages/scripts/plugins/plugin-workflow/build-workflow-artifact.ts`)
  and the cloud helpers in `packages/scripts` that `alpha-develop/scripts/local-cloud.ts` ran.
- The native voice library sources themselves (`stage-elizavoice-lib.ts`, `verify-fused-symbols.ts`);
  only their paths were checked.
- Chromium build and browser staging (`aosp` browser scripts, `src/browser/chromium-build.vibe`).
- Per-refusal equivalence of the vibestack image tools with the develop scripts (gap 08).
- Anything that needs a build, a device or the network.
