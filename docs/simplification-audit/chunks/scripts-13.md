# Chunk scripts-13: summary

32 files reviewed (scripts `reminder-recovery-fixture.ts` … `test-android-notification-device-slot.ts`).
Per-file reports: `docs/simplification-audit/files/scripts/<name>.md`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| reminder-recovery-fixture.ts | emulator campaign driver | KEEP, SIMPLIFY | absorb `test-reminder-recovery.ts` + `test-reminder-recurrence-recovery.ts` as `--recurring` CLI |
| removed-profile-flags.ts | tombstone | DELETE | + 5 call sites, Python twin in `verify-packaged-runtime.py:244` |
| render-assetlinks.ts | release CLI + lib | KEEP, SIMPLIFY | import upstream `parseAndroidAssetLinksConfig`; move manifest-filter checks to `apk.ts` |
| resident-emulator-admission.ts | CI safety helper | KEEP | — |
| run-node-tests.ts | test runner wrapper | SIMPLIFY | drop env validation; delete `node-test-runner.test.mjs` |
| runtime-profile.ts | build check | MERGE | into `native-google-host-artifact.ts` (`--verify-staged`); update product.gradle, resident-android.yml, preflight |
| scan-archived-apks.py | manual evidence tool | DELETE | with `test/archive-scan.test.mjs` (owner question) |
| sign-aosp-release.ts | release binding | KEEP, SIMPLIFY | drop test-only upstream re-exports |
| sign-release-apks.ts | release CLI | KEEP, SIMPLIFY | hard-coded old package in rotation verifier (bug, owner) |
| source-snapshot.ts | build evidence | SIMPLIFY | git-derived digest instead of ~90 hand-listed roots |
| speech-env.ts | dev config helper | SIMPLIFY → MERGE | drop retired-name refusals; `speechMode` into `host-speech-admission.ts` |
| stage-alpha-os-branding.py | OS staging tool | KEEP, SIMPLIFY | replace `assert` guards (stripped by `-O`); `observe` hook for Quint PORT |
| stage-aosp-native.py | OS staging adapter | KEEP, SIMPLIFY | drop test-only constant re-exports, pass-through |
| stage-aosp.ts | OS staging CLI | KEEP, SIMPLIFY | split `main`, merge patch helpers, typed `.d.ts` for upstream `.mjs` |
| stage-embedding-host.ts | build stager/verifier | KEEP, SIMPLIFY | readable predicates, shared helpers |
| stage-local-agent-runtime.ts | build stage | KEEP, SIMPLIFY | prepare check runs 3×; no temp runner file; drop tombstone |
| stage-local-agent-sources.ts | Gradle build step | KEEP, SIMPLIFY | drop redundant pin/regex checks and restore choreography |
| stage-native-apps.ts | one-off tool | DELETE | no caller (only a Java comment) |
| stage-os-update-enrollment.ts | manual OS tool | KEEP pending owner | D17 device concern; one source of truth for policy |
| stage-workflow-worker.ts | build stage | KEEP, SIMPLIFY | export function; caller imports instead of spawning |
| start-cloud-qa.ts | dev launcher | KEEP pending owner | live Quint model; shared launch function |
| start-combined-agent.ts | dev launcher | KEEP pending owner | port 47858 vs instrumented tests' 47859 (bug, owner) |
| start-local-remote.ts | dev launcher (`agent:local`) | KEEP | becomes the one local launcher with flags |
| start-local-voice-agent.ts | dev launcher | DELETE | merged: `ELIZA_PARADEE_ENABLED=1 npm run agent:local -- --port 47844 …` |
| start-reviewed-workflow-agent.ts | dev launcher | MERGE → DELETE | into `start-local-remote.ts`; retarget ReviewedWorkflowLauncher probe in the same change |
| storage-specs.ts | Playwright data list | DELETE (tag) | `@storage` tag + `grep` on firefox/webkit projects; interim MOVE next to playwright.config.ts |
| test-agent-calendar-mutation-flow.ts | integration (+ pure DST cases) | MOVE/MERGE | `test/agent-calendar.test.ts`; delete shim `test/agent-calendar-mutation.test.mjs` |
| test-agent-camera-flow.ts | transplant + DeviceActions integration | REWRITE | `test/browser/journeys/camera-photos.spec.ts` + `test/device-actions.test.ts`; delete shim `test/agent-camera-capture.test.mjs` |
| test-agent-context-browser.ts | Playwright-in-script, T6 | REWRITE | `journeys/chat.spec.ts`, `journeys/camera-photos.spec.ts`; sanitizer cases → `test/phone-context.test.ts` |
| test-agent-speech-bridge.ts | integration (loopback HTTP) | MOVE/MERGE | `test/local-agent-speech-bridge.test.ts` |
| test-agent-tts-bridge.ts | integration (loopback HTTP) | MOVE/MERGE | same file as above |
| test-android-notification-device-slot.ts | never-run JVM diagnostic | DELETE | duplicate of `test/native-notification-device-slot.test.mjs` |

