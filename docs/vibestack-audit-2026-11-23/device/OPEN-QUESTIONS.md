# Open questions for the device lane (most blocking first)

Written 2026-11-23 from reading alpha `vibestack` 7c2338706 (pin eliza `vibestack-dp` 6451775c35a), alpha
`develop` dd63c6bc6, the legacy step scripts and logs, the AOSP tree and read-only adb. Nothing was built or run.
"Verified" below means a file, hash or git fact was read today; everything else is inference and says so.

## Q1. Does the handed-over commit build an APK at all?

- `docs/vibestack-open-items.md` at 7c2338706: "`pnpm android:build:local` has not been run"; "`agent:stage-android`
  … `agent:build-workflow-worker` … neither has been run"; "`agent:build-embedding-host` cannot run until the
  producer is re-homed"; `pnpm typecheck` fails with 493 syntax-phase errors; the qualified voice and embedding host
  records carry the library hashes of engine `6337fd4c…` under `forkPin 5c5d6163…` (Gradle's `verifyVoiceHost` and
  `verifyEmbeddingHost` compare staged bytes with those records).
- Register rows open at that commit that stop the build: **A-003** (`AlphaLocalAgentPlugin.java:1052,1066` still
  call a package-private upstream class), **A-023** (`scripts/generate-sbom.ts` imports the removed `BUN_ENTRY`;
  it is the last step of `build-android.ts`), **A-033/E-044** (host records need regenerating by a real native build).
- Needed from the build session: the commit, the exact command that produced `artifacts/apk-manifest.json` with two
  rows, and whether it ran in the same checkout I am given (then stages 1-6 of `02-apk.sh` are warm).

## Q2. The build preflight refuses the Vibestack pin wherever `origin/main` exists

- Verified: `origin/main:upstream.lock.json` pins eliza `2cd448186c5e…`; the Vibestack lock pins `6451775c35a2…`;
  `git merge-base --is-ancestor 2cd448186c 6451775c35` fails in both `vibeaudit/eliza.git` and `eliza-vs`.
- `scripts/android-build-preflight.ts` `mainPinProblem` then returns "older than or diverged" and the preflight
  exits 2. `build-android.ts` runs the same preflight again. If the old pin is absent from `vendor/eliza` the answer
  is "unknown", also exit 2; a shallow `vendor/eliza` is exit 2 too. There is no override flag on this line.
- It passes only when the clone has no `origin/main` ref (a note is printed), or when `main` itself carries a
  Vibestack pin that is an ancestor.
- Question: how did the build session get past it, and will `ALPHA_DIR` be in that same state? `01-preflight.sh`
  evaluates the guard and says which case applies.

## Q3. Staging into the AOSP tree has no tested path for a Vibestack APK

- Verified: the tree's `vendor/alphaphone/Android.bp`, `native-libraries.json` and `config.fs` list 12 libraries
  of the Bun runtime. Vibestack's runtime library is `libeliza_node.so` (`PayloadCheck.java`,
  `stage-android-native.py` `RUNTIME_MODES`). The legacy `swap.py` reads every listed entry from the APK and stops
  on the first one that is missing, so the path used for every deploy since v93 does not apply.
- Verified: the official `aosp:stage --target pixel10a` checks the tree against the Vibestack `soong-app-native`
  patch manifest, which expects `build/soong/etc/prebuilt_etc_test.go` = `cb22d282…`; the tree has develop's
  `7ed2e713…` (`prebuilt_etc.go` itself is identical, `a4c189fa…`). The 2026-11-15 note adds that branding edits in
  the tree cannot be declared to the stage contract. So the official stage is expected to refuse twice over.
- What I prepared instead (`STAGE_MODE=launcher`): the upstream launcher-overlay stager plus the checkout's own
  native stager into a scratch directory, then a transplant of six launcher-owned files. **Untested.** Unknowns:
  whether `finalizeAndroidNative` works without `composePixel10aProduct` having run in between; whether the
  generated `Android.bp` names the same `AlphaPhoneDefaultPermissions` / `AlphaPhonePrivappPermissions` modules the
  tree's `product.mk` installs (the script checks); whether upstream's stager accepts the descriptor I build.
- Decision needed if both fail: reset and re-patch `build/soong` in the AOSP tree and re-stage fully (a write to
  the tree that forces a long Soong rebuild and means re-applying branding from `branding-v90-20261115` /
  `branding-ink-20261116`), or fix the launcher path by hand.

