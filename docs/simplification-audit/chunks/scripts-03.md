# Chunk scripts-03: build pipeline, dev-server plugins, formal-method runners

## Files
| file | lines | kind | verdict | target / note |
|---|---|---|---|---|
| scripts/apk.ts | 328 | APK release-policy library | KEEP + SIMPLIFY | table-driven `validateApk`, one manifest-node helper, call `auditWebBundle` in-process, export `ManifestFacts` for the 3 `ApkManifest` copies |
| scripts/app-update-candidate.ts | 312 | CI release tool | KEEP + SIMPLIFY | shared helpers, drop same-run re-validation; `app-stable` legacy floor kept pending owner |
| scripts/audit-production-bundle.ts | 180 | build-output audit CLI | KEEP + SIMPLIFY | prune denylist entries for deleted code (`Update channel (development)` already dead; Wallet strings with D2) |
| scripts/browser-cloud-dev-bridge.ts | 519 | Vite dev middleware | KEEP + MOVE + SIMPLIFY | `dev-server/browser-cloud/` split into 5 modules; delete cli-session hand-off with stage A4 |
| scripts/browser-full-reload.ts | 35 | Vite dev plugin | KEEP + MOVE | `vite-plugins/full-reload.ts` |
| scripts/browser-pdf-assets.ts | 15 | Vite plugin | KEEP + MOVE + MERGE | `vite-plugins/` shared static-assets plugin with `local-ocr-assets.ts` |
| scripts/build-android.ts | 319 | build entry + release-signer admission | KEEP + SIMPLIFY | delete profile-flag tombstones; move admission to `scripts/release-signer.ts` |
| scripts/build-archive.ts | 107 | CI archive step | KEEP + SIMPLIFY | `main()`, no profile tombstones; owner: stop re-running full `verify` (2 h) inside the archive |
| scripts/build-embedding-host.ts | 231 | build step | KEEP + SIMPLIFY | drop dead `embeddingHostState`, use `toolchain.ts` SDK, no unread COMPARISON.json |
| scripts/build-mobile-agent.ts | 30 | build step (Bun) | KEEP | drop T1 tests that regex it |
| scripts/build-native-google-host.ts | 61 | build step (Bun) | KEEP + SIMPLIFY | drop in-build rehash checks |
| scripts/build-notification-fixture.ts | 28 | manual fixture builder | DELETE (or MOVE to `test/android/` if campaign wired) | unrun; feeds unwired `test-cross-app-notifications.ts` campaign |
| scripts/build-pinned-voice.ts | 58 | manual build tool | DELETE | only caller is its stub test `test/pinned-voice-build.test.mjs` (delete too) |
| scripts/build-policy-source.ts | 7 | helper | KEEP | move to `scripts/lib/` |
| scripts/build-workflow-worker.ts | 22 | build step (Bun) | KEEP | possibly one fewer `prepare-local-agent --source-only` run |
| scripts/bun-runtime.d.ts | 40 | ambient types | KEEP | research "nobody" is expected for a `.d.ts` |
| scripts/check-cloud-recording-signature.ts | 31 | integration check in scripts | MOVE to `test/` | `test/cloud-recording-signature.test.mjs`; runs twice today (CI step + test) |
| scripts/check-lemma.ts | 119 | Lemma runner | KEEP + SIMPLIFY | drop receipt/rehash/frozen write-back/self-checks; Dafny once in `lemma-check.yml` |
| scripts/check-quint-refinement.ts | 217 | refinement driver | MOVE + SIMPLIFY | `specs/quint/refinement/run.mjs`; drop legacy family, progress files, rehash |
| scripts/check-quint.ts | 249 | Quint runner | KEEP + SIMPLIFY | drop receipts, canaries, rehash, custom process supervisor (~110 lines) |
| scripts/child-command.ts | 31 | helper | KEEP | move to `scripts/lib/` |

## Behaviours that would lose all coverage if the DELETEs happen
- **Cross-app notification listening on a device** (`build-notification-fixture.ts` + `test-cross-app-notifications.ts`):
  the fixture APKs are the only witness apps for `NotificationsInstrumentedTest`'s cross-app path. Today no CI lane runs
  it, so CI coverage is already zero; deleting removes the *possibility*. Needs an owner call: wire into
  `android-emulator.yml` or accept the loss (an emulator lane would be an emulator result, not a device result).
- **Pinned voice-library build provenance** (`build-pinned-voice.ts`): no CI coverage now; staging is still verified by
  `android-stage-voice-models.ts --from`. Nothing lost in CI.
- Release-rule T1 assertions that regex these scripts (`aosp-sms.test.mjs:248`, `aosp-image-capability.test.mjs:263`,
  `pilot-update-export.test.mjs:67`, `settings-truth.test.mjs:22`, `mobile-uuid-build.test.mjs:55-56`,
  `one-runtime-profile.test.mjs:50`, `strict-build-inputs.test.mjs:118`) can be deleted without losing behaviour
  coverage: the rules they read are executed by `verify-apks` / `audit:bundle` / `android:build:local` on real outputs.