Counts: KEEP (incl. KEEP+SIMPLIFY / pending owner) 18, DELETE 6, MERGE/MOVE/REWRITE 8.

## Behaviours that lose coverage if the DELETEs/REWRITEs land without replacements

- **Agent-requested camera capture** (one capture per current message, lost receipt never recaptures,
  hidden/aborted/stale continuation refuses): only `test-agent-camera-flow.ts` covers it today, by text
  transplant. Needs the `camera-photos` journey plus a `device-actions` integration test before deletion.
- **Context privacy on the wire** (selected video sent only as opaque id/revision; chooser/background/
  pagehide cancels pending turn and proposals; rate-limit never auto-retries): `test-agent-context-browser.ts`.
  Needs the `chat` and `camera-photos` journeys and `test/phone-context.test.ts`.
- **Reminder alarm with revoked notification permission across a real reboot**: only the manual
  `reminder-recovery-fixture.ts` campaign; nothing in CI. Kept, but say so in the PR.
- **Provider key absent from archived APK bytes**: only `scan-archived-apks.py` (owner machine only).
  Lost on delete unless an optional secret-file scan moves into `audit-production-bundle.ts`.
- Retired-flag/env refusals (`removed-profile-flags.ts`, `speech-env.ts` RENAMED/RETIRED) are lost on
  purpose (A8); verify every touched option parser still rejects unknown flags.

## Shared helpers worth keeping / creating

- `scripts/private-runtime-launch.ts`: grow a `launchPrivateDevServer(...)` and `privateFile()` used by
  `start-local-remote`, `start-cloud-qa`, `start-combined-agent` (absorbs `launcher-child.ts`).
- `scripts/lib`: `sha256File`/`sha256`, `readJson`, `git()`, `errorText` (twins in `sign-release-apks`,
  `stage-aosp`, `stage-embedding-host`, `source-snapshot`, `runtime-profile`, `stage-os-update-enrollment`).
- `node:util` `parseArgs` replaces hand-rolled parsers in `render-assetlinks`, `sign-release-apks`,
  `stage-aosp`, `stage-embedding-host`, `stage-os-update-enrollment`.
- `scripts/fixtures/speech-bridge.ts` + `loopback.ts` → `test/fixtures/` (survive: used by the merged
  speech-bridge test). `scripts/fixtures/device-action-journal.ts` → `test/fixtures/` (used by the new
  `device-actions` test). `scripts/fixtures/playwright.ts` loses this importer.
- Upstream `vendor/eliza/packages/cloud/shared/src/lib/auth/android-asset-links.ts` is dependency-free
  and replaces the mirrored Cloud validator.

## Cross-file actions