## Q4. The image build: memory, a changed `Android.bp`, and a tree that was mid-build when the machine crashed

- Verified: today 12:03 the legacy v631 image build died with `ninja failed with: exit status 137` after 181 s
  under a 16 GB scope; the machine crashed about 12:30. Whether `out/` or the tree's git objects were damaged is
  not checked (the 2026-11-18 crash left zero-byte git objects in the main repository).
- heavy.sh clamps memory to 10 GB (its comment says 11); the legacy recipe set `GOMEMLIMIT=11GiB`. I lowered it to
  8GiB to fit. A Soong regeneration (certain, because `Android.bp` changes) may not fit in 10 GB. Not known.
- The last image build with a changed blueprint took about 87 min (v40, `-j2`); the 5-11 min figures are for
  blueprint-identical rebuilds.
- Question for the coordinator: may the image build have a one-off larger cap on a quiet machine, and is any other
  session still going to build or flash **legacy v631**? `vendor/alphaphone` holds the v631 launcher now, and a
  v631 flash would change the baseline and the rollback image (there is no `img631.zip`).

## Q5. What "equivalent" can mean for the owner's data, and what rollback cannot undo

- Register blockers at 7c2338706: A-001 (agent state in `files/.eliza` not adopted: conversations, memory,
  schedules, workflows start empty), A-010 (in-flight inbox sends not adopted), A-012/A-013 (page storage and
  several draft slots not adopted), A-015/E-004 (sign-in not adopted by the Cloud path; sign-in routes the
  Vibestack Cloud does not serve). "Sign-in state kept" is therefore expected to fail unless the handed commit
  fixed these. Owner decision: is that acceptable for this flash, or is it a reason not to flash yet?
- Rollback restores system partitions only. `/data` is kept both ways. Whether legacy v630 runs correctly again on
  data the Vibestack build has touched (lazy legacy-slot adoption, a second agent state directory, a system app
  going from a higher to a lower versionCode) has not been tried.
- A copy of Alpha's app data before the flash would make rollback complete. On this userdebug image that means
  `adb root` and copying `/data/user/0/ai.alphacompute.alphaphone`, which contains the owner's credential stores.
  I did not script it. Owner decision.

## Q6. Cold native build and network

- The Vibestack native recipe hash differs from the 7 cached legacy ones in `~/.cache/alpha/native-inputs`, so the
  voice and embedding libraries are expected to be rebuilt from source (engine clone from
  `github.com/elizaOS/llama.cpp`, model downloads, NDK 28.2.13676358). `build-toolchain.json` pins CMake 4.0.3;
  the system has 4.4.4. Legacy builds passed here, so the recipe presumably brings its own CMake; I did not trace it.
- `agent:stage-android` downloads the Android Node 26.13.1 archives from an elizaOS/eliza GitHub release each run;
  the register (E-047) says those archives' hashes were never confirmed by a real fetch.
- Is network access from the heavy units allowed for these, and are the release assets reachable anonymously?

## Q7. New permissions and the privileged allow-list

- The image allow-lists `READ_PRIVILEGED_PHONE_STATE` (and a hand-added, unrequested `INSTALL_SELF_UPDATES`) for
  the privileged launcher. The audit says the Vibestack manifest keeps every legacy permission and that the
  generator strips the new `wifi` module's `CHANGE_NETWORK_STATE`; I did not read the merged manifest (it exists
  only after a build). `03-sign.sh` diffs requested permissions against `Launcher630.apk` and stops on any addition.
- Whether privileged-permission enforcement is on for this image is not known: `ro.control_privapp_permissions` is
  absent from `baseline/getprop.txt`. If it is enforced, an unlisted privileged permission prevents boot.

## Q8. The on-device driver does not match the Vibestack DOM

- `~/.cache/alpha-v612/driver/say.mjs` depends on `data-alpha-agent-row`, `data-alpha-turn-status`,
  `.alpha-action-review`, `data-alpha-chat-proposal`, `data-alpha-proposal-act`, `data-active-view`; none appears
  under `apps/app/src/web/{assistant,shell,telephony}` at 7c2338706. Who ports it, and is it done before the flash?
  The text-based snippets in `DEVICE-CHECKS.md` are a stopgap and untested.