## Shared helpers worth keeping / creating
| helper | where now | proposed home |
|---|---|---|
| `runChild` / `exitFromChild` | `child-command.ts` | `scripts/lib/child-command.ts` |
| `parseBuildPolicy` | `build-policy-source.ts` | `scripts/lib/policy-source.ts` (drop Python twin in `verify-packaged-runtime.py`) |
| sha256 / readJson / git / gh | private copies in `app-update-candidate.ts:53-84`, `build-embedding-host.ts:28-29,127`, `build-archive.ts:74,98`, `build-native-google-host.ts:32,59`, `browser-full-reload.ts:9`, `build-pinned-voice.ts:51` | `scripts/lib/{hash,fs,git,gh}.ts` |
| Android SDK resolution | `build-embedding-host.ts:97 resolveSdk`, `build-notification-fixture.ts:17` hard-coded build-tools | `toolchain.ts androidEnv()` / `tool()` |
| loopback same-origin check, private-file reader | `browser-cloud-dev-bridge.ts:58-59,314,327,333` + `local-agent-dev-bridge.ts` + `gmail-agent-dev-broker.ts` | `dev-server/lib.ts` |
| release-signer admission | `build-android.ts:143-208` (12 script importers) | `scripts/release-signer.ts` |
| static-asset Vite plugin | `browser-pdf-assets.ts`, `local-ocr-assets.ts` | `vite-plugins/static-assets.ts` |
| `ManifestFacts`/`ApkInspection` types | `apk.ts:20-63` (local) vs `ApkManifest` in `generate-sbom.ts:91`, `provision-unit.ts:56`, `qualify-head.ts:83` | export from `apk.ts` |
| `readBuildFlags` | `apk.ts:220` (throws) vs `audit-production-bundle.ts:112` (tolerant) | one reader in `audit-production-bundle.ts` |

## Cross-file actions
1. **Profile-flag tombstone removal** (A8): `build-android.ts:32,67,88-89,278-279,307`, `build-archive.ts:19-22,78`,
   `app-update-candidate.ts:171` (`runtimeProfile: 'native'` reader), `removed-profile-flags.ts`,
   `test/one-runtime-profile.test.mjs` - one commit.
2. **Receipt ceremony removal** (B5): `check-quint.ts` receipts + `ci/check-changed-models.ts:93-101` receipt
   re-validation + `test/quint-checker.test.mjs`, `test/quint-changed-models.test.mjs`; `check-lemma.ts` receipt +
   `test/lemma-check*.test.mjs`; `check-quint-refinement.ts` progress files. CI artifact uploads of
   `test-results/quint/` and `test-results/lemma/` (`browser.yml:83-85`, `quint-model-check.yml:59`,
   `lemma-check.yml:55`) shrink to logs.
3. **Legacy Quint retirement** (P6/D11): `check-quint.ts:42`, `check-quint-refinement.ts:67,82,152-154,195-201`; then
   `quint:prepare-history` leaves `npm run verify`.
4. **Dafny run once** (P3): remove `LEMMA_REQUIRE_BACKEND=1` + `prepare-dafny.sh` from `browser.yml:69-74`; keep it in
   `lemma-check.yml` with a path filter on `apps/app/src/**`, `specs/lemma/**`, `LemmaScript-files.txt`,
   `lemmascript.json`, `scripts/check-lemma.ts`.
5. **Refinement runner location and duplicate execution** (T4/T10): move driver to `specs/quint/refinement/run.mjs`;
   run all runtime families in one CI job; delete per-model host-test replays of the same campaigns.
6. **Dev-server/plugin move** (D11, stage F): `browser-cloud-dev-bridge.ts`, `browser-full-reload.ts`,
   `browser-pdf-assets.ts` (+ `local-agent-dev-bridge.ts`, `local-ocr-assets.ts`, `gmail-agent-*`) out of `scripts/`;
   update `vite.config.ts`, Quint manifests that path-pin them (`specs/quint/application/manifest.json` symbol pins on
   the cloud bridge must first become imports), `copy-receipt.mjs:102` hash list.
7. **cli-session hand-off deletion** with CloudProtocol.login (stage A4): `browser-cloud-dev-bridge.ts:120-126,407-409`,
   `audit-production-bundle.ts:23` entries can stay as a regression guard until the renderer strings are gone.
8. **Denylist pruning** as stage A deletes features: `audit-production-bundle.ts:36-39` (Wallet), `:70` (dead now).
9. **`apk.ts` audit in-process**: `apk.ts:238-251` imports `auditWebBundle`; delete the symlink fixture in
   `test/verify-apks.test.mjs:220`.
10. `specs/lemma/README.md:91` doc drift (`DOTNET_ROLL_FORWARD` is not set by the script).

## Owner questions
1. `app-stable` (`LEGACY_APP_UPDATE_TAG`): is that release tag retired/empty? If yes, the legacy version-floor reads in
   `app-update-candidate.ts:116` and `deliver-app-update.ts:113-132` can go; if not, they must stay (real update floor).
2. Should `build-archive.ts` keep running the full 2-hour `npm run verify` inside every resident-android archive, or
   rely on the PR verify lane for the same commit and only build + freeze inputs?
3. Cross-app notification campaign (`test-cross-app-notifications.ts` + `build-notification-fixture.ts` +
   `android/notification-fixture`): wire into an emulator lane or delete all three?
4. `build-pinned-voice.ts`: still run by hand to produce voice outputs? If not, delete with its test.
5. `runQuintChecker` silent SIGSEGV/SIGILL retry: does the Quint crash still reproduce on the pinned version?
