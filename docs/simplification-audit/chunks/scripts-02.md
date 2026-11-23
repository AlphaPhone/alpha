# Chunk scripts-02: root config, agent launcher helpers, Android runners and campaigns, AOSP bindings

30 files reviewed, 30 reports in `files/` (`package.json.md`, `playwright.config.ts.md`, `scripts/*.md`).

## Files

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| `package.json` | 124 | root config | SIMPLIFY | delete 7 `pre*` hooks, `dev:local`, 3 `quint:` subsets, `quint:conformance`, 7 unused aliases; split `verify` into lanes; drop `quint:prepare-history` with the legacy family |
| `playwright.config.ts` | 73 | test config | KEEP, SIMPLIFY | storage list to `test/browser/` (or tags); drop deleted-feature storage specs; optional prebuilt production output |
| `scripts/agent-bundle-dependencies.ts` | 38 | build helper | KEEP | — |
| `scripts/agent-embeddings.ts` | 38 | launcher helper | MERGE | `scripts/agent-profile.ts` |
| `scripts/agent-identity.ts` | 66 | launcher helper | MERGE, SIMPLIFY | `scripts/agent-profile.ts`; drop legacy-name fallback (owner) |
| `scripts/agent-model.ts` | 15 | launcher helper | MERGE | `scripts/agent-profile.ts` |
| `scripts/aggregate-voice-latency.ts` | 175 | manual acceptance CLI (#395) | KEEP, SIMPLIFY | routes from product, `parseArgs`, no legacy-export branch |
| `scripts/android-abis.ts` | 18 | build helper | KEEP, SIMPLIFY | — |
| `scripts/android-browser-reading-live.ts` | 332 | manual device campaign (paired) | DELETE | D5, delete-candidates A50 |
| `scripts/android-build-preflight.ts` | 336 | build input check | KEEP, SIMPLIFY | tombstone, legacy profile marker, git/pin helpers |
| `scripts/android-cloud-voice-timing.ts` | 211 | manual diagnostic CLI | DELETE | with `test/android-cloud-voice-timing.test.mjs` |
| `scripts/android-gzip-assets.ts` | 69 | build step | KEEP, SIMPLIFY | shared walker |
| `scripts/android-host.ts` | 117 | build step | KEEP | — |
| `scripts/android-instrumentation.ts` | 753 | emulator e2e runner | KEEP, SIMPLIFY | prune registry, delete `CAMPAIGN_RUNNERS`/`NOT_RUN_BY_A_RUNNER`, registry to JSON (~450 lines) |
| `scripts/android-paired-speech-live.ts` | 92 | manual device campaign (paired) | DELETE | D5, A51 |
| `scripts/android-resident-instrumentation.ts` | 52 | manual device campaign | MOVE, SIMPLIFY | `test/android/resident-egress.campaign.ts` (owner: wire or accept as manual) |
| `scripts/android-stage-voice-models.ts` | 205 | build input staging (CI) | KEEP, SIMPLIFY | one verified-copy routine |
| `scripts/android-workflow-native.ts` | 206 | manual device campaign | MOVE, SIMPLIFY | `test/android/workflow-native.campaign.ts`; wire into `android-emulator.yml` |
| `scripts/aosp-capability-overlay.ts` | 27 | AOSP binding | KEEP | absorb the `aosp-image-capability.ts` import |
| `scripts/aosp-clock-contract.ts` | 2 | re-export shim | DELETE | import upstream directly |
| `scripts/aosp-cuttlefish.ts` | 18 | AOSP helper | MERGE | `scripts/stage-aosp.ts` |
| `scripts/aosp-image-capability.ts` | 17 | re-export shim | DELETE | import upstream directly |
| `scripts/aosp-listener-systemui.ts` | 28 | manual AOSP CLI | MERGE | `scripts/aosp-tools.ts listener-systemui` (D7 keeps the feature) |
| `scripts/aosp-listener.ts` | 19 | AOSP binding | KEEP, SIMPLIFY | drop 6 unused re-exports |
| `scripts/aosp-ota-update.ts` | 40 | operator CLI | MERGE | `scripts/aosp-tools.ts ota` |
| `scripts/aosp-pixel10a.ts` | 110 | AOSP binding | KEEP, SIMPLIFY | drop `placeholderFields` re-export |
| `scripts/aosp-provisioning-overlay.ts` | 43 | AOSP binding | KEEP, SIMPLIFY | drop `manifestComponents` re-export; upstream README hook |
| `scripts/aosp-release-record.ts` | 26 | operator CLI | MERGE | `scripts/aosp-tools.ts release-record` |
| `scripts/aosp-secure-camera-contract.ts` | 38 | AOSP binding | KEEP, SIMPLIFY | drop 4 unused re-exports |
| `scripts/aosp-unsigned-debug.init.gradle` | 5 | orphan Gradle init script | DELETE | no reference anywhere (repo and `vendor/eliza`) |

Tally: KEEP 14 (10 of them with SIMPLIFY, including `playwright.config.ts`), SIMPLIFY 1 (`package.json`), MERGE 7, MOVE 2, DELETE 6.

## Coverage that would be lost by the DELETEs

- `android-browser-reading-live.ts`: browser reading through a real speech host with mid-utterance cancellation on an emulator. The paired transport is deleted by D5; the reading flow, exact-text posting and cancellation remain covered by the loopback reading classes in the CI reading lanes (`BrowserReading*`, `BrowserPageQuestion`). Real-speech coverage belongs to the on-device speech classes in the fused-speech lane.
- `android-paired-speech-live.ts`: paired ASR/voice only (deleted feature). No replacement needed.
- `android-cloud-voice-timing.ts`: a developer readout of voice timing from a debug WebView; the product's diagnostics export produces the same data. No product behaviour loses coverage.
- `aosp-clock-contract.ts`, `aosp-image-capability.ts`, `aosp-unsigned-debug.init.gradle`: no behaviour.

Not a DELETE but a coverage gap today: `android-workflow-native.ts` is the only runner of MVP-18 approval-notice process-death and owner-change cases, and `android-resident-instrumentation.ts` the only runner of resident egress redaction. Neither is run by any workflow. If they are not wired into CI, these behaviours have no executed coverage.

## Shared helpers worth keeping / creating

- `toolchain.ts` gains `adb(serial)` and `type Adb` (copies in `android-instrumentation.ts:85`, `android-resident-instrumentation.ts:15`, `android-cloud-voice-timing.ts:158`, `android-paired-speech-live.ts:38`, `android-browser-reading-live.ts:223`).
- `scripts/lib/hash.ts`: SHA-256 of bytes and streamed file (copies in `android-instrumentation.ts:465`, `android-stage-voice-models.ts:43`, `android-workflow-native.ts:87`, `android-resident-instrumentation.ts:20`, `aosp-listener.ts:16`, `aosp-pixel10a.ts:31`).
- `scripts/lib/git.ts` and `pin.ts`: `android-build-preflight.ts` alone has two git wrappers and three lock reads.
- `scripts/lib/fs.ts` `walkFiles`: two walkers in `android-gzip-assets.ts`.
- `node:util parseArgs` for `aggregate-voice-latency.ts`, `android-instrumentation.ts`, `android-stage-voice-models.ts`, `aosp-listener-systemui.ts`, `android-abis.ts` (`--abi`).
- `readAppConfig(root)`: `android-host.ts` (twice), `aosp-secure-camera-contract.ts`, the campaign scripts.
- Keep `admitApks`, `readHome`, `restoreHome` exported from `android-instrumentation.ts`; they are real shared behaviour.

## Cross-file actions

1. Merge `agent-embeddings.ts`, `agent-identity.ts`, `agent-model.ts` into `scripts/agent-profile.ts`; update the four launchers, `eval-device-action-clarification.ts`, and the file lists in `specs/quint/refinement/services/{combined-agent-launcher,reviewed-workflow-launcher}{,-probe}.mjs` and `specs/quint/services/manifest.json:2087-2138` in the same change (the probes copy these files by path; a rename otherwise breaks the refinement run).
2. Create `scripts/aosp-tools.ts` with subcommands `ota`, `release-record`, `listener-systemui`, `verify-clock`, `verify-listener`, `verify-secure-camera` (the last three are the `verify-aosp-*` wrappers from another chunk); point `aosp:retain-known-good` at it; delete `aosp-ota-update.ts`, `aosp-release-record.ts`, `aosp-listener-systemui.ts` and the three `verify-aosp-*.ts`.
3. Delete `aosp-clock-contract.ts` and `aosp-image-capability.ts`; `stage-aosp.ts`, `verify-aosp-clock` (or its subcommand) and the tests import upstream directly. Inline `aosp-cuttlefish.ts` into `stage-aosp.ts`.
4. Delete `android-browser-reading-live.ts`, `android-paired-speech-live.ts` with `BrowserReadingLive`, `PairedAsrLive`, `PairedVoiceLive` Java classes and their `CAMPAIGN_RUNNERS` rows (C4).
5. In `android-instrumentation.ts`: delete `CAMPAIGN_RUNNERS` and `NOT_RUN_BY_A_RUNNER` together with the reachability assertions in `test/android-instrumentation-runner.test.mjs` and the matching logic in `scripts/owner/emulator-campaign-check.ts`; delete registry rows for D1/D2/D5 classes as their Java tests are deleted.
6. Delete `removed-profile-flags.ts` and its call in `android-build-preflight.ts:307`; delete the `alpha-runtime-profile.json` marker together with its writer (`stage-local-agent-runtime.ts:71`) and readers (`stage-aosp-native.py:69`, `verify-packaged-runtime.py:106`, `android-build-preflight.ts:184-188`).
7. Export the voice route list from `apps/app/src/runtime/voice-timing.ts` and import it in `aggregate-voice-latency.ts` and `diagnostics-export.ts` so D5's removal of `paired-agent`/`development-agent` is one edit.
8. `package.json`: remove `pre*` hooks and update `scripts/dev-local.ts:11-12` (its comment is false today); remove dead aliases; remove the scripts `run-node-tests.ts`/`with-test-mocks.ts` wrappers (other chunk) in the same change.
9. Move `scripts/storage-specs.ts` to `test/browser/` and update `scripts/ci/affected.ts`, `scripts/qualify-head.ts` (or delete with it), `test/playwright-projects.test.mjs` (delete).
10. Delete source-text cases: `test/android-gzip-assets.test.mjs:50`, `test/aosp-image-capability.test.mjs:74`, `test/aosp-capabilities.test.mjs:53`, `test/aosp-pixel10a.test.mjs:130`, `test/aosp-retain-known-good.test.mjs:13`.

## Owner questions

1. Should `android-workflow-native.ts` (approval-notice process death, MVP-18) and `android-resident-instrumentation.ts` (resident egress redaction with a real provider key) run in a workflow, or are they manual release acceptance? Today nothing runs them.
2. Is `aggregate-voice-latency.ts` (with `native-voice-latency-emulator.ts`) still the tool for issue #395 acceptance runs? If not, both go with their four unit tests.
3. May the legacy-name fallback in `agent-identity.ts:47-54` go (developer profiles made by old launchers would need recreation)?
4. `package.json` devDependencies `@noble/hashes`, `adze`, `dotenv`, `json5`, `markdown-it` (and `pg`, one import) have no consumer outside `vendor/`: are they needed so the pinned upstream resolves from the root `node_modules`?
5. Is `aosp-listener-systemui` (always-on listening SystemUI patch) still run by anyone before the AOSP image work resumes? D7 keeps the feature, so the proposal keeps it as an `aosp-tools.ts` subcommand.
