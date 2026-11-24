# Device lane runbook: Vibestack Alpha on the Pixel

Written 2026-11-23 by reading only. Nothing in this runbook or in `steps/` has been run: no install, build,
Gradle, gen, fastboot or phone-changing adb command. Every "expected" below is from the notes, the logs of
earlier legacy deploys, or the source at alpha `vibestack` 7c2338706 (pin: elizaOS/eliza `vibestack-dp`
6451775c35a). Re-check the marked points against the commit that is actually handed over.

Five results stay separate and none proves another: an APK build, an image build, a flash and boot, the adb
post-flash checks, and the on-device checklist (`DEVICE-CHECKS.md`). Owner acceptance is a sixth.

## 0. Where things stand (2026-11-23, after the 12:30 crash and reboot)

| Fact | Value | Source |
|---|---|---|
| Phone | Pixel 10a `stallion`, serial `67091JEA313850`, model "Alpha Phone Pixel 10a", bootloader unlocked, slot `_b` | `baseline/getprop.txt`, live `getprop` 12:50 |
| Image on the phone | `Alpha/alpha_stallion_phone/stallion:17/CP2A.260605.016/alpha.v630:userdebug/test-keys`, built 08:54 PST | same |
| Launcher on the phone | `ai.alphacompute.alphaphone` versionCode 630, versionName 0.1.0, `/product/priv-app/AlphaPhone`, flags SYSTEM + PRIVILEGED + PRODUCT, v3 signature, `signatures:[289df855]` | `baseline/package.txt`, live `dumpsys package` |
| Signing certificate | repository debug key, SHA-256 `2242994d2d237f98d01927999157067df4e2495a8f980451ac3de5d40642584a` | `~/.cache/alpha-v612/image/apk630.sum` (apksigner output for Launcher630.apk). Not read from the phone: the allowed adb commands print only the short `289df855` value |
| /data update over the system app | none: one installed path, codePath under `/product`, no `UPDATED_SYSTEM_APP` | `baseline/packages.txt`, live `pm list packages -f` |
| Roles | HOME, DIALER, SMS = `ai.alphacompute.alphaphone`; ASSISTANT empty; BROWSER `org.chromium.webview_shell` | `baseline/roles.txt`, live |
| Granted permissions | 41 `granted=true` lines (SMS, call log, CALL_PHONE and MMS by role; the 14 default grants; READ_PRIVILEGED_PHONE_STATE) | `baseline/package.txt` |
| Other Alpha-related packages | overlays `AlphaImageCapabilityOverlay`, Settings/SystemUI/framework/navigation overlays, `AlphaPixelConfig`, `ElizaSystemUpdater`; user apps `ai.alphacompute.alphaphone.test`, `ai.elizaresearch.alphaphone` (+`.test`), `ai.eliza.voicequalify` (+`.test`) | `baseline/packages.txt` |
| AOSP tree | `/home/shaw/Android/pixel10a-preparation/eliza-source`, lunch `alpha_stallion_phone-cp2a-userdebug` | notes, `build-v631/build-image.sh` |
| `vendor/alphaphone` in the tree now | holds the legacy **v631** launcher (`apkSha256 c5fc8045…`, staged 10:03), 12 native libraries of the Bun runtime | `launcher.json`, `native-libraries.json` |
| `out/` image zip in the tree now | v630's (2,091,502,335 bytes, 09:01); a copy is `~/.cache/alpha-v612/image/img630.zip` | `ls` |
| Legacy v631 image | never built: 12:03 try ended `ninja failed with: exit status 137` after 181 s; the retry loop died with the reboot | `build-v631/image-build.log`, `apk631.sum` |