- Whether the Alpha page is still served at `https://localhost/` (the driver's page filter) is assumed, not read.

## Q9. Script facts not settled by reading

- Is `ELIZAOS_VERSION_CODE` honoured by the schema-2 generated Gradle host? The profile has a `versionOverride`
  key and `verify-apks` fails loudly on a mismatch; I did not trace the generator. Fallback: `PATCH_VERSION_CODE=yes`.
- `pnpm android:build:local -- --release` (README) against `pnpm android:build:local --release` (android.yml): which
  form passes `--release` cleanly through the nested `pnpm -s android:build` under pnpm 10.24.0 was not tested.
  `02-apk.sh` avoids the question by calling node directly for the last stage.
- `verify-apks.ts`, `scripts/apk.ts` and `update-apk-admission.ts` import
  `vendor/eliza/packages/os/android/apk-distribution.mjs` and `android-manifest-facts.mjs`, deleted upstream in
  83acbce7b, which is an ancestor of the repin the open-items doc asks for (#40310). If the handed commit is
  repinned past it, was this fixed?
- Does the Soong-installed launcher stay byte-identical to `Launcher.apk` (`presigned` + `preprocessed`)? Steps 5
  and 7 check; a difference is reported, not assumed away.
- Stale libraries: I assume a library module that disappears from `Android.bp` leaves its file in
  `out/…/product/priv-app/AlphaPhone/lib/arm64` and that the file would reach `product.img`. Step 5 removes that
  directory first and checks the result. Not observed.
- heavy.sh exports `CI=1` to every job; what `m`, Gradle or the upstream turbo build do differently with it is unknown.

## Q10. What exactly the legacy baseline is

- The phone's v630 was built in the worktree `/home/shaw/Work/alphaphone-wt/close-tabs` (`apk630.sh`); the commit is
  not recorded in `apk630.sum`. `vibeaudit/alpha-develop` is at dd63c6bc6 (#1454). Is v630 that commit?
- The signing certificate digest was not read from the phone (the permitted adb commands show only
  `signatures:[289df855]`); it is taken from `apk630.sum`. Steps 6 and 7 compare the on-device APK's sha256 with
  the local APKs, which settles it.
- Many "legacy showed" cells in `DEVICE-CHECKS.md` have no recorded evidence (Home, library, Settings, Inbox,
  Files, reminders, declining a card). They must be captured on v630 before the flash, or equivalence for them
  cannot be judged afterwards. Who does that pass, and has the owner agreed to the ASK items in it?

## Q11. References to things that do not exist, or that the docs say are unbuilt

- `deploy-image.sh <versionCode>` (note of 2026-11-16) lived in session fb4a8650's scratchpad under `/tmp`: gone.
  Its template `build-v99/build-image.sh` and every later `build-vNNN/build-image.sh` exist.
- `~/.cache/alpha-v612/image/apk.sh` exists but is the v612 instance (hard-coded worktree `alphaphone-wt/v612`,
  Bun 1.4.2, Node 24); the newest is `apk631.sh`.
- `scripts/os-ported/os/sense-listener.mjs` runs `./verify-sense-apk.py`, which is not in the repository (E-046).
  Only an image with the Sense listener hits it; this lane stages none.
- `scripts/os-ported/os/pixel10a-release.mjs` reads `packages/os/android/products/`, gone at the pin (open-items).
  Production staging and release signing would hit it; the owner-development path here does not.
- `android/release-signer.json` names signer `edbfcacb…` with `lastRelease.versionCode: null`: no distributable
  Vibestack release can come out of this lane, by design. The image carries a debug-key launcher.
- The working copy's `AGENTS.md` at `/home/shaw/Work/alphaphone` (branch `claude/signin-e2e-20261111`) still
  describes the Bun chain and "both distribution variants"; both current lines say one launcher flavor.
- CI sets `ALPHA_RUNTIME_GIT_CACHE`; no file under `alpha-vs/scripts/*.ts` reads it.

## Q12. Smaller device questions

- The phone also has `ai.elizaresearch.alphaphone` (the retired id) and three test packages installed as user
  apps (`baseline/packages.txt`). Leave them, or does the owner want them gone before judging equivalence?
- On legacy, each APK update burned one `ipc-recovery-*` slot and the agent refused at 8 (note of 2026-11-05).
  Whether the Vibestack agent keeps that counter, and where it stands on the phone, is unknown.
- The phone's clock is on Eastern time (calendar replies say EST); the laptop is on Pacific. Tests that say
  "tomorrow at 3pm" are judged in the phone's zone.
- Who else is attached to the phone's WebView (CDP port 9333) or holds a fastboot session when this lane starts?
