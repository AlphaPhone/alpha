# Plan: `scripts/`, `package.json` and the workflows that call them

Inputs: chunk summaries `chunks/scripts-01` … `scripts-18`, the `scripts/` mentions in `chunks/test-*` and
`chunks/specs-*`, `research/scripts.md`, `research/ci-and-formal.md`, `research/tests-host.md` §10,
`PATTERNS.md`, `DECISIONS.md`, `RECOMMENDATIONS.md`, `cross-file-actions.md` §1.6, §2 and §7.
Every path and caller below was re-checked against the worktree on 2026-11-11 with
`git grep` (excluding `vendor/`, `docs/simplification-audit/` and `package-lock.json`).

## 0. Scope, state and ownership rules

**State on 2026-11-11 (uncommitted in this worktree, done by stage A/C):** already deleted
`scripts/feature-manifest.ts`, `test-calendar-sync-provider.ts`, `test-clock-handoff-flow.ts`,
`test-google-calendar-selection.ts`, `test-notes-{action,documents-browser,query,store,trash}-flow.ts`
(and `test/feature-parity.test.mjs`, `test/support/feature-parity.mjs`). One dangling pin remains:
`test/fixtures/workflow-clock-admission.mjs:21` still lists `scripts/test-clock-handoff-flow.ts` (fixed in unit S0).
`scripts/lib/` does not exist yet. `scripts/` has 261 entries, 85 of them `test-*.ts`.

**This plan owns:** everything under `scripts/`, `package.json` (`scripts` block only; dependencies are
listed as owner questions), `tsconfig.scripts.json`, `.github/workflows/**` (chunk scripts-01), the new
files it creates under `test/integration/`, `test/resident/`, `test/live/`, `test/android/campaigns/`,
`test/support/` and `test/*.test.py`, and the `test/` files whose only subject is a `scripts/` file
(shims that spawn a script, tests of a deleted tool). Each such test file is named in the unit that owns it.

**It does not own:** Playwright journeys that replace transplant scripts (`test/browser/journeys/*`, test
plan), merges of host tests into area files (test plan), Quint/Lemma model and harness edits (specs plan),
product code. Where a unit must change one line of a file outside its tree (a path pin), the line is named;
§2 of `cross-file-actions.md` requires the pin to change in the same commit.

**Ordering rule.** Units in the same wave run in parallel and own disjoint files. A later wave may touch a
file an earlier wave owned. Every unit ends with: `npm run typecheck`, `npm test`, `npm run quint:check`
for any model whose `sources`/harness names a touched file, and (for build scripts) `npm run
android:build:local` where the machine allows (DECISIONS D21). An APK build is not an emulator, image or
device result.

---

## 1. DELETE ledger

Callers column = every hit of the file's basename outside the file itself, today. "Same change" = what
must be edited or deleted in the same commit.

### 1.1 Delete now (no runner, no release role, or decided by DECISIONS)