So the build being replaced is **legacy v630** (what the phone runs). 631 is used up by a legacy APK that was
never flashed. **Use `VERSION_CODE=632` or higher**; a clearly separate number such as 700 makes Vibestack
images easy to tell from legacy ones. It must exceed the installed 630 (the owner's rule for this lane); the scripts
refuse a value that does not.

## 1. Prerequisites

| Need | Where | State |
|---|---|---|
| Node 26 | `~/.local/share/mise/installs/node/26.13.1/bin` | present (heavy.sh puts it on PATH) |
| pnpm 10.24.0 | `~/.cache/vibecut/tools/node_modules/.bin` | present |
| JDK 21 | `/usr/lib/jvm/java-21-openjdk` (21.0.13) | present |
| Android SDK | `/home/shaw/Android/Sdk`: build-tools 36.0.0 (`aapt aapt2 apksigner zipalign`), platform-tools (`adb fastboot`) | present |
| NDK | `ndk/28.2.13676358` (`android/embedding-host/build-toolchain.json`; CI installs the same) | present |
| CMake 4.0.3 | pinned by `build-toolchain.json`; system `cmake` is 4.4.4 | CI pip-installs 4.0.3. Legacy builds passed on this machine, so the native build uses its own isolated tools or cached outputs; not confirmed for a cold Vibestack build (Q6) |
| python3, sqlite3, unzip, git | `/usr/bin` | present |
| Debug keystore | `~/.config/.android/debug.keystore`, alias `AndroidDebugKey`, passwords `android` | present |
| AOSP tree | above; git alternates at `/home/shaw/Android/pixel11-aosp` | present; not re-verified after the crash |
| Factory zip (for `aosp:stage --factory-image`, and last-resort recovery) | `/home/shaw/Android/pixel10a-preparation/recovery/stallion-cp3a.261005.005-factory-d1d25502.zip` | present |
| On-device voice and embedding outputs | built by the chain into `~/.cache/alpha/native-inputs/<recipe hash>` and staged under `.eliza/` and `android/app/src/main/jniLibs` | 7 legacy recipe directories are cached; a Vibestack recipe has a different hash, so expect a cold native build (network, long) |
| Resource wrapper | `/home/shaw/.cache/vibecut/heavy.sh <workdir> <memGB> <cmd...>` | present. Pins CPUs 8-15,18-23; **clamps memGB to 10**; takes one of 3 machine-wide slots; starts only when MemAvailable ≥ cap + 3 GB; passes **no environment** except HOME, CI=1, PATH (so the steps start commands through `env VAR=...`) |
| The alpha checkout (`ALPHA_DIR`) | handed over by the build session | must have `vendor/eliza` at the pin and `node_modules` installed (`pnpm install --frozen-lockfile`, heavy, network) |

Rules that come from the notes:

- One session builds at a time. The AOSP `out/` directory and `vendor/alphaphone` are shared.
- Heavy work only on the E-cores (P-cores segfaulted under load on 2026-11-18). heavy.sh does this.
- systemd-oomd kills Claude's whole app scope under memory pressure; heavy.sh runs jobs in their own units and
  waits for free memory. Never start node, Gradle or `m` straight from an agent shell.
- `/tmp` is wiped on reboot (it was, at 12:30 today). Everything lives under `/home/shaw/.cache/vibeaudit/device/`.
- Agree with the owner, and with any session driving the phone, before flashing. On 2026-11-16 one session
  flashed over another's test.

All steps take `ALPHA_DIR` and `VERSION_CODE`:

```sh
export ALPHA_DIR=/abs/path/to/alpha-vibestack-checkout VERSION_CODE=632
cd /home/shaw/.cache/vibeaudit/device/steps
```

Work files go to `device/work/v$VERSION_CODE/`, rollback artifacts to `device/rollback/`.

## 2. The sequence

### Step 1: preflight — `./01-preflight.sh`

- Runs: directly (light, read-only). About a minute.
- Does: toolchain presence and versions; checkout identity (`appId`, pnpm line, `vendor/eliza` at the pin,
  `node_modules`); the upstream-pin ancestry guard, evaluated with git before the build trips over it; that no
  `ELIZAOS_KEYSTORE_*` variable is set; `node scripts/android-build-preflight.ts --report` (reads files only);
  AOSP tree and staged launcher; no image build or fastboot running; load, memory, disk; phone state
  (fingerprint, versionCode < `VERSION_CODE`, no /data update, roles, VPN), and that a rollback image exists for
  the image the phone runs.
- Artifact: `work/v$N/preflight.txt`. Pass: last line `PREFLIGHT OK`.
- Failed before / expected now:
  - **Pin guard.** `scripts/android-build-preflight.ts` exits 2 when the pin is not `origin/main`'s pin or a
    descendant. `origin/main:upstream.lock.json` pins legacy eliza `2cd448186c`; the Vibestack pin `6451775c35a`
    does not descend from it (`git merge-base --is-ancestor` fails in `vibeaudit/eliza.git`). Vibestack has no
    `--allow-older-upstream-pin` (legacy needed that flag on 2026-11-10 for a milder case). The guard passes only
    when the build clone has no `origin/main` ref, or `main` has itself been cut over. See Q2.
  - **VPN.** A dead gnirehtet reverse tether black-holed all phone traffic on 2026-11-11; fix was
    `am start -a com.genymobile.gnirehtet.STOP -n com.genymobile.gnirehtet/.GnirehtetActivity`, then
    `pm verify-app-links --re-verify ai.alphacompute.alphaphone` (both change the phone: do them deliberately).

### Step 2: APKs — `./02-apk.sh`

- Runs: each stage through heavy.sh in `$ALPHA_DIR` (6-10 GB caps), up to `TRIES=3` per stage, log
  `work/v$N/apk.log`, one line per stage in `work/v$N/apk.sum`.
- Stages (the chain of `pnpm android:build:local -- --release`, split so a failure names its stage):

  | # | Command | Produces |
  |---|---|---|
  | 1 | `node scripts/android-build-preflight.ts` | checks the pin and voice outputs; on this line it also prepares the native inputs (`preparePortableNativeInputs`) |
  | 2 | `pnpm -s agent:build-embedding-host` | voice + embedding libraries, `.eliza/native-inputs/receipt.json`, `jniLibs/` |
  | 3 | `pnpm -s agent:build-workflow-worker` | `.eliza/workflow-worker` |
  | 4 | `pnpm -s agent:bundle` | `.eliza/agent-bundle` |
  | 5 | `pnpm -s agent:stage-android` | `android/app/src/main/assets/agent` (Node runtime `libeliza_node.so` per ABI, `agent.mjs`, `manifest.json`, `inventory.json`, worker, `alpha-source.json`). **Downloads** the pinned Android Node 26.13.1 archives from an elizaOS/eliza GitHub release every run (no cache seen in `runtime-payload.vibe`) |
  | 6 | `pnpm -s licenses:packaged-runtime` | notices with the packaged runtime |
  | 7 | `node --conditions=eliza-source --import vibelang/register scripts/build-android.ts --release` | upstream verify, Gradle host, web build + `cap sync`, Gradle debug + instrumentation + release (R8), `verify-apks`, SBOM |
  | 8 | `pnpm -s android:verify` | `artifacts/apk-manifest.json` again, now with `ELIZAOS_VERSION_CODE` in force |

  Environment for every stage: `ELIZAOS_VERSION_CODE=$VERSION_CODE`, `JAVA_HOME`, `ANDROID_HOME`,
  `ANDROID_NDK_HOME`, `GRADLE_OPTS=-Dorg.gradle.jvmargs=-Xmx4096m` (CI: R8 exhausted 2 GiB),
  `ELIZA_DEV_ALLOW_TEST_MOCKS=` and no `ELIZAOS_KEYSTORE_*`. Stage 7 calls node directly because `pnpm … -- --release`
  argument passing was not tested here (README writes `-- --release`, `android.yml` writes `--release`; a stray
  `--` would make `parseBuildArgs` throw).
- Duration: legacy took about 7 min warm on idle E-cores (2026-11-18) and 34-39 min under today's load
  (`apk630`, `apk631`). A first Vibestack build is cold everywhere (upstream turbo build, native engine build,
  model downloads, Gradle host): expect well over an hour, plus heavy.sh queueing.
- Artifacts in `$ALPHA_DIR/artifacts/`: `launcher-debug.apk`, `launcher-release-unsigned.apk`,
  `instrumentation/launcher-androidTest.apk`, `mapping/launcher-release-mapping.txt`, `build-config.json`,
  `apk-manifest.json`, `sbom/`. Copied to `work/v$N/`: `v$N-unsigned.apk`, `v$N-debug.apk`, both JSON files, `source.txt`.
- Verify: the script asserts `apk-manifest.json` has exactly a `debug` and a `release` row for variant
  `launcher`, each `testMocks:false`, `bundleAudit:"passed"`, `runtime:"PACKAGED"`, version code = `VERSION_CODE`,
  release unsigned. `distributable:false` is expected (unsigned, and not the release signer).
- Failed before / expected now:
  - Legacy: random SIGSEGV/SIGBUS on P-cores (fixed by E-core pinning); "Gradle needed three tries" on
    2026-11-18; two JVM crash logs (`hs_err_pid*.log`) are still in the legacy image directory. Hence the retries.
  - Legacy 2026-11-10: stale `jniLibs/*/libelizainference.so` from another profile blocked the build. There is one
    profile now, but stale `jniLibs` from a different recipe will still fail `:app:verifyVoiceHost` /
    `:app:verifyEmbeddingHost`.
  - **Vibestack has never completed this chain** as far as the repository says: `docs/vibestack-open-items.md`
    (7c2338706) records that `pnpm android:build:local` "has not been run", that `agent:stage-android` and
    `agent:build-workflow-worker` have not been run, that `agent:build-embedding-host` "cannot run until the
    producer is re-homed" (the register says the paths were fixed in ae4755d50), and that the qualified voice and
    embedding records carry hashes of another engine pin (Gradle compares staged bytes with those records).
    Register rows still open at that commit: A-003 (`AlphaLocalAgentPlugin.java:1052,1066` use a package-private
    upstream class, `:app` does not compile), A-023 (`scripts/generate-sbom.ts` imports the removed `BUN_ENTRY`;
    the SBOM is the **last** step of `build-android.ts`, so the build can exit non-zero after the APKs were built
    and verified: `ALLOW_POST_APK_FAILURE=yes` accepts exactly that case).
  - `verify-apks.ts` imports `vendor/eliza/packages/os/android/apk-distribution.mjs`, which upstream deleted
    after the pin (83acbce7b, register E-045). A repin past it without the fix breaks stages 7 and 8 at import.

### Step 3: sign — `./03-sign.sh`

- Runs: directly (light: aapt2, zipalign, apksigner on one 0.5 GB file).
- Does: checks package id, not debuggable, versionCode = `VERSION_CODE`; `zipalign -f -P 16 4`; `apksigner sign`
  with the debug keystore, v2 + v3, no v1, `--alignment-preserved true`; verifies the certificate digest is
  `2242994d…584a` and the alignment; then compares requested permissions and arm64 libraries with the legacy
  `Launcher630.apk` and stops on any **new** permission until acknowledged.
- Artifact: `work/v$N/Launcher$N.apk`, `sign.sum`, `perms.*.txt`, `libs.*.txt`.
- Why not sign in Gradle: with `ELIZAOS_KEYSTORE_*` set to the debug key, `verify-apks` fails
  ("release signer … does not match android/release-signer.json", which names `edbfcacb…`). The image only
  needs the key the phone's system app already carries, so the release stays unsigned in Gradle and is signed here,
  as every legacy image since v93 was (`~/.cache/alpha-v612/image/sign.sh`).
- versionCode: legacy `sign.sh` always ran `setvc.py` (binary manifest patch), which was a no-op once
  `ELIZAOS_VERSION_CODE` worked ("old versionCode 630"). Here the patch runs only with `PATCH_VERSION_CODE=yes`.
- Expected differences from legacy: the library set changes (Vibestack: `libeliza_node.so`; legacy:
  `libeliza_bun.so`, `libeliza_ld_musl_aarch64.so`, `…_real.so`, `libeliza_gcc_s.so`, `libeliza_stdcpp.so`,
  `libsigsys-handler.so`), and possibly permissions from the new `wifi` and `agent-service` modules. The image
  allow-lists one privileged permission (`READ_PRIVILEGED_PHONE_STATE`, plus an inert hand-added
  `INSTALL_SELF_UPDATES`); a new signature|privileged permission that is not allow-listed can stop the image booting.

### Step 4: stage into the AOSP tree — `./04-stage-aosp.sh`

- Runs: directly for the default mode (two node stagers and a Python check); `STAGE_MODE=official` goes through heavy.sh.
- Backs up `vendor/alphaphone` to `rollback/vendor-alphaphone-before-v$N` (reflink copy), then replaces only
  `Launcher.apk`, `launcher.json`, `native-arm64/`, `native-libraries.json`, `config.fs`, `Android.bp`.
- **Telephony role override and capability overlay are kept, not regenerated.** They are already in the tree and
  are keyed by package and class names, not by APK hash:
  - `provisioning/alpha-telephony-components.xml` → `system_ext/etc/sysconfig/`: a `<component-override>` that
    enables `AlphaInCallService`, `AlphaCallActivity`, `AlphaDialPadActivity`, `AlphaSmsDeliverReceiver`,
    `AlphaMmsWapPushReceiver`, `AlphaMmsResultReceiver`, `AlphaRespondViaMessageService`, `AlphaSmsComposeActivity`
    and `ai.eliza.plugins.messages.MmsFileProvider` at package scan, so RoleManager still finds Alpha qualified for
    SMS and DIALER after the fingerprint changes (verified over two no-wipe reflashes, v99 and v100).
  - `image-capabilities/` → `AlphaImageCapabilityOverlay` (static RRO setting `alpha_aosp_image_capability` in the
    launcher's `AlphaImageProvisioning` overlayable), plus the image feature
    `ai.alphacompute.alphaphone.aosp_image` from `image-capability/`. The app offers Phone, Contacts and SMS only
    with a release build, a system-partition install, the feature and this overlay.
  - The script checks that every class named in the override exists in the new APK's manifest and stops if one
    does not (the audit found the launcher manifest byte-identical between the trees).
  - The override does not assign roles. A role already lost stays lost until
    `adb shell cmd role add-role-holder android.app.role.SMS ai.alphacompute.alphaphone` (same for DIALER).
- Three modes:
  - `launcher` (default, **untested**): `node vendor/eliza/packages/os/aosp/stage-launcher-overlay.ts --descriptor …
    --apk … --output work/v$N/stage-out --development`, then `steps/lib/stage-natives.mjs`, which calls the
    checkout's own `alphaNativeOptions` / `stageAndroidNative` / `finalizeAndroidNative` (the calls
    `scripts/aosp-pixel10a.ts` makes; the ported stager knows `libeliza_node.so` and verifies the APK's runtime
    payload against the checkout's pin), then the transplant. It skips the AOSP source contract.
  - `official`: `scripts/stage-aosp.ts --target pixel10a --aosp-source … --factory-image … --apk …
    --development --owner-telephony --applied-build-patch soong-memory --output work/v$N/stage-out`, then the same
    transplant (and a diff of the telephony override it wrote against the tree's). **Expected to refuse** on this tree:
    1. `build/soong/etc/prebuilt_etc_test.go` in the tree has the develop patch's bytes (`7ed2e713…`); the Vibestack
       `soong-app-native` manifest expects `cb22d282…` (register E-276; hashes compared today). The functional file
       `prebuilt_etc.go` is identical (`a4c189fa…`) in both.
    2. The tree carries branding edits the stage contract cannot declare (note of 2026-11-15: "run `aosp:stage`
       before applying branding"). Every deploy since v93 has avoided re-staging for this reason.
    It reads the whole tree (1085 projects), so it is slow on a loaded machine. It writes only to its `--output`.
  - `swap`: the legacy `swap.py`. It reads each library listed in the tree's `native-libraries.json` out of the APK
    and would stop on `lib/arm64-v8a/libeliza_bun.so`, which a Vibestack APK does not have. The script refuses it
    unless the sets match.
- Verify: the script re-hashes `Launcher.apk` and every staged library against `launcher.json` /
  `native-libraries.json`, checks each has a module in `Android.bp`, that every `src:` exists, and that `product.mk`
  still carries the capability overlay, the telephony override copy, branding, `config.fs` and the sepolicy directory.
- If the launcher mode fails: read `work/v$N/stage-out` and the error, do not hand-edit `vendor/alphaphone`
  half-way; restore the backup (`rm -rf` the tree copy, `cp -a --reflink=auto` the backup back) and report. See Q3.

### Step 5: image — `./05-image.sh`

- Runs: `heavy.sh <AOSP tree> 10 bash steps/lib/build-image-inner.sh $N <log> 8GiB 4`, up to 3 tries.
- Recipe (unchanged from `build-v99` … `build-v631`): `BUILD_NUMBER=alpha.v$N`, `OUT_DIR=out`,
  `SISO_EXPERIMENTS=ignore-missing-targets`, `GOMAXPROCS=4`, `NINJA_HIGHMEM_NUM_JOBS=1`, `source build/envsetup.sh`,
  `lunch alpha_stallion_phone-cp2a-userdebug`, `m -j4 droid && m -j4 target-files-package updatepackage`.
  One change: `GOMEMLIMIT=8GiB` instead of 11GiB, because heavy.sh caps the unit at 10 GB.
- A new `BUILD_NUMBER` every time: with an unchanged fingerprint PackageManager keeps stale package-cache metadata.
- Before building it removes `out/target/product/stallion/product/priv-app/AlphaPhone` when the installed library
  set differs from the staged one, so the Bun-era libraries cannot linger in the product image (an inference from
  how Soong installs each library as a module; not observed).
- Duration: 320-690 s for the legacy incremental builds of 2026-11-18…23 (same `Android.bp`, only the APK and
  build number changed). `Android.bp` changes this time, so Soong must regenerate its ninja file: the v40 build of
  2026-11-07, the last one with that kind of change, took about 87 min at `-j2`.
- Artifact: `out/target/product/stallion/alpha_stallion_phone-img.zip`, copied to `work/v$N/img$N.zip` (about 2.09 GB).
- Verify: `exit=0` in `work/v$N/image-build.log`; the launcher installed in `out/` is versionCode `$N` and
  byte-identical to the signed APK (the module is `presigned` + `preprocessed`); installed libraries equal
  the staged list; the telephony override, capability overlay, privapp allow-list and image feature files are in the
  staging directories. The zip contains one nonempty entry each for `system.img`, `product.img`, `vbmeta.img`, and
  `android-info.txt`. Step 5 writes the build identifier, image SHA-256 and launcher SHA-256 to `image-evidence.json`.
- Failed before:
  - 2026-11-18 `build-v611` try 1: `signal: segmentation fault` in a notice-generation step after 24 s
    (P-core fault); a retry on E-cores passed.
  - **2026-11-23 12:03 `build-v631`: `ninja failed with: exit status 137`** after 181 s, under a 16 GB scope and
    heavy memory pressure (the machine crashed about half an hour later). 137 is a memory kill. With heavy.sh's
    10 GB clamp and a Soong regeneration, memory is the likeliest failure of this step. If it recurs: wait for a
    quiet machine, lower `IMAGE_JOBS=2`, and ask the coordinator for a one-off larger cap (earlier image builds
    ran under `systemd-run --user --scope -p AllowedCPUs=8-15,18-23 -p MemoryMax=16G`). See Q4.
  - 2026-11-15: missing git objects after a deleted alternate; repaired then. After today's crash, a build error
    naming a missing object or an empty file means the same class of damage (`git status` per project,
    `fetch --refetch`), which is outside this lane's read-only preparation.

### Step 6: flash — `CONFIRM_FLASH=yes ./06-flash.sh`

- Runs: directly (fastboot is light). Refuses without `CONFIRM_FLASH=yes`, with any argument, when another
  fastboot is running, when `VERSION_CODE` does not exceed the installed one, or when a /data update shadows the
  system app.
- Verifies the image and its signed launcher against step 5's receipt. Before entering the bootloader, it saves
  the rollback artifacts and verifies that the rollback image, installed build and installed launcher match the
  same prior build record.
- Then: `adb reboot bootloader`, check `product=stallion` and `unlocked=yes`, run one `fastboot update` without
  `-w`, and wait for adb and `sys.boot_completed=1` (10 min). The update log is `flash.fastboot.log`. If the
  command fails, use the log and the saved rollback instructions to decide how to recover.
- Duration: 137 s for the flash itself (`flash626.log`), about 2.5 min with the reboots.
- What a good flash looks like: `Setting current slot to 'b'`, boot/init_boot/dtbo/vendor_kernel_boot/pvmfw/
  vendor_boot/vbmeta written, 13 sparse `super` chunks, `Rebooting`, `Finished`. `fastboot update` writes the
  **current** slot: the old image is overwritten, there is no A/B copy to fall back to.
- Failed before: 2026-11-20 v617, two flashes stalled before the first partition. A quiet host-side read counter
  can also reflect an in-progress partition write. Observe the fastboot log and device state before intervening.
- No wipe is safe because the image's platform key is the AOSP test key in both the tree and on the phone
  (note of 2026-11-15) and the launcher keeps the debug key.

### Step 7: post-flash checks — `./07-postflash-checks.sh`

- Runs: directly, read-only adb. `PHASE=pre ./07-postflash-checks.sh` takes the same snapshot of the legacy
  build before the flash without asserting anything: run it once before step 6.
- Asserts: fingerprint ends `alpha.v$N:userdebug/test-keys`; versionCode `$N`; codePath
  `/product/priv-app/AlphaPhone`; no `UPDATED_SYSTEM_APP`, one installed path (no /data update shadowing the
  system app); not debuggable; PRIVILEGED; `signatures:[…]` equal to the baseline's `289df855` and the on-device
  APK's sha256 equal to `work/v$N/Launcher$N.apk`; HOME, DIALER, SMS held by Alpha; the image feature and capability
  overlay present; no grant lost against `baseline/package.txt`; `READ_PRIVILEGED_PHONE_STATE` granted.
- Records without asserting: native libraries on the image, enabled components, agent service state, the crash
  buffer, `avc: denied` lines naming Alpha or `priv_app`, VPN state, app-link verification, keyguard, a screenshot.
- It never changes the phone. A lost role is reported with the command to give it back; running that command is a
  deliberate, separate act.
- The owner must unlock the phone after boot before app-data checks mean anything (legacy scripts waited for
  `isKeyguardShowing=false`).
- Then `DEVICE-CHECKS.md`.

## 3. Rollback

Keep these **before** flashing (step 6 does 1-4 and refuses to flash without 1 and 5):

1. The image the phone runs now: `~/.cache/alpha-v612/image/img630.zip`. Step 6 copies it to
   `rollback/<time>-before-v$N/rollback-img.zip`.
2. The verified build record for that image, `img630.evidence.json` by default or the path in `ROLLBACK_RECEIPT`.
   It uses the same fields as step 5's receipt. For an older image, obtain the hashes from its build records or
   verify the build identifier and launcher inside the archived image. Step 6 matches the saved image hash and
   the hash of the launcher installed on the phone to this record.
3. The phone's state: `getprop`, `dumpsys package`, package list, roles, a screenshot (also in `baseline/`).
4. `ROLLBACK.md` with the exact commands, written next to them.
5. The tree's `vendor/alphaphone` as it was: `rollback/vendor-alphaphone-before-v$N` (step 4). Note it holds the
   legacy v631 launcher, not v630; to rebuild a v630 image, run the legacy `swap.py` with `Launcher630.apk` first.
6. Do not delete `~/.cache/alpha-v612/image/` or `rollback/` until the owner has accepted the new build.

To go back: bootloader, `fastboot -s 67091JEA313850 update <rollback-img.zip>` (no `-w`), boot, check versionCode
630 and the three roles. This restores the system partitions only. **App data is not rolled back**: `/data` is kept
in both directions, the Vibestack build adopts some legacy slots lazily and starts its agent on a new state
directory, and a system app going from a higher to a lower versionCode on kept data has not been tried on this
phone (Q5). Last resort, wiping the phone: the stock factory zip in `recovery/`.

## 4. "Both distribution variants": what it means now

The checked-in `AGENTS.md` of the working copy at `/home/shaw/Work/alphaphone` still says "verify both distribution
variants". Both current lines have moved on from that wording: `alpha-develop/AGENTS.md` and
`alpha-vs/AGENTS.md` each say there is **one Android product/flavor, `launcher`**, with the resident runtime and
on-device voice always packaged. `scripts/apk.ts` types it: `ApkVariant = "launcher"`, `ApkMode = "debug" | "release"`.

So "both" now means the launcher flavor's two **build modes**, built by one `--release` build:

| Artifact | Mode | Signed by | Role |
|---|---|---|---|
| `artifacts/launcher-debug.apk` | debug, debuggable, arm64-v8a + x86_64 | Android debug key | test/build evidence; never goes into the image (image telephony refuses a debuggable launcher; a debuggable update over the system app drops the SMS and Dialer roles) |
| `artifacts/launcher-release-unsigned.apk` (or `launcher-release.apk` when Gradle signs) | release, R8, arm64-v8a only | unsigned here | the only distribution APK; signed in step 3 and preinstalled in the image |

`artifacts/instrumentation/launcher-androidTest.apk` is a test artifact, not a second distribution.

How `pnpm android:verify` (`scripts/verify-apks.ts`) checks them: it reads `artifacts/build-config.json`; unless
that says `release:false` it verifies **both** modes and fails if either is missing. For each: debuggable flag
matches the mode; distribution problems; the compiled update channel equals the build record; required app links
and no extra web VIEW filters; the packaged web bundle is `testMocks:false` and passes the production bundle audit;
gzip assets; owner route table; identity view; embedding libraries. Across both: one versionCode/versionName,
equal to `ELIZAOS_VERSION_CODE`/`_NAME` when set. Release only: signer admission against
`android/release-signer.json` (a signed release with another certificate **fails**; unsigned is recorded
`distributable:false`). Then `verify-packaged-runtime.py` on both, and the packaged voice bundle against
`android/voice-host/qualified-voice-host.json` byte for byte on both. It writes `artifacts/apk-manifest.json` with
two `results` rows; CI's "Require flag-off APKs" step requires exactly two rows, each `testMocks:false`,
`bundleAudit:"passed"`, `runtime:"PACKAGED"`. Step 2 asserts the same. It is APK-build evidence only.

## 5. Reference: legacy and Vibestack chains side by side

| | Legacy (develop, what v630 was built with) | Vibestack |
|---|---|---|
| Tooling | Bun 1.4.2, Node 24.15.0 | Node 26, pnpm 10.24.0, no Bun |
| Chain | preflight, `agent:build-embedding-host`, `agent:prepare`, `agent:build-workflow-worker`, `agent:stage-android`, `licenses:packaged-runtime`, `android:build --release` | preflight (also prepares native inputs), `agent:build-embedding-host`, `agent:build-workflow-worker`, `agent:bundle`, `agent:stage-android`, `licenses:packaged-runtime`, `android:build --release` |
| Resident runtime in the APK | Bun (`libeliza_bun.so` + musl loader), bundle `agent-bundle.js` | Node (`libeliza_node.so`), `agent.mjs`, `manifest.json`, `inventory.json` |
| Step script | `~/.cache/alpha-v612/image/apk.sh` … `apk631.sh` (+ `sign.sh`, `setvc.py`, `swap.py`) | `steps/02`…`04` here |
| Image recipe | `pixel10a-preparation/build-vNNN/build-image.sh` | `steps/lib/build-image-inner.sh` (same commands) |
| Flash | `v630-tests/flash-run.sh`, `flash617auto.sh` | `steps/06-flash.sh` |
| `deploy-image.sh` | was in session fb4a8650's scratchpad under `/tmp`: gone | not needed |