1. Delete `removed-profile-flags.ts` with its imports in `android-build-preflight.ts`, `build-android.ts`,
   `gradle-verification.ts`, `stage-local-agent-runtime.ts`, `verify-apks.ts`, the twin in
   `verify-packaged-runtime.py:244-246`, `build-archive.ts:19-20`, `sign-release-apks.ts:292`,
   `quint-lib.ts:34`, and the cases in `one-runtime-profile.test.mjs`, `android-build-path.test.mjs:146`,
   `upstream-pin-guard.test.mjs:117`.
2. Launcher consolidation and Quint: `ReviewedWorkflowLauncher` probe (`reviewed-workflow-launcher*.mjs`)
   retargets `start-local-remote.ts`; application manifest `DevelopmentHost.sources` drops
   `start-local-voice-agent.ts`; `combined-agent-launcher*.mjs` drop `speech-env.ts` from support lists.
   These harnesses copy and run the launchers (integration), so they survive the refactor once their file
   lists are updated. Must stay at 100 % (D11).
3. PORT `specs/quint/refinement/application/os-source-staging.mjs`: stop splicing
   `"    for row in rows:\n        if not row['changed']: continue"` into `stage-alpha-os-branding.py`;
   import the module and pass an `observe` callback to `apply_plan`.
4. Source-text tests to delete with these changes: `aosp-capabilities.test.mjs:53`,
   `aosp-image-capability.test.mjs:62` (stage-aosp), `mobile-uuid-build.test.mjs:49-53`,
   `android-runtime-staging-selection.test.mjs:45-47`, `android-build-path.test.mjs:216`,
   `one-runtime-profile.test.mjs:59,88`, `embedding-host-admission.test.mjs:201`,
   `alpha-system-entry.test.mjs:100`, `core-state-patch.test.mjs:107-116`, `cloud-deployment.test.mjs:142`,
   `aosp-fresh-presets.test.py:115-116`.
5. `storage-specs.ts` removal touches `playwright.config.ts`, `scripts/qualify-head.ts`,
   `scripts/ci/affected.ts:28`, `test/playwright-projects.test.mjs`; coordinate with the browser-journey
   chunks, since the listed specs for deleted features (`*-storage-migration`, `calendar-backup-restore`,
   `calendar-linked-storage`, `cloud-account-migration`) go with them.
6. `adapters.spec.ts` loses `test-agent-context-browser.ts`; `local-agent-contracts.test.mjs` loses its two
   speech shims; `agent-calendar-mutation.test.mjs`, `agent-camera-capture.test.mjs`, `archive-scan.test.mjs`,
   `node-test-runner.test.mjs` are deleted.
7. `PasswordProviderSupport.java:16` comment loses its `stage-native-apps.ts` reference.

## Owner questions

1. `sign-release-apks.ts:256` passes `ai.elizaresearch.alphaphone` to the rotation verifier although the
   app id is now `ai.alphacompute.alphaphone`; any rotation signing will be refused. Should the rotation
   read the app id, or is the rotation record obsolete for the renamed package (D17/Q-LEG-5)?
2. `start-combined-agent.ts` binds 47858 while `CombinedAgentInstrumentedTest` /
   `CombinedAgentRestartInstrumentedTest` and `android-instrumentation.ts:329` use 47859 (the
   `dev-cloud.ts` port). Which is intended, and is the combined frozen-source launcher still used?
3. Is `start-cloud-qa.ts` (staging Cloud inference QA, live Quint model, no npm entry) still used? Keep with
   an npm script, or delete with its model (D20)?
4. Are the manual tools still run by hand: `scan-archived-apks.py` (provider-key scan),
   `stage-os-update-enrollment.ts` (pilot OTA enrollment), `reminder-recovery-fixture.ts` (emulator reboot
   campaign)?
5. `stage-aosp-native.py` defaults to `linux-musl`/`stable` when an APK has no runtime provenance. Does
   every current build write provenance (then the default should become a refusal)?