| File | Callers found today | Same change | Basis |
|---|---|---|---|
| `scripts/aosp-unsigned-debug.init.gradle` | none | — | A7 |
| `scripts/cloud-subscription-latency.ts` | none | — | A7 (one-off probe for #410) |
| `scripts/compare-prototype.py` | none | — | A7 |
| `scripts/prototype-capture.ts` | none | — | A7; drives Wallet states (D2) |
| `scripts/fingerprint-voice-assets.ts` | `test/llama-cpp-only.test.mjs:36` (allow-list regex) | drop `fingerprint-voice-assets` from that regex | A7 |
| `scripts/stage-native-apps.ts` | `PasswordProviderSupport.java:16` (comment) | delete the comment line | A7 |
| `scripts/test-automatic-update-platform.ts` | none | delete `test/fixtures/automatic-update-android/` | A7, never run |
| `scripts/test-update-confirmation-platform.ts` | none | delete `test/fixtures/update-confirmation-android/` | A7, never run |
| `scripts/test-native-calendar-consumer.ts` | none | — (upstream follow-up, D14) | A7 |
| `scripts/maps/test-region.py` | none | — | A7 |
| `scripts/maps/test-renderer.ts` | none (`dev-surface-gates.test.mjs:19` hit is the string `policy-test-renderer`) | — | A7; the journey is the test plan's `journeys/maps.spec.ts` |
| `scripts/maps/test-recovery-renderer.ts` | none | — | A7 |
| `scripts/maps/test-prepare-region.py` | `test/maps-dataset-manifest.test.mjs` | remove its case from that wrapper | T3 (faked network/process) |
| `scripts/removed-profile-flags.ts` | `android-build-preflight.ts`, `build-android.ts`, `gradle-verification.ts`, `stage-local-agent-runtime.ts`, `verify-apks.ts`, `quint-lib.ts` (list entry); tests `android-build-path.test.mjs`, `one-runtime-profile.test.mjs`, `upstream-pin-guard.test.mjs` | delete the import and call in each script; `build-archive.ts:19-22,78` and `sign-release-apks.ts:291-292` refusals; Python twin `verify-packaged-runtime.py:244-246`; `runtime-profile.ts:18` `--verify-cloud` refusal; delete `test/one-runtime-profile.test.mjs`; drop the name from `android-build-path.test.mjs:146-162` and `upstream-pin-guard.test.mjs:117` | A8 |
| `scripts/speech-env.ts` `RENAMED`/`RETIRED` tables (not the file) | `dev-speech-settings.ts`, `host-speech-admission.ts` | delete `refuseRetiredSpeechNames` and its calls; delete the matching cases in `test/agent-speech-environment.test.mjs` | A8 |
| `scripts/aosp-clock-contract.ts` | `stage-aosp.ts`, `verify-aosp-clock.ts`, `test/aosp-release-signing.test.mjs` | importers import `vendor/eliza/packages/os/scripts/android/*` directly | D4 (2-line re-export) |
| `scripts/aosp-image-capability.ts` | `stage-aosp.ts`, `test/aosp-image-capability.test.mjs`, `test/aosp-sms.test.mjs` | same | D4 |
| `scripts/android-browser-reading-live.ts` | `android-instrumentation.ts` `CAMPAIGN_RUNNERS` only | goes with S0's removal of `CAMPAIGN_RUNNERS`; Java classes `BrowserReadingLive*` are the android plan's (D5) | D5 |
| `scripts/android-paired-speech-live.ts` | same | same; `PairedAsrLive`, `PairedVoiceLive` (android plan) | D5 |
| `scripts/android-cloud-voice-timing.ts` | `test/android-cloud-voice-timing.test.mjs` | delete that test | A7 (diagnostics export produces the same data) |
| `scripts/build-pinned-voice.ts` | `test/pinned-voice-build.test.mjs`; `qualified-voice-host.json:45,67` names the **upstream** builder `build-pinned-voice.mjs`, not this file | delete the test | A7; staging stays verified by `android-stage-voice-models.ts` |
| `scripts/dev-ui-remote-host.ts` | `test/dev-ui-remote-host.test.mjs` | delete the test | A7 (no npm/doc caller) |
| `scripts/prepare-aosp-apk.py` | `test/aosp-apk-preparation.py`, `test/aosp-apk-preparation.test.mjs` | delete both tests | A7 |
| `scripts/test-android-notification-device-slot.ts` | `test/native-notification-device-slot.test.mjs:11` (comment) | delete the comment line | T4 duplicate |
| `scripts/test-reviewed-workflow-host.ts`, `test-workflow-approval-crash.ts`, `test-workflow-approvals-host.ts`, `test-workflow-cancel-recovery.ts`, `test-workflow-lifecycle-host.ts`, `test-workflow-metadata-host.ts` | `start-reviewed-workflow-agent.ts:4-8` (comment) only | delete with `scripts/fixtures/workflow-host.ts` | A7, unwired probes |
| `scripts/fixtures/workflow-host.ts` | only the six probes | — | A7 |
| `scripts/start-reviewed-workflow-agent.ts` | `quint-lib.ts` list; Quint `specs/quint/services/ReviewedWorkflowLauncher.qnt`, `refinement/services/reviewed-workflow-launcher{,-probe}.mjs`, `reviewed-workflow-launcher.md`, `services/manifest.json:2106-2107`; tests `quint-reviewed-workflow-launcher-refinement.test.mjs`, `agent-embedding-overrides.test.mjs`, `agent-identity.test.mjs`, `core-state-patch.test.mjs` | delete the model, harness, `.md`, manifest entry and Quint test together; drop the launcher from the three host tests' file lists | D20: its only purpose was the probes; a model of deleted code is not live |
| `scripts/start-local-voice-agent.ts` | `quint-lib.ts` list; `specs/quint/application/manifest.json` (`DevelopmentHost.sources`); tests `agent-identity.test.mjs`, `core-state-patch.test.mjs` | replaced by `ELIZA_PARADEE_ENABLED=1 npm run agent:local -- --port 47844`; drop it from the manifest `sources` row and the two test file lists | C5 |
| `scripts/with-test-mocks.ts` | `package.json` (`dev:ui`, `build:test-mocks`), `quint-lib.ts` list | inline `ELIZA_DEV_ALLOW_TEST_MOCKS=1` (POSIX; `test:browser:live` already relies on it) | D4 |
| `scripts/test-cloud-personal-flow.ts` | `test/adapter-contracts.test.mjs` | drop the row | D5 |
| `scripts/test-remote-protocol.ts` | `test/connection-contracts.test.mjs`, comment in `test/browser/connection-boundaries.production.spec.ts:412` | drop the row and the comment; lands with the renderer `RemoteProtocol` deletion (U-R5) | D5 |
| `scripts/test-tts-startup.ts`, `test-tts-worker-lifecycle.ts` | `test/tts-worker-lifecycle.test.mjs` | delete that shim | T5 (transplants of vendor source; D14 follow-up) |
| `scripts/test-own-notice-question.ts` | `test/own-notice-question.test.mjs` | delete that shim | T2; covered by `reminder-notice-question.spec.ts`, `gmail-notice-question.spec.ts`, Quint `OwnNoticeQuestion` |
| `scripts/test-google-accounts.ts` | `test/google-accounts.test.mjs` (the other hits are the event name `alpha:test-google-accounts`) | delete the shim; the stale-helper case (`:55-61`) goes to the Quint lifecycle harness (specs plan) | T3 |
| `scripts/test-inbox-saved-drafts.ts` | `test/inbox.test.mjs` | drop the row; its `cloud:production` refusal case moves into `test/integration/inbox-provider.test.ts` (test plan) | T3 |
| `scripts/test-browser-storage-format.ts` | `android-instrumentation.ts` `CAMPAIGN_RUNNERS` | add a `CLASS_REGISTRY` row for `BrowserStorageFormatInstrumentedTest` instead | C5 (17-line wrapper) |
| `scripts/ci/test-pending-recovery-phases.py` | `test/python-suites.test.mjs:26`, `resident-android.yml:570` | drop both; replacement is an import-based cleanup test after `pending-recovery-ui.py` gets `main(run=…)` (unit S9) | T2 (AST transplant) |
| `scripts/ci/reproduce-bun-spawn-seccomp.py` | `.github/workflows/bun-spawn-seccomp.yml` | delete the workflow; drop `bun-spawn-seccomp` from the regex at `scripts/ci/affected.ts:38` | P4 |
| `scripts/ci/reproduce-paradee-model.py` | `.github/workflows/reproduce-paradee-model.yml`, `test/ci-pin-bound-scripts.test.mjs:25-35` | delete the workflow and that test block | P4 (never run) |
| `scripts/ci/speech-candidate.ts` | `android-emulator.yml:307,325`, `ci/emulator-suite.ts`, `test/ci-emulator-evidence.test.mjs` | delete the unreachable `fused-speech` job and the `all` option; `FUSED_SPEECH_CLASSES` in `emulator-suite.ts`; the speech cases in `ci-emulator-evidence.test.mjs` | A4 (job refuses to run today) |
| `scripts/owner/emulator-campaign-check.ts` | `test/owner-emulator-campaign-check.test.mjs` | delete the test | A7 (#676 planning aid, source-text) |
| `.github/workflows/lemma-check.yml`, `digest-restart.yml` | — | Dafny runs in the `formal` lane; digest restart runs in `resident-prepare.yml:49` | P3/P4 |

### 1.2 Delete after a replacement lands (not before)

| File | Waits for | Then also delete |
|---|---|---|
| `scripts/prepare-quint-history.ts` | specs plan retires `specs/quint/legacy/**` and the `historicalProbe` campaigns in `refinement/native/{mms,sms}-dispatch.mjs` (+ `mms-historical-sources.json`) | `quint:prepare-history` (package.json, `browser.yml:130`), `test/quint-tla-inventory.test.mjs`, `'legacy'` in `quint-lib.ts:43,227`, `check-quint.ts:42`, `ci/check-changed-models.ts:20`, `check-quint-refinement.ts:67,82,152-154,195-201`, `test/quint-checker.test.mjs:32,83` |
| `scripts/check-quint-refinement.ts` | specs plan creates `specs/quint/refinement/run.mjs` | repoint `quint:refinement`; `browser.yml:214` keeps the npm name |
| `scripts/ci/calendar-bridge.py` | a `:app:qualifyCalendarBridge` task in `scripts/ci/calendar-bridge.init.gradle` (≈40 lines, runs the upstream `bridge-check.mjs` against the compiled plugin) | `android.yml:98,112,147-152` receipt steps; `HOST` case in `test/ci-pin-bound-scripts.test.mjs:12-22`; `runpy`/text reads in `test/resident-native-ci-admission.test.mjs:100,113`. Keep the init script (only host check of the Calendar bridge, D18) |
| `scripts/verify-packaged-runtime.py` | `scripts/packaged-runtime.ts` (port, called in-process by `verify-apks.ts`) producing byte-identical `runtimePackaging` JSON on one Android build | `test/packaged-runtime.test.py`; its readers' paths in `generate-sbom.ts`, `source-snapshot.ts`, Quint services manifest |
| Transplant and Playwright-in-a-script suites (§2.3) | the named journey case in the test plan | the shim row and the script |
| `scripts/inbox-adapter-fixture.ts`, `scripts/fixtures/calendar-adapter.ts`, `scripts/fixtures/prototype-script.ts`, `scripts/fixtures/playwright.ts` | their last importer in §2.3 is gone | `ALPHA_BROWSER_MODULES` in `test/browser/adapters.spec.ts`; delete `adapters.spec.ts` when its list is empty |
| `scripts/workflow-renderer-fixture.ts` | the four `test-workflow-*-ui-flow.ts` journeys **and** the specs plan's port of `specs/quint/refinement/services/workflow-adapter-fixture.mjs`; its helpers move to `test/support/workflow-agent.ts` | `test/fixtures/workflow-execution-fixture.mjs` import line |

### 1.3 Not deleted: owner-gated (listed in the PR, D16)

| File | Why it stays |
|---|---|
| `scripts/qualify-head.ts` (+ `test/qualify-head.test.mjs`, cases in `pilot-units.test.mjs`) | Only tie between emulator campaign evidence and APK bytes (`CAMPAIGNS`, `candidateManifest`); release-evidence decision |
| `scripts/owner/forged-branch-scan.ts`, `incident-access-audit.ts`, `incident-ci-exposure.ts`, `merge-review.ts`, `incident-2026-10-27-iocs.json` (+ `test/owner-incident-response.test.mjs`, `owner-merge-review.test.mjs`) | Incidents #658/#659 and secret rotation not confirmed closed |
| `scripts/scan-archived-apks.py` (+ `test/archive-scan.test.mjs`) | Only check that the provider key is absent from archived APK bytes |
| `scripts/build-notification-fixture.ts` + `test-cross-app-notifications.ts` | Only witness apps for the cross-app notification path; `gradle-verification.ts:57,284` hashes it as a dependency-resolution input |
| `.github/workflows/release-app-signing.yml` + `scripts/ci/build-app-signing-fixtures.py` | Protected release workflow |
| `scripts/ci/seal-signed-apks.py`, `publish-qualified-app-update.yml`, `ci/qualified-app-update.py`, `ci/admit-cloud-signing-input.py` | `runtimeProfile` `"cloud"` vs `"native"` mismatch is an owner release question |
| `scripts/start-combined-agent.ts`, `combined-agent-source.ts`, `start-cloud-qa.ts` | Live Quint models (D20); port 47858/47859 question |
| `scripts/deliver-app-update.ts` `checkLegacyFloor`, `update-channel.ts` `LEGACY_APP_UPDATE_TAG` | `app-stable` installs (D17-type device concern) |
| `scripts/developer-archive.ts`, `eval-device-action-clarification.ts` (its `--self-test` and `test/device-action-clarification-eval.test.mjs` **are** deleted, T5), `cloud-readiness.ts`, `record-release.ts`, `stage-os-update-enrollment.ts`, `generate-alpha-os-branding.ts`, `fetch-alpha-os-preset-inputs.py`, `vendor-lucide-icons.ts`, `owner/read-branch-integrity.ts`, `ci/read-required-checks.ts`, `owner/rulesets/*.json`, `ci/export-browser-proof.ts` | Manual operator tools named in README/runbooks or awaiting an owner answer |

---

## 2. Scripts that are really tests

Target layout (agrees with `research/tests-host.md` §10 and the test chunks):
`test/integration/<area>.test.ts` (real modules, loopback HTTP), `test/resident/<name>.test.ts` (needs the
prepared runtime; run by resident workflows, not by `npm test`), `test/live/<name>.test.ts` (real provider,
opt-in), `test/android/campaigns/<name>.ts` (manual emulator campaigns, not `node:test`), `test/<name>.test.py`
(Python, flat, one naming scheme). Each moved suite wraps its top-level asserts in `test()` and loses its
self-respawn-under-tsx block (`test-device-actions.ts:10-12`, `test-google-calendar-protocol.ts:5-7`,
`test-workflow-protocol.ts:5`). `scripts/run-node-tests.ts` globs `test/*.test.{mjs,ts}` and
`test/integration/*.test.ts` (not `test/**`: `test/fixtures/*.test.*` are not suites).

### 2.1 Move or merge (this plan writes the target)

| Source in `scripts/` | Target | Shim row / file deleted |
|---|---|---|
| `test-agent-calendar-mutation-flow.ts` | `test/integration/agent-calendar.test.ts` | `test/agent-calendar-mutation.test.mjs` |
| `test-agent-speech-bridge.ts` + `test-agent-tts-bridge.ts` | `test/integration/local-agent-speech-bridge.test.ts` | 2 rows in `test/local-agent-contracts.test.mjs` |
| `test-batch-progress-stream.ts` + `test-batch-voice-progress-ack.ts` | `test/integration/voice-progress.test.ts` (drop `ALPHA_ACK_HOST_ROOT`; also from `test/batch-ack-shell-retirement.test.mjs`) | `test/batch-progress-stream.test.mjs`, `test/batch-voice-progress-ack.test.mjs` |
| `test-calendar-availability-flow.ts` (drop T1 lines 57-65) + `test-calendar-availability-provider-rows.ts` | `test/integration/calendar-availability.test.ts` | `test/calendar-availability.test.mjs`; the spawn case in `test/calendar-availability-reader.test.mjs` |
| `test-cloud-maps.ts` | `test/integration/maps-cloud.test.ts` | row in `adapter-contracts.test.mjs` |
| `test-cloud-protocol.ts` (minus D5 agent parts) + `test-cloud-subscription.ts` + protocol half of `test-gmail-mailbox.ts` + live half of `test-google-calendar-protocol.ts` | `test/integration/cloud-protocol.test.ts` | 4 rows in `adapter-contracts.test.mjs` |
| `test-device-actions.ts` + `scripts/fixtures/device-action-journal.ts` (inlined) | `test/integration/device-actions.test.ts` | row in `adapter-contracts.test.mjs` |
| `test-local-digest-storage.ts` + `test-digest-cancellation.ts` + `scripts/fixtures/hosted-digest-protocol.ts` (inlined) | `test/integration/digests.test.ts` | 2 rows in `local-agent-contracts.test.mjs` |
| `test-local-agent.ts` + `test-local-agent-stream.ts` (minus `RemoteProtocol`, D5) + `test-resident-reuse.ts` | `test/integration/local-agent.test.ts` | 2 rows in `local-agent-contracts.test.mjs` (file deleted when empty); `test/resident-attachment.test.mjs:21-23` |
| `test-maps-device-navigation.ts` (delete T1 lines 109-130) | `test/integration/maps-navigation.test.ts` | row in `adapter-contracts.test.mjs` |
| `test-workflow-protocol.ts` | `test/integration/workflows.test.ts` | row in `adapter-contracts.test.mjs`; comment in `test/browser/workflow-missed-run-now.spec.ts:21` |
| `test-local-digest-restart.ts` (drop `result.json`) | `test/resident/digest-restart.test.ts` | `test/digest-restart-input.test.mjs` |
| `test-mobile-workflow-bundle.ts` | `test/resident/mobile-workflow-bundle.test.ts` | — |
| `test-workflow-compiler.ts` (import `COMPILER_PROGRAM`, no regex) | `test/resident/workflow-compiler.test.ts` | — |
| `test-workflow-worker.ts` | `test/resident/workflow-worker.test.ts` | — |
| `test-native-cloud-runtime-config.ts` + `native-cloud-runtime-config-check.ts` | `test/resident/native-cloud-runtime-config.test.ts` | — (`resident-android.yml:312` repointed) |
| `check-cloud-recording-signature.ts` | `test/resident/cloud-recording-signature.test.ts` | `resident-prepare.yml:34` step runs it via `node --test`; drop the duplicate call in `test/cloud-voice-profile.test.mjs` |
| `test-local-redaction.ts` | `test/live/redaction.test.ts` (skips unless `ALPHA_LIVE_REDACTION=1`) | `agent:test-redaction` alias |
| `test-local-agent-source.ts` + `test-device-timing-source.ts` | `scripts/run-upstream-source-tests.ts` (suites `workspace`, `device-actions`; stays a script: it runs upstream suites in the prepared tree) | aliases `agent:test`, `agent:test-device-timing` → `agent:test-upstream` |
| `test-photo-filter-png-reference.ts` | rename `scripts/generate-photo-filter-goldens.ts` (it is a generator) | update `source` field in `android/app/src/androidTest/assets/photo-filter-goldens.json` |
| `scripts/fixtures/loopback.ts` | `test/support/loopback.ts` | `eval-device-action-clarification.ts` import repointed |
| `scripts/fixtures/bundled-module.ts` + `fixtures/local-agent-stream.ts` | `test/support/bundle-module.ts` | — |
| `scripts/fixtures/inbox-memory.ts` | `test/support/memory-slot-store.ts` | — |
| `scripts/fixtures/speech-bridge.ts` | `test/support/speech-bridge.ts` | — |
| `scripts/fixtures/cloud-delegation/**`, `fixtures/hosted-live-source/**` | `test/fixtures/component-pages/{cloud-delegation,hosted-live-source}/` (only importers: `test-cloud-delegation.ts`, `test-hosted-live-source-picker.ts`, whose journeys load them) | — |

### 2.2 Python tests

| Source | Target | Runner change |
|---|---|---|
| `scripts/ci/test-recovery-ui-guard.py` + `ci/fixtures/recovery-dismiss-52ab-v2.json`, `recovery-idle-52ab.json`, `recovery-policy-52ab.txt`, `recovery-storage-e4d-pass.txt` | `test/recovery-ui-guard.test.py`; fixtures to `test/fixtures/android-recovery/{keyguard-dismiss,idle-transition,user-switch-policy,instrumentation-pass}-api35.*` (bytes unchanged) | `python-suites.test.mjs:25` uses `run()` with `scripts/ci` on `sys.path`; delete `resident-android.yml:567-570` step |
| `scripts/ci/test-resident-phase.py` | `test/resident-phase.test.py` (skip off Linux instead of requiring `GITHUB_ACTIONS`) | add to `python-suites.test.mjs`; delete `resident-prepare.yml:31` and `resident-android.yml:244` |
| `scripts/ci/test-resident-uid-crash-audit.py` | `test/resident-uid-crash-audit.test.py` | add to `python-suites.test.mjs`; delete `test/resident-crash-diagnostics.test.mjs` |
| `scripts/ci/test-acquire-resident-bun.py` | `test/acquire-resident-bun.test.py` (2 transport cases) | add to `python-suites.test.mjs`; delete `resident-android.yml:209` |
| `scripts/ci/release-custody-proof.test.py` | `test/release-custody-proof.test.py` | `release-custody-proof.yml:46` path; also in `python-suites.test.mjs` |
| `scripts/ci/sign-os-ota.test.py` | `test/sign-os-ota.test.py` | `release-os-ota-signing.yml:74` path; also in `python-suites.test.mjs` |
| `scripts/maps/test-dataset-manifest.py` | `test/maps-regional-gateway.test.py` | add to `python-suites.test.mjs`; delete `test/maps-dataset-manifest.test.mjs` |
| `test/embedding-artifact-inputs.test.py`, `test/hosted-native-inputs.test.py` (already in `test/`) | — | add to `python-suites.test.mjs`; delete `resident-android.yml:197-198` |

### 2.3 Transplants and script-hosted browser tests: delete after the test plan's replacement

Each script is deleted, with its shim row, in the commit that adds the named case.

| Script | Replacement (test plan) | Shim |
|---|---|---|
| `test-agent-camera-flow.ts` | `journeys/camera-photos.spec.ts` + case in `test/integration/device-actions.test.ts` | `test/agent-camera-capture.test.mjs` |
| `test-agent-context-browser.ts` | `journeys/chat.spec.ts`, `journeys/camera-photos.spec.ts`; sanitiser cases → `test/integration/phone-context.test.ts` | `adapters.spec.ts` row |
| `test-browser-bookmark-recovery.ts` | `journeys/browser.spec.ts` | `adapters.spec.ts` row |
| `test-calendar-crud-review.ts`, `test-calendar-query-race.ts` | `journeys/calendar.spec.ts` (5 cases) | 2 `adapter-contracts` rows |
| `test-canonical-notification-navigation.ts` | `journeys/notifications.spec.ts` (5 cases) | `test/canonical-notification-navigation.test.mjs` |
| `test-cloud-delegation.ts`, `test-cloud-delegation-return.ts` | `journeys/connection-cloud.spec.ts` | 2 `adapters.spec.ts` rows |
| `test-cloud-voice-cancellation-flow.ts`, `test-cloud-voice-flow.ts` | `journeys/voice.spec.ts`, `journeys/notes.spec.ts` | 2 `adapter-contracts` rows |
| `test-connection-history.ts` | `journeys/chat.spec.ts` + `test/integration/local-agent-observation.test.ts` (4 cases) | `test/connection-contracts.test.mjs` (deleted when empty); comment `test/workflow-device-bindings-fixture.test.mjs:5` |
| `test-hosted-live-source-picker.ts` | `journeys/digests.spec.ts` | `adapters.spec.ts` row |
| `test-inbox-attention-flow.ts`, `test-inbox-cloud-flow.ts`, `test-inbox-drafts-browser.ts`, `test-inbox-retention-cases.ts`, `test-mail-html.ts` | `journeys/inbox.spec.ts` | `inbox.test.mjs` rows, `adapter-contracts` row, `adapters.spec.ts` row, `test/inbox-retention-cases.test.mjs`, `test/mail-html.test.mjs` |
| `test-inbox-grant-withdrawal.ts`, `test-inbox-sent-cleanup.ts`, `test-inbox-multiple-drafts.ts`, `test-gmail-read-ahead.ts` | PORT to real imports in `test/integration/inbox-provider.test.ts` (needs the adapter export from `inbox-cloud-adapter.ts`) | 2 `adapter-contracts` rows, `inbox.test.mjs` (deleted when empty), `test/gmail-read-ahead.test.mjs` |
| `test-maps-context-browser.ts`, `test-maps-reroute-freshness.ts` | `journeys/maps.spec.ts` | `adapters.spec.ts` row, `test/maps-reroute-freshness.test.mjs` |
| `test-reminder-time-flow.ts` | `journeys/reminders.spec.ts` (DST gap) | `adapter-contracts` row |
| `test-workflow-approval-ui-flow.ts`, `test-workflow-lifecycle-ui-flow.ts`, `test-workflow-metadata-ui-flow.ts`, `test-workflow-ui-flow.ts` | `journeys/workflows.spec.ts` on `test/support/workflow-agent.ts` | 4 `adapter-contracts` rows; `test/adapter-contracts.test.mjs` deleted when empty, with `test/fixtures/child-suite.mjs` |

### 2.4 Manual Android campaigns: move, do not wire (owner question stays open)

| Source | Target |
|---|---|
| `test-native-permissions.ts` | `test/android/campaigns/permissions.ts` (unexport `cases`) |
| `test-native-restart.ts` (drop `notes-secure-migration`, D1) | `test/android/campaigns/restart.ts` |
| `test-calendar-regression.ts` | `test/android/campaigns/calendar-regression.ts` |
| `test-native-calendar-deletion-restart.ts` | `test/android/campaigns/calendar-deletion-restart.ts` |
| `test-reminder-one-off.ts`, `test-reminder-recurrence.ts`, `test-reminder-recovery.ts`, `test-reminder-recurrence-recovery.ts`, `reminder-recovery-fixture.ts` | `test/android/campaigns/reminders.ts` (`--recurring`, `--recovery`) |
| `test-installed-upgrade.ts` (drop calendar, `--bridge`, legacy digest; registry row `WorkflowLegacyReminderUpgrade`) | `test/android/campaigns/installed-upgrade.ts` |
| `test-cross-app-notifications.ts` | `test/android/campaigns/cross-app-notifications.ts` |
| `maps/test-native-navigation.ts` + `maps/test-native-recovery.ts` | `test/android/campaigns/maps-regional.ts` |
| `android-workflow-native.ts`, `android-resident-instrumentation.ts`, `native-voice-latency-emulator.ts` | `test/android/campaigns/{workflow-native,resident-egress,voice-latency}.ts` |
| `native-test-fixture.ts` (fix cwd-relative `app.config.json` read; absorb `until`, `pidof`, `setPermission`, `instrumentExpectingCrash` from permissions/restart) | `test/android/campaigns/fixture.ts` |

Deleted with the move (T5 tests of the harness): `test/native-permission-runner.test.mjs`,
`native-restart-runner.test.mjs`, `native-reminder-runner.test.mjs`, `native-reminder-recovery-runner.test.mjs`,
`installed-upgrade-runner.test.mjs`, `calendar-regression-runner.test.mjs`, `test/fixtures/isolated-native-campaign.mjs`.
Comments that name the old paths: `MapsBackgroundNavigationInstrumentedTest.java:16`,
`ResidentEgressRedactionInstrumentedTest.java`, `WorkflowApprovalNoticeProcessDeathInstrumentedTest.java`,
`ReminderRecovery*InstrumentedTest.java`, `CalendarFlowInstrumentedTest.java`, `HomeCalendarCardInstrumentedTest.java`
(comment lines only). `scripts/instrumentation-result.ts` and `scripts/android-instrumentation.ts` stay (product
tooling, run by `test:android:instrumentation`).

---

## 3. Merges and `scripts/lib`

### 3.1 New shared modules

No argument-parsing module: every CLI calls `parseArgs` from `node:util` with `strict: true` (a wrapper would
be a pass-through, D4). `scripts/lib/` stays dependency-free (no `vendor/` import), like `apps/app/src/lib/`
(RECOMMENDATIONS R2).

| Module | Exports | Replaces (current sites) |
|---|---|---|
| `scripts/lib/hash.ts` | `sha256Hex(bytes)`, `sha256File(file): {size, sha256}` (64 KiB streamed) | `update-artifact.ts` (whole file; importers `app-update-candidate`, `deliver-app-update`, `provision-unit`, `publish-update-manifest`, `update-apk-admission`); private copies `android-resident-instrumentation.ts:20`, `android-stage-voice-models.ts:44`, `android-workflow-native.ts:87`, `aosp-pixel10a.ts:31`, `app-update-candidate.ts:53`, `build-embedding-host.ts:28`, `ci/export-browser-proof.ts:10`, `core-state-patch.ts:29`, `deliver-app-update.ts:44,66`, `eval-device-action-clarification.ts:87`, `generate-alpha-os-branding.ts:42`, `host-speech-admission.ts:20`, `maps/test-native-{navigation,recovery}.ts:12`, `mobile-uuid-adapter.ts:13`, `paradee-runtime.ts:20`, `pixel10a-source-contract.ts:11`, `prepare-embedding-host.ts:49,55`, `stage-embedding-host.ts:8`, `stage-os-update-enrollment.ts:20`, `test-cross-app-notifications.ts:24`, `test-installed-upgrade.ts:51`, `update-channel.ts:18`, `vendor-lucide-icons.ts:23`, `voice-host.ts:150`, four inline hashes in `verify-apks.ts`. Exported copies (have `test/`/`specs/` importers; unit S10, `quint-lib.ts` in S11): `generate-licenses.ts:144 sha256`, `quint-lib.ts:110 sha256`, `local-agent-source.ts:9 digest`, `combined-agent-source.ts:5 sha`, `upstream-native-source.ts:5 sha`, `workflow-worker-artifact.ts:10 workerHash` |
| `scripts/lib/git.ts` | `git(cwd, args, {allowFailure?, raw?})` with `maxBuffer` 64 MiB | `android-build-preflight.ts:70`, `app-update-candidate.ts:69`, `build-embedding-host.ts:127`, `ci/export-browser-proof.ts:11` (keeps its `--no-replace-objects` flags as args), `combined-agent-source.ts:29`, `developer-archive.ts:87`, `eval-device-action-clarification.ts:88`, `local-agent-source.ts:71`, `paradee-runtime.ts:32`, `prepare-embedding-host.ts:22`, `stage-embedding-host.ts:59`, `upstream-native-source.ts:37`, `qualify-head.ts:313`, `owner/forged-branch-scan.ts:31`, `owner/merge-review.ts:148-150` (the last three only if kept, §1.3) |
| `scripts/lib/gh.ts` | `gh(args, {allowMissing?})`, `ghJson<T>(path)` | `app-update-candidate.ts:78`, `deliver-app-update.ts:91`, `owner/gh-readonly.ts` `ghGet`/`ghGetAll` (its IOC half stays with the incident tools) |
| `scripts/lib/fs.ts` | `readJson<T>(file)`, `walkFiles(root, accept?)` (regular files, no symlink follow, sorted), `assertNoSymlinkPath(root, rel)`, `readPrivateFile(path, {maxBytes})` (O_NOFOLLOW, owner-only), `repositoryRoot` | readJson: `android-build-preflight.ts:230`, `app-update-candidate.ts:54`, `build-embedding-host.ts:29`, `cloud-readiness.ts:50`, `enroll-release-keys.ts:78`, `generate-licenses.ts:142`, `mobile-uuid-adapter.ts:14`, `quint-lib.ts:153`, `runtime-profile.ts:8`, `voice-host.ts:65`. Walkers: `regular-files.ts` (whole file; importers `audit-production-bundle.ts`, `font-license-blockers.ts`), `quint-lib.ts:98 filesWithin`, `android-gzip-assets.ts:26,51`, `generate-licenses.ts:155,419`, `generate-sbom.ts:207`, `paradee-runtime.ts:82`, `prepare-client-features.ts:25`, `prepare-patched-native.ts:19`, `ci/export-browser-proof.ts:112`. Private file: `dev-cartesia.ts`, `dev-speech-settings.ts:18-33`, `cloud-resident-host.ts:93-95`, `local-agent-dev-bridge.ts`, `gmail-agent-dev-broker.ts`. Repo root: the 9 spellings (`path.resolve(import.meta.dirname,'..')` ×25 etc.) |
| `scripts/lib/app-identity.ts` (U-L7) | `appIdentity` (JSON import of `app.config.json`), `readAppIdentity(root)` | readers in `android-host.ts` (×5), `aosp-secure-camera-contract.ts`, `app-update-candidate.ts` (×2), `build-android.ts` (×2), `build-archive.ts`, `cloud-deployment.ts`, `cloud-email-code.ts`, `cloud-readiness.ts` (×2), `deliver-app-update.ts`, `generate-sbom.ts` (×2), `native-test-fixture.ts`, `prepare-ci-emulator.ts`, `prepare-embedding-host.ts`, `publish-update-manifest.ts`, `render-assetlinks.ts`, `source-snapshot.ts`, `stage-aosp.ts` (×3), `stage-embedding-host.ts` (×2), `stage-local-agent-sources.ts`, `test-calendar-regression.ts`, `test-cross-app-notifications.ts`, `test-installed-upgrade.ts`, `update-apk-admission.ts`, `verify-aosp-listener.ts`, `verify-apks.ts`, `verify-cuttlefish-launcher.ts`, `voice-host.ts`; hard-coded `ai.alphacompute.alphaphone` in `android-instrumentation.ts:46` and the campaign scripts. Drop self-assertions `android-workflow-native.ts:86`, `test-calendar-regression.ts:58`, `native-test-fixture.ts:113`; dead tablet branch `prepare-ci-emulator.ts:67-69`. Test fixtures that stage a temp root call `readAppIdentity(root)`: `test/fixtures/app-update-candidate.mjs`, `voice-host-product.mjs`, `resident-java-source-stage.mjs` |
| `scripts/lib/upstream-lock.ts` | `readUpstreamLock(root = repositoryRoot): {commit, …}` (moved from `local-agent-source.ts:11`) | 30 readers: `android-build-preflight.ts` (×5), `verify-upstream.ts` (×3), `generate-sbom.ts` (×3), `qualify-head.ts` (×3), `voice-host.ts`, `start-local-remote.ts`, `prepare-local-agent.ts`, `paradee-runtime.ts`, `native-google-host-artifact.ts`, `ci/export-browser-proof.ts`, `app-update-candidate.ts` (×2 each), and one each in `verify-apks.ts`, `upstream-native-source.ts`, `stage-local-agent-sources.ts`, `stage-embedding-host.ts`, `source-snapshot.ts`, `quint-lib.ts`, `prepare-embedding-host.ts`, `pinned-upstream-source.ts`, `mobile-uuid-adapter.ts`, `generate-licenses.ts`, `eval-device-action-clarification.ts`, `core-state-patch.ts`, `cloud-resident-host.ts`, `ci/check-changed-models.ts`, and the moved suites `digest-restart`, `redaction`, `native-cloud-runtime-config` |
| `scripts/toolchain.ts` (existing, extended, path unchanged: 28 importers) | add `adb(serial)`, `type Adb`, `BUILD_TOOLS = '36.0.0'`, memoised `androidEnv()`; `PINNED_BUN_VERSION = '1.4.2'` | `Adb` in `ci/emulator-suite.ts:50`, `android-instrumentation.ts:85`, `provision-unit.ts:74`, `pilot-update.ts:49`; `adbFor` `provision-unit.ts:207`; 27 `ANDROID_HOME ??` resolutions; `build-embedding-host.ts:97 resolveSdk`; hard-coded build-tools in `build-notification-fixture.ts:17`; the six `'1.4.2'` literals |
| `scripts/ci/ci_common.py` | `require`, `HEX`/`COMMIT`, `sha256_file`, strict JSON load, bounded subprocess read | 8 `require` copies in `scripts/ci`; `sha256` in `sign-os-ota.py:33`, `qualified-app-update.py:52`, `seal-signed-apks.py:18`, `hosted-native-inputs.py`, `private-apk-storage.py`. **Not** `release-custody-proof.py` (SHA-pinned by `release-custody-proof.yml` `proof_sha256`; change at the next rotation) |
| `scripts/ci/github_download.py` | redirect-safe authenticated download with streaming SHA-256 | `acquire-resident-bun.py:16-77`, `embedding-artifacts.py:45-119` |

Types that get one owner: `ApkManifest` → export `ManifestFacts` from `scripts/apk.ts` (copies `generate-sbom.ts:91`,
`provision-unit.ts:56`, `qualify-head.ts:83`); `UpdateOffer` → `update-channel.ts` (copies `deliver-app-update.ts:17`,
`app-update-candidate.ts:21`); `ManifestNode` → `apk.ts` (copy `render-assetlinks.ts:54`); `Ruleset` → `owner/gh-readonly.ts`.

### 3.2 File merges (target ← sources)

| Target | Sources (deleted) | Path pins updated in the same commit |
|---|---|---|
| `scripts/agent-profile.ts` | `agent-embeddings.ts`, `agent-identity.ts`, `agent-model.ts` | importers `start-local-remote.ts`, `start-combined-agent.ts`, `start-cloud-qa.ts`, `cloud-resident-host.ts`, `eval-device-action-clarification.ts`; `specs/quint/services/manifest.json:2087-2138`; `refinement/services/combined-agent-launcher{,-probe}.mjs`; `apps/app/src/product/native-cloud-runtime.ts:9` comment; tests `agent-identity`, `agent-model-selection`, `agent-embedding-overrides`, `fixtures/agent-identity-canonical.test.ts`, `fixtures/product-character-host.mjs` |
| `scripts/private-runtime-launch.ts` (gains `launchPrivateDevServer`, profile/port/key/token block) | `launcher-child.ts`; the copied block in `start-local-remote.ts:28-40`, `start-combined-agent.ts:26-35`, `start-cloud-qa.ts:15-27` | services manifest and the launcher harness `support` lists (`combined-agent-launcher*.mjs`, `cloud-qa-launcher*.mjs`) |
| `scripts/start-local-remote.ts` (flags `--port`, voice via `ELIZA_PARADEE_ENABLED`) | `dev-cartesia.ts`, `start-local-voice-agent.ts` | `test/dev-cartesia.test.mjs` import |
| `scripts/host-speech-admission.ts` | `speechMode` from `speech-env.ts` (file deleted after §1.1 table removal) | `combined-agent-launcher*.mjs` support lists |
| `scripts/cloud-deployment-policy.ts` | `cloud-sdk-authority.ts` | `specs/quint/services/manifest.json`, `refinement/application/boundaries.mjs`, `refinement/services/cloud-qa-launcher{,-probe}.mjs`; `test/cloud-sdk-routing.test.mjs` |
| `scripts/prepare-embedding-host.ts` | `embedding-build-remap.ts` | `test/embedding-host-preparation.test.mjs` |
| `scripts/verify-apks.ts` | `release-distributable.ts` | `test/font-license.test.mjs`, `test/release-signing.test.mjs` imports |
| `scripts/native-google-host-artifact.ts` (`--verify-staged`) | `runtime-profile.ts` | `android/app/product.gradle`, `resident-android.yml`, `android-build-preflight.ts`; export the input list and import it in `refinement/services/native-google-host-artifact{,-probe}.mjs:41,37` |
| `scripts/prepared-workflow-worker.ts` | CLI of `build-workflow-worker.ts` (file stays as a 3-line Bun entry only if `bun` needs a file; otherwise `agent:build-workflow-worker` → `bun scripts/prepared-workflow-worker.ts build`) | `specs/quint/services/manifest.json` sources |
| `scripts/stage-local-agent-runtime.ts` imports `stageWorkflowWorker()` | `stage-workflow-worker.ts` CLI (spawned today) | `agent:stage-workflow-worker` alias deleted |
| `scripts/aosp-tools.ts` (subcommands `retain-known-good`, `release-record`, `listener-systemui`, `verify-clock`, `verify-listener`, `verify-secure-camera`, `verify-launcher --target cuttlefish\|pixel10a`) | `aosp-ota-update.ts`, `aosp-release-record.ts`, `aosp-listener-systemui.ts`, `verify-aosp-clock.ts`, `verify-aosp-listener.ts`, `verify-aosp-secure-camera.ts`, `verify-cuttlefish-launcher.ts`, `verify-pixel10a-image.ts` | `aosp:retain-known-good`; tests `aosp-retain-known-good`, `aosp-release-signing`, `aosp-listener`, `aosp-listener-systemui` imports; delete stub-adb tests `cuttlefish-launcher-postboot.test.mjs`, `pixel10a-image.test.mjs` (T3) |
| `scripts/stage-aosp.ts` | `aosp-cuttlefish.ts` (18 lines); `verify-pixel10a-source.ts` (stage-aosp already calls `verifyPixel10aSource`) | `test/aosp-cuttlefish.test.mjs` import |
| `scripts/verify-upstream.ts` | reachability half of `pinned-upstream-source.ts` (lines 32-109) | `test/upstream-reachability.test.mjs` |
| `scripts/dev-server/` folder (stage F move): `browser-cloud.ts` (from `browser-cloud-dev-bridge.ts`), `cloud-resident-host.ts`, `cloud-email-code.ts`, `local-agent-bridge.ts`, `local-agent-storage.ts`, `gmail-agent.ts` (merges `gmail-agent-dev-broker.ts` + `gmail-agent-read-host.ts`), `lib.ts` (loopback same-origin check) | the seven files | `vite.config.ts:2,11`; `specs/quint/application/manifest.json` symbol pins on the cloud bridge (must become imports first, specs plan); `refinement/services/development-digest-pending*.mjs`; `test/fixtures/product-character-host.mjs`; ~12 host-test import paths |
| `vite-plugins/static-assets.ts`, `vite-plugins/full-reload.ts` (next to `vite.config.ts`) | `browser-pdf-assets.ts` + `local-ocr-assets.ts`; `browser-full-reload.ts` | `vite.config.ts:3-5`; OCR path lists in `refinement/application/canonical-calendar-draft-handoff.mjs:14` |
| `test/browser/storage-specs.ts` (pruned of deleted specs) | `scripts/storage-specs.ts` | `playwright.config.ts:5`, `scripts/ci/affected.ts:28`, `qualify-head.ts`; delete `test/playwright-projects.test.mjs` |
| `scripts/check-quint.ts --changed-since=<rev>` | `scripts/ci/check-changed-models.ts` | `quint:changed`; delete `test/quint-changed-models.test.mjs` |
| `scripts/ci/resident_emulator.py` | shared prelude of `resident-native.py` / `pending-recovery-ui.py`, `resident_absence.py` | — |
| `scripts/ci/resident_crash.py` | `resident_crash_diagnostic.py` + `resident_uid_crash_audit.py` | `test/resident-crash-diagnostic.test.py` import |
| `scripts/ci/resident_fixture.py` | `resident_native_source.py` (drop its self-hash of `local-agent-source.ts`/`stage-local-agent-sources.ts`) | `test/resident-native-ci-admission.test.mjs` |
| `scripts/owner/read-branch-rules.ts` | `owner/read-branch-integrity.ts` + `ci/read-required-checks.ts`; `ci/required-checks-ruleset.json` → `scripts/owner/` | delete `test/ci-ruleset-readback.test.mjs` |
| `scripts/ci/prepare-emulator.ts` (`--webview` mode) | `prepare-ci-emulator.ts`, `prepare-ci-webview.ts` | `resident-android.yml`, `ci/emulator-suite.ts` |
| `scripts/licences/` (`collect.ts` one inventory pass; `notices.ts`, `sbom.ts` renderers; outputs byte-identical) | `generate-licenses.ts` (1,038 lines), `generate-sbom.ts` | `licenses:packaged-runtime`; `gradle-verification.ts:57` input list; `verify-apks.ts`, `build-android.ts`, `sign-release-apks.ts` importers; `THIRD_PARTY_NOTICES.txt` header comment |
| `scripts/upstream-core-sources.json`, `scripts/upstream-mobile-build.json` | `upstream-core-sources.ts`, `upstream-mobile-build.ts` (data in TS) | `core-state-patch.ts`, `mobile-uuid-adapter.ts`, `source-snapshot.ts`, `verify-packaged-runtime.py` (or its TS port), refinement `combined-agent-launcher.mjs`; one re-stage (receipt hashes change) |

---

## 4. `package.json` scripts after cleanup

65 entries today → 44. All seven `pre*` hooks go. Entry points that a person or a webServer starts prepare
the client features inline; building blocks (`build`, `typecheck`, `test`) do not, and `verify` prepares once
(this removes every `--ignore-scripts`). `upstream:prepare-client` takes ~65 s even when nothing changed
(measured 2026-11-11), so it must not run once per building block.

| Name | Command | Used by |
|---|---|---|
| `dev` | `node scripts/dev-local.ts` | README; `dev-local.ts` prepares in-process (fix its false comment at :11) |
| `dev:ui` | `npm run upstream:prepare-client && ELIZA_DEV_ALLOW_TEST_MOCKS=1 vite --host 127.0.0.1` | `playwright.config.ts:39` webServer, README |
| `dev:cloud` | `node scripts/dev-cloud.ts` | README, `docs/runbooks/667-maps-provider-coverage.md` |
| `dev:maps` | `npm run upstream:prepare-client && node scripts/maps/dev.ts` | developers (usage in `maps/dev.ts`) |
| `upstream:prepare-client` | `node scripts/prepare-client-features.ts` | 6 workflows, `playwright.config.ts:45`, `verify`, the entry points above |
| `build` | `vite build` | `verify:web` |
| `build:test-mocks` | `npm run upstream:prepare-client && ELIZA_DEV_ALLOW_TEST_MOCKS=1 vite build` | `browser.yml:224` (args after `--` reach `vite build`) |
| `audit:bundle` | `node scripts/audit-production-bundle.ts web-dist` | `verify:web` |
| `typecheck` | `tsc --noEmit && node scripts/typecheck-scripts.ts` | `verify:static`, README:29 |
| `test` | `node scripts/run-node-tests.ts` | `verify`, `resident-prepare.yml`, developers |
| `verify:static` | `node scripts/cloud-deployment.ts --check && npm run typecheck` | `verify`; CI `static` lane |
| `verify:formal` | `npm run quint:check && npm run lemma:check` | `verify`; CI `formal` lane |
| `verify:web` | `npm run build && npm run audit:bundle` | `verify`; CI `production` lane |
| `verify` | `npm run upstream:prepare-client && npm run verify:static && npm test && npm run verify:formal && npm run verify:web` | AGENTS.md, README, `docs/runbooks/667…`, `specs/quint/verification.md` |
| `android:sync` | `npm run upstream:prepare-client && vite build && cap sync android && node scripts/android-gzip-assets.ts protect` | message in `android-gzip-assets.ts` |
| `android:host` | `node scripts/android-host.ts` | README |
| `android:build` | `node scripts/build-android.ts` | `android.yml`, `android-emulator.yml`, AGENTS.md, README |
| `android:build:inputs` | `node scripts/android-build-preflight.ts --report` | README |
| `android:build:local` | unchanged chain (`--before-prepare`, `agent:build-embedding-host`, `agent:prepare`, `agent:build-workflow-worker`, `agent:stage-android`, `licenses:packaged-runtime`, `android:build`) | AGENTS.md, README |
| `android:verify` | `node scripts/verify-apks.ts` | `publish-qualified-app-update.yml`, README |
| `android:deps:write-verification` | `node scripts/gradle-verification.ts --write` | README, preflight message |
| `licenses:packaged-runtime` | `node scripts/licences/notices.ts --packaged-runtime` (until the split: `node scripts/generate-licenses.ts --packaged-runtime`) | `android:build:local` |
| `test:android:instrumentation` | `node scripts/android-instrumentation.ts` | README, `ci/emulator-suite.ts` |
| `test:browser` | `playwright test --project=chromium` | `browser.yml`, README |
| `test:browser:production` | `playwright test --project=production` | `browser.yml`, README |
| `aosp:stage` | `node scripts/stage-aosp.ts` | `android.yml`, README |
| `aosp:retain-known-good` | `node scripts/aosp-tools.ts retain-known-good` | operator (OTA runbook) |
| `agent:local` | `node scripts/start-local-remote.ts` | `dev-local.ts` spawns the same file; the voice launcher's replacement |
| `agent:prepare` | `node scripts/prepare-local-agent.ts` | workflows, README, preflight |
| `agent:build-workflow-worker` | `bun scripts/build-workflow-worker.ts` (see §3.2) | `resident-*.yml`, `android:build:local` |
| `agent:stage-android` | `node scripts/stage-local-agent-runtime.ts` | `resident-android.yml`, `android:build:local` |
| `agent:build-embedding-host` | `node scripts/build-embedding-host.ts` | `android:build:local` |
| `agent:test-upstream` | `node scripts/run-upstream-source-tests.ts` | `resident-android.yml:310` (was `agent:test-device-timing`) |
| `agent:test-digest-restart` | `node --test test/resident/digest-restart.test.ts` | `resident-prepare.yml:49` |
| `agent:test-mobile-workflow-bundle` | `node --test test/resident/mobile-workflow-bundle.test.ts` | `resident-android.yml:329` |
| `agent:test-workflow-compiler` | `node --test test/resident/workflow-compiler.test.ts` | `resident-android.yml:313` |
| `agent:test-workflow-worker` | `node --test test/resident/workflow-worker.test.ts` | `resident-android.yml:314` |
| `quint:check` | `node scripts/check-quint.ts check` | `verify:formal`, `specs/quint/README.md` |
| `quint:verify` | `node scripts/check-quint.ts verify` (also runs a model's declared temporal properties; 1 services model has one) | nightly `quint-verify` job |
| `quint:changed` | `node scripts/check-quint.ts verify --changed-since=${ALPHA_QUINT_BASE:-HEAD^}` | `browser.yml` `formal` job, README:36 |
| `quint:refinement` | `node specs/quint/refinement/run.mjs` (after the move) | `browser.yml:214` |
| `lemma:check` | `node scripts/check-lemma.ts` | `verify:formal`, `specs/lemma/README.md` |
| `lemma:regen` | `lsc gen --backend=dafny` | `specs/lemma/README.md` |
| `icons:vendor` | `node scripts/vendor-lucide-icons.ts` | regeneration of `apps/app/public/icons/lucide` (gives the no-caller tool a documented entry) |

Removed (26): `dev:local` (= `dev`), `test:browser:storage` and `test:browser:live` (CI calls Playwright
directly), `upstream:verify` (CI calls the script), `aosp:verify-secure-camera` (subcommand of `aosp-tools.ts`),
`agent:test`, `agent:test-device-timing` (→ `agent:test-upstream`), `agent:test-redaction` (opt-in test file),
`agent:stage-workflow-worker`, `android:deps:check`, `sbom` (no caller; `build-android.ts` generates it),
`predev`, `predev:ui`, `prebuild`, `pretypecheck`, `pretest`, `predev:maps`, `prebuild:test-mocks`,
`quint:prepare-history` (with legacy), `quint:typecheck`, `quint:test`, `quint:simulate` (subsets of `check`),
`quint:temporal` (folded into `verify`), `quint:compare` (legacy only), `quint:conformance` (`npm test` runs the
same files), `typecheck:scripts` (`typecheck` calls the script). Update `specs/quint/README.md` and README:29 for
the removed names.

Same-change edits: `scripts/run-node-tests.ts` drops its `ALPHA_TEST_CONCURRENCY` validation (node validates
it) and globs `test/*.test.{mjs,ts}` + `test/integration/*.test.ts`; delete `test/node-test-runner.test.mjs`;
`resident-prepare.yml:36` comment ("gets them from its pretest hook") is rewritten. Owner questions carried to
the PR: devDependencies `@noble/hashes`, `adze`, `dotenv`, `json5`, `markdown-it`, `pg` have no importer outside
`vendor/`; `^` ranges on `@fontsource/*`, `@types/*`, `esbuild` while everything else is exact.

---

## 5. `typecheck-scripts.ts` fix

**Measured 2026-11-11:** `tsc -p tsconfig.scripts.json` reports 200 errors, **all 200 in `vendor/eliza`**: 129 in
`packages/os`, 65 in `packages/app`, 6 in `packages/scripts`, across 10 files reached through 15 imports
(`toolchain.ts` → `app/scripts/mobile/toolchain.ts`; `android-instrumentation.ts`, `android-workflow-native.ts`,
`native-test-fixture.ts`, `test-calendar-regression.ts`, `test-installed-upgrade.ts` → `app/scripts/lib/device-lease.ts`;
`aosp-pixel10a.ts`, `verify-apks.ts` → `os/scripts/android/pixel10a-product.ts`; `pixel10a-source-contract.ts` →
`verify-source-lock.ts`; `qualify-head.ts` → `scripts/check-required-playwright-results.ts`). Zero today in
`apps/`, `test/` or root config, so the filter is not hiding Alpha errors yet, but it would: it keeps only
paths starting with `scripts/` and drops every diagnostic in any other Alpha file a script imports. Deleting the
wrapper (research proposal) is wrong while upstream is not strict-clean (D14).

**Change (`scripts/typecheck-scripts.ts`, ~20 lines):**
1. Invert the filter: drop a diagnostic block only when its file starts with `vendor/eliza/` or `.eliza/`
   (comment: upstream sources are type-checked upstream; listed as a D14 follow-up). Keep everything else,
   including `apps/`, `test/`, `specs/` and root config files.
2. Replace `compilerFailed` (`![0,1,2].includes(status) || (status!==0 && !stdout.trim())`) with two named
   booleans: `crashed = result.signal !== null || ![0, 2].includes(result.status ?? -1)` and
   `failed = kept.length > 0 || crashed`. Status 2 with only vendor diagnostics passes; any kept diagnostic or
   crash fails.
3. Resolve `tsc` as today (`require.resolve('typescript/package.json')`); print "Script typecheck passed (N
   upstream diagnostics ignored)" so the ignored count is visible in CI logs.

**`tsconfig.scripts.json`:** `include` becomes `scripts/**/*.ts`, `vite-plugins/**/*.ts`, `test/integration/**/*.ts`,
`test/resident/**/*.ts`, `test/live/**/*.ts`, `test/android/**/*.ts`, `test/support/**/*.ts` (the moved suites were
type-checked as scripts; moving them must not drop that). `scripts/**/*.tsx` goes when `scripts/fixtures/` is
empty (S5). Keep `lib: ["ES2024", "DOM", "DOM.Iterable"]` (`Promise.withResolvers`, `findLast`; DOM for the
component pages and dev-server code).

**Verification:** with the inverted filter, `npm run typecheck` passes on today's tree (0 Alpha diagnostics).
Plant one type error in a `test/integration/*.ts` file and one in an `apps/app/src` file imported by a script:
both must fail the check (the second fails today only via `tsc --noEmit`).

---

## 6. Execution units

Waves run in order. Units inside a wave own disjoint files and can run in parallel. "Owns" lists every file
the unit creates, edits or deletes; a file named in two units of the same wave is a plan error.

### Wave 0 (one unit, first)

**S0 — Hand-maintained inventories.** Removes the lists that every later delete or move would have to edit.
Owns: `scripts/quint-lib.ts` (`runtimeScriptPaths` → glob `scripts/**/*.{ts,py,java}` + `capacitor.config.ts`
+ `vite.config.ts`; conformance hashes change once), `scripts/source-snapshot.ts` (digest of `git ls-files -s`
over the build roots instead of ~90 hand-listed roots), `scripts/android-instrumentation.ts` (delete
`CAMPAIGN_RUNNERS`, `NOT_RUN_BY_A_RUNNER`; add the `BrowserStorageFormatInstrumentedTest` registry row;
delete D1/D5 rows whose Java classes stage A deleted), `scripts/test-browser-storage-format.ts` (delete),
`scripts/android-browser-reading-live.ts`, `scripts/android-paired-speech-live.ts` (delete),
`scripts/owner/emulator-campaign-check.ts` (delete), `test/owner-emulator-campaign-check.test.mjs` (delete),
`test/android-instrumentation-runner.test.mjs` (delete reachability and source-text cases :208,420,495,514,533),
`test/mobile-uuid-build.test.mjs:49-56` (source-name asserts), `test/source-snapshot.test.mjs`,
`test/quint-checker.test.mjs:7,79`, `test/fixtures/workflow-clock-admission.mjs:21`.
Done when: `npm test`, `npm run quint:check`, `npm run quint:refinement -- --families=composition` pass.

### File-level serialisation

Ownership is per file, not per line. `package.json` and each workflow file have exactly one owner per wave:

| Wave | `package.json` | Workflow files |
|---|---|---|
| 1 | S4 | S2 (`resident-android.yml` only) |
| 2 | S5 | S5 (`resident-prepare.yml`, `resident-android.yml`) |
| 3 | S12 | S8 (all of `.github/**`) |
| 4 | — | S9 (`android.yml`, `resident-android.yml`, `release-*.yml`, `publish-qualified-app-update.yml`) |
| 5 | S11 | S11 (`browser.yml`, `quint-model-check.yml`); S10 (`resident-android.yml`) |

### Wave 1 (parallel)

**S1 — Dead tools.** Owns every row of §1.1 except `removed-profile-flags.ts`, `speech-env.ts`,
`with-test-mocks.ts`, the S0 rows, the workflow/CI rows and the launcher rows; i.e.
`aosp-unsigned-debug.init.gradle`, `cloud-subscription-latency.ts`, `compare-prototype.py`, `prototype-capture.ts`,
`fingerprint-voice-assets.ts`, `stage-native-apps.ts`, `test-automatic-update-platform.ts`,
`test-update-confirmation-platform.ts`, `test-native-calendar-consumer.ts`, `maps/test-{region.py,renderer.ts,
recovery-renderer.ts,prepare-region.py}`, `aosp-clock-contract.ts`, `aosp-image-capability.ts` (+ importer lines
in `stage-aosp.ts`, `verify-aosp-clock.ts`), `android-cloud-voice-timing.ts`, `build-pinned-voice.ts`,
`dev-ui-remote-host.ts`, `prepare-aosp-apk.py`, `test-android-notification-device-slot.ts`,
`test-cloud-personal-flow.ts`, `test-tts-startup.ts`, `test-tts-worker-lifecycle.ts`, `test-own-notice-question.ts`,
`test-google-accounts.ts`, `test-inbox-saved-drafts.ts`, the six workflow host probes, `fixtures/workflow-host.ts`,
`eval-device-action-clarification.ts --self-test` branch; and the test files: `llama-cpp-only.test.mjs:36`,
`fixtures/automatic-update-android/`, `fixtures/update-confirmation-android/`, `maps-dataset-manifest.test.mjs`
(prepare-region case), `aosp-release-signing.test.mjs`, `aosp-image-capability.test.mjs`, `aosp-sms.test.mjs`
(import lines), `android-cloud-voice-timing.test.mjs`, `pinned-voice-build.test.mjs`, `dev-ui-remote-host.test.mjs`,
`aosp-apk-preparation.{py,test.mjs}`, `native-notification-device-slot.test.mjs:11`, `tts-worker-lifecycle.test.mjs`,
`own-notice-question.test.mjs`, `google-accounts.test.mjs`, `device-action-clarification-eval.test.mjs`,
`adapter-contracts.test.mjs` (personal-flow row), `inbox.test.mjs` (saved-drafts row);
`PasswordProviderSupport.java:16` (comment).

**S2 — Tombstones and dormant branches.** Owns `removed-profile-flags.ts` and its call sites
(`android-build-preflight.ts`, `build-android.ts`, `gradle-verification.ts`, `stage-local-agent-runtime.ts`,
`verify-apks.ts`, `build-archive.ts`, `sign-release-apks.ts`, `verify-packaged-runtime.py`), the
`alpha-runtime-profile.json` marker writer `stage-local-agent-runtime.ts:71` and readers `stage-aosp-native.py:69`,
`verify-packaged-runtime.py:106`, `android-build-preflight.ts:184-188`; the `runtime-profile.ts` →
`native-google-host-artifact.ts --verify-staged` merge (§3.2) with `android/app/product.gradle` and
`resident-android.yml:340`; `speech-env.ts`, `dev-speech-settings.ts`, `host-speech-admission.ts`;
`prepare-client-features.ts` retired-slot refusal and dormant `CLIENT_FEATURE_PATCHES`; `prepare-patched-native.ts`
dormant patch engine; `workflow-worker-artifact.ts` `.patch-overlay.json` refusal; `native-voice-latency.ts` v2
format; `embedding-native-contract.ts` `exported` JNI mode; `ci/embedding-artifacts.py` `ALPHA_LOCAL_EMBEDDINGS`
path and its call at `resident-android.yml:199`. Tests: `one-runtime-profile.test.mjs` (delete),
`android-build-path.test.mjs:146-162`, `upstream-pin-guard.test.mjs:117`, `agent-speech-environment.test.mjs`,
`native-patch-admission.test.mjs`, `workflow-worker-assets.test.mjs:18`, `embedding-artifact-inputs.test.py`
(4 settings tests). Specs pins in the same commit: `refinement/services/workflow-worker-staging.mjs:29`,
`refinement/services/native-google-host-artifact{,-probe}.mjs` input list (models stay at 100 %).

**S3 — `scripts/lib` (new files only).** Owns `scripts/lib/{hash,git,gh,fs,app-identity,upstream-lock}.ts`,
`scripts/ci/ci_common.py`, `scripts/ci/github_download.py`, and additions to `scripts/toolchain.ts`. No caller
migrates here and no unit test is added (owner brief); each helper is exercised by the callers that adopt it.

**S4 — package.json and runners.** Owns `package.json` (`scripts` block per §4, except rows that point at files
later waves create: those keep their current command until the owning unit repoints them), `scripts/run-node-tests.ts`,
`scripts/with-test-mocks.ts` (delete), `scripts/typecheck-scripts.ts`, `tsconfig.scripts.json`,
`scripts/dev-local.ts:11-12`, `test/node-test-runner.test.mjs` (delete), README lines 22-29 and 43-47 (script names
only), `specs/quint/README.md` (removed alias names). Applies §5.
Done when: `npm run verify` runs end to end with no `--ignore-scripts`, and `npm run dev:ui` starts from a clean
`.eliza/`.

### Wave 2 (parallel)

**S5 — Suites into `test/`.** Owns every source and target in §2.1 except the photo-filter rename (S6), including
`scripts/run-upstream-source-tests.ts`; the shim files `adapter-contracts.test.mjs`, `local-agent-contracts.test.mjs`,
`inbox.test.mjs`, `connection-contracts.test.mjs`, `browser/adapters.spec.ts` (rows of moved suites only),
`batch-progress-stream.test.mjs`, `batch-voice-progress-ack.test.mjs`, `batch-ack-shell-retirement.test.mjs`,
`calendar-availability.test.mjs`, `calendar-availability-reader.test.mjs`, `agent-calendar-mutation.test.mjs`,
`digest-restart-input.test.mjs`, `resident-attachment.test.mjs:21-23`, `cloud-voice-profile.test.mjs` (signature
call), `browser/workflow-missed-run-now.spec.ts:21`. Moves `scripts/fixtures/{loopback,bundled-module,
local-agent-stream,inbox-memory,speech-bridge,device-action-journal,hosted-digest-protocol}.ts`; repoints
`eval-device-action-clarification.ts` to `test/support/loopback.ts`. Package rows: `agent:test-upstream` and the
four `agent:test-*` commands from §4 (removes `agent:test`, `agent:test-device-timing`, `agent:test-redaction`).
Workflow lines: `resident-prepare.yml:34`, `resident-android.yml:310,312`.

**S6 — Android campaigns.** Owns §2.4 sources, targets, the six runner tests and
`test/fixtures/isolated-native-campaign.mjs` (delete), the Java comment lines listed there,
`test-photo-filter-png-reference.ts` → `generate-photo-filter-goldens.ts` and the `photo-filter-goldens.json`
`source` field. Uses `scripts/lib/app-identity.ts` and `toolchain.ts adb` from S3.

**S7 — Launchers and dev tools.** Owns `agent-{embeddings,identity,model}.ts` → `agent-profile.ts`,
`launcher-child.ts`, `private-runtime-launch.ts`, `start-local-remote.ts`, `start-local-voice-agent.ts`,
`start-reviewed-workflow-agent.ts`, `start-combined-agent.ts`, `start-cloud-qa.ts`, `cloud-resident-host.ts`,
`dev-cartesia.ts`, `dev-cloud.ts`, `cloud-sdk-authority.ts` → `cloud-deployment-policy.ts`, `cloud-deployment.ts`,
`gmail-agent-*`, `local-agent-dev-bridge.ts` (gmail broker parameter); the specs pins of §3.2 rows 1-5 and the
`ReviewedWorkflowLauncher` model files of §1.1 (`specs/quint/services/manifest.json`,
`specs/quint/application/manifest.json` `DevelopmentHost.sources`); tests `agent-identity`, `agent-model-selection`,
`agent-embedding-overrides`, `core-state-patch` (file lists), `cloud-sdk-routing`, `dev-cartesia`,
`calendar-managed-rejection` (stops rewriting the read-host import), `quint-reviewed-workflow-launcher-refinement`
(delete), `fixtures/agent-identity-canonical.test.ts`, `fixtures/product-character-host.mjs`; comment
`apps/app/src/product/native-cloud-runtime.ts:9`. Done when the combined-agent, cloud-qa and development-host Quint
models pass.

### Wave 3 (parallel)

**S8 — Workflows (chunk scripts-01).** Owns `.github/workflows/**`, `.github/actions/**` (new composites
`node-setup`, `android-toolchain`, `android-emulator`, `free-disk`, `gcp-release-storage`), `scripts/ci/affected.ts`
(lane matrix `static`, `host`, `formal`, `lemma`, `browser`, `production`, `android`, `prepare`; positive path lists
for `prepare` and `lemma`; no catch-all to "everything" for `scripts/owner/**`, `scripts/maps/**`, `scripts/ci/*.py`;
`browserReadAndroid` derived by scanning specs; `bun-spawn-seccomp|digest-restart` out of the line-38 regex),
`scripts/ci/run-browser.ts`, `scripts/ci/required-result.ts`, `scripts/ci/required-checks-ruleset.json` (drop
`Repository verification`; the three required names stay, D12), `scripts/ci/speech-candidate.ts` (delete),
`scripts/ci/emulator-suite.ts` (`FUSED_SPEECH_CLASSES`), `scripts/ci/reproduce-*.py` (delete),
`scripts/ci/prepare-dafny.sh`; tests `ci-affected.test.mjs`, `ci-emulator-evidence.test.mjs`,
`ci-required-checks.test.mjs`, `ci-pin-bound-scripts.test.mjs`, `embedding-workflow-forwarding.test.mjs`
(workflow-text cases deleted; `actionlint` in `static` replaces them). Deletes `lemma-check.yml`, `digest-restart.yml`,
`bun-spawn-seccomp.yml`, `reproduce-paradee-model.yml`, `verify-cloud-signing-input.yml` (becomes an `admit` job in
`release-cloud-app-signing.yml`), the `.mjs` fallbacks in `release-cloud-app-signing.yml:115-117` and
`publish-qualified-app-update.yml:146-150`, the upstream `stage-launcher-overlay` runs (`android.yml:83`,
`resident-android.yml:272`), the second run of each Python suite that runs twice today (`resident-android.yml:569-570`
and `resident-prepare.yml:31`; the remaining run moves into `test/python-suites.test.mjs` in S9). Replaces direct `node scripts/<x>` calls that have an
npm alias with the alias (`resident-android.yml:331` → `npm run licenses:packaged-runtime -- <same args>`), so S12
can rename files without touching workflows. `browser.yml` `verify` becomes lanes calling `verify:static`,
`npm test`, `verify:formal`, `verify:web`. The Quint T10 pins on release-workflow text
(`refinement/services/{protected-app-update-promotion,app-update-candidate}.mjs`,
`services/manifest.json:2878,2924-2927`) must be ported by the specs plan before S8 edits those four release
workflows.

**S12 — Release and AOSP tooling.** Owns `package.json` (rows `licenses:packaged-runtime`, `aosp:retain-known-good`),
`generate-licenses.ts`, `generate-sbom.ts` → `scripts/licences/` (byte-identical `THIRD_PARTY_NOTICES.txt` and SBOM;
`--check` in `npm test`), `licence-policy.ts` un-exports, `font-license-blockers.ts`, `gradle-verification.ts`,
`verify-packaged-runtime.py` → `scripts/packaged-runtime.ts` (§1.2), `scripts/android-instrumentation.ts` registry →
`scripts/android-instrumentation.json`, the AOSP family (`aosp-tools.ts` merge, `aosp-cuttlefish.ts` and
`verify-pixel10a-source.ts` into `stage-aosp.ts`, `aosp-*-overlay.ts`, `aosp-listener.ts`, `aosp-pixel10a.ts`,
`aosp-secure-camera-contract.ts`, `pixel10a-source-contract.ts`, `sign-aosp-release.ts`, `stage-aosp-native.py`,
`stage-alpha-os-branding.py`); tests `sbom.test.mjs`, `runtime-licenses.test.mjs`, `licenses.test.mjs`,
`font-license.test.mjs`, `gradle-verification.test.mjs`, `packaged-runtime.test.py` (delete),
`cuttlefish-launcher-postboot.test.mjs`, `pixel10a-image.test.mjs` (delete), `aosp-*.test.mjs` import lines,
`aosp-fresh-presets.test.py`. Specs pin: `refinement/application/os-source-staging.mjs` stops splicing
`stage-alpha-os-branding.py` text and passes an `observe` callback to `apply_plan` (same commit). Done when one
`android:build:local` produces the same `runtimePackaging` JSON and notices as before the unit.

### Wave 4

**S9 — Python CI.** Owns `scripts/ci/*.py` except `release-custody-proof.py`: rename hyphenated modules to
underscore names (removes the 9 `importlib.util.spec_from_file_location` loaders), adopt `ci_common.py` /
`github_download.py`, create `resident_emulator.py` and `resident_crash.py`, merge `resident_native_source.py` into
`resident_fixture.py` (its self-hash of `local-agent-source.ts`/`stage-local-agent-sources.ts` goes in the same
commit as S10's provenance change, so S9 leaves those two lines and S10 deletes them), `pending-recovery-ui.py` →
`main(run=…)` plus one import-based cleanup test, `test-pending-recovery-phases.py` (delete), the §2.2 moves and
`test/python-suites.test.mjs` (single runner, each suite once), `calendar-bridge.py` → Gradle task (§1.2) with its
`android.yml` steps, `ci/private-artifact-identity.json` → `docs/release/`. Pins in the same commit:
`specs/quint/services/manifest.json:2931-2932`, `refinement/services/protected-app-update-promotion.mjs:60,203`,
`scripts/quint-lib.ts` is untouched (S0 replaced its list with a glob); tests `resident-native-ci-admission.test.mjs`,
`cloud-signing-input.test.py`, `qualified-app-update.test.py`, `hosted-native-inputs.test.py`,
`embedding-artifact-inputs.test.py`, `resident-crash-diagnostic.test.py`; workflow paths per the serialisation table.

### Wave 5 (parallel)

**S10 — Callers onto `scripts/lib`.** Owns every `scripts/**/*.ts` not owned by S11 and migrates it to §3.1: hash,
git, gh, fs, app identity, upstream lock; `parseArgs` at `cloud-readiness.ts:227`, `enroll-release-keys.ts:213`,
`publish-update-manifest.ts:30`, `record-release.ts:36`, `render-assetlinks.ts:373`, `sign-release-apks.ts:184`,
`aggregate-voice-latency.ts:53`, `developer-archive.ts:27`, `stage-os-update-enrollment.ts:14`, `owner/input.ts:1`;
type owners (`ManifestFacts`, `UpdateOffer`, `ManifestNode`); §3.2 merges `verify-upstream.ts`, `verify-apks.ts`
(`release-distributable.ts`), `prepare-embedding-host.ts`, `prepared-workflow-worker.ts`,
`stage-local-agent-runtime.ts`, `scripts/ci/prepare-emulator.ts` (with `resident-android.yml:518,605`),
`owner/read-branch-rules.ts`, `upstream-*.json`. Deletes `update-artifact.ts`, `regular-files.ts`. For the five
exported hash helpers outside `quint-lib.ts` it owns the import lines of their `test/` and `specs/` importers listed in
§3.1 (re-run the grep at start; legacy importers will be gone). Self-provenance removal is one commit here, together
with the specs plan's `prepared-source-stamp` model change: `prepare-local-agent.ts:10` (`preparerSha256`),
`verify-upstream.ts:60`, `native-google-host-artifact.ts:66`, `ci/resident_fixture.py` (the two self-hash lines S9
carried over), `test/prepare-local-agent-requalify.test.mjs` (delete). Expect one full re-prepare.

**S11 — Formal tooling.** Owns `package.json` (`quint:*`, `lemma:*` rows), `browser.yml`, `quint-model-check.yml`,
`check-quint.ts` (drop receipts, canaries, input rehash, custom process supervisor; absorb `--changed-since`; fold
`temporal` into `verify`), `check-lemma.ts` (drop receipt, rehash, frozen write-back, version and argument
self-checks; fix `specs/lemma/README.md:91`), `ci/check-changed-models.ts` (delete), `quint-lib.ts` (export
`modelFamilies` and `readModelFamily`; stop loading Quint's internal parser; its `sha256`/`readJson`/`filesWithin`
move to `scripts/lib` with their importers in `specs/quint/refinement/{check-traces,application/account-sheet,
application/cloud-connection-notices,native/copy-receipt}.mjs`; after the specs plan moves `sourcePaths` to
`specs/quint/refinement/sources.mjs`, delete `runtimeScriptPaths`), `prepare-quint-history.ts` and
`check-quint-refinement.ts` (delete per §1.2); tests `quint-checker.test.mjs`, `quint-changed-models.test.mjs`
(delete), `lemma-check.test.mjs`, `lemma-checker.test.mjs`, `quint-tla-inventory.test.mjs` (delete). CI uploads of
`test-results/quint/` and `test-results/lemma/` shrink to logs. Done when `npm run verify:formal` and the nightly
`quint:verify` pass for every live model (D11).

### Wave 6 (after the test plan's journeys and the specs plan's ports)

**S13 — Transplant retirement.** Owns every row of §2.3 and §1.2 rows 5-7: deletes each script with its shim when the
named journey case exists, then `inbox-adapter-fixture.ts`, `fixtures/{calendar-adapter,prototype-script,
playwright}.ts`, `workflow-renderer-fixture.ts` (helpers → `test/support/workflow-agent.ts`), moves
`fixtures/{cloud-delegation,hosted-live-source}/` to `test/fixtures/component-pages/`, deletes
`test/adapter-contracts.test.mjs`, `test/browser/adapters.spec.ts` and `test/fixtures/child-suite.mjs` when empty, and
drops `scripts/**/*.tsx` from `tsconfig.scripts.json`. Afterwards `scripts/` holds no `test-*` file and
`scripts/fixtures/` is gone.

### Stage F (structural pass, with the renderer moves)

**S14 — Folder moves.** `scripts/dev-server/`, `vite-plugins/`, `test/browser/storage-specs.ts` per §3.2, after the
specs plan turns the cloud-bridge symbol pins into imports. Then Prettier runs once over `scripts/` with the rest of
the repo (D9). `local-agent-source.ts` and `copy-file-clone.ts` are no longer hash inputs after S10, so the format
pass does not force a re-stage.

### Order summary

S0 → {S1, S2, S3, S4} → {S5, S6, S7} → {S8, S12} → S9 → {S10, S11} → S13 → S14.
Cross-plan gates: S8's release-workflow edits wait for the specs plan's T10 port of the two app-update harnesses;
S10's provenance commit pairs with the specs plan's `prepared-source-stamp` change; S11's deletions wait for the
legacy-family retirement and `specs/quint/refinement/run.mjs`; S13 waits for each journey case; S14 waits for the
cloud-bridge symbol-pin port. Units that delete a file a Quint harness names (S2, S7, S12, S9) run the affected
model's refinement test in the same commit, so the formal suite stays at 100 %.
