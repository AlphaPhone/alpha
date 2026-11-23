# Global deletion ledger

This ledger merges every delete candidate from the chunk summaries (`chunks/*.md`, sections "Delete candidates"
and "Files") and the research reports (`research/*.md`, delete-candidate sections). Pattern IDs (A1, D4, T2, ...)
refer to [`PATTERNS.md`](PATTERNS.md). Decisions D1 to D14 refer to [`DECISIONS.md`](DECISIONS.md).

It has three tables:

- **A. Whole files to delete.** Every High-confidence row was re-checked with `git grep` (see "How the grep was run").
- **B. Symbols, branches, flags and resources to delete inside files that stay.**
- **C. Retired feature paths that span many files.** Each one is a single coordinated deletion. Rows in A and B that
  belong to a unit in C point to it ("→ C3") and are deleted only as part of it.

Column meanings:

- **Conf.**: H (high), M (medium) or L (low). This is the confidence that nothing in a product build needs the item.
- **Owner**: `no` means mechanical, with no product decision. `D#` means DECISIONS.md already decides it (the
  decision is quoted). `open` means a real owner question remains. `D7-keep` means DECISIONS.md D7 says keep, so
  the row is listed only so that nobody deletes it by accident.
- **Dependants**: what must change in the same commit: importers, host tests, Playwright specs, androidTest
  registry rows, Quint manifests and harnesses, scripts, workflows, and the file list in `test/support/feature-parity.mjs`.

Coverage gap: there are no chunk summaries for `android-17` or `app-02`, `app-03` and `app-04`. Their candidates
appear only where a research report names them.

## How the grep was run

All checks ran in `/Users/nubs/alphaphone/.claude/worktrees/simplify` (branch `claude/codebase-simplification`, base
`b9c5844dc`) with this command:

```sh
git grep -l -F -e "<pattern>" -- . ':!docs/simplification-audit' ':!<the file itself>'
```

The **Grep** column gives the pattern and the hit count, followed by the hits. "0" means no file other than the
candidate contains the pattern. Two cases need care:

- Host tests run through the glob `test/*.test.mjs` (`scripts/run-node-tests.ts:14`), so a host test file never has
  a by-name reference.
- androidTest classes are registered by short name (for example `AllViewAgentContext`) in
  `scripts/android-instrumentation.ts`. The short names were grepped too (`git grep -n -w <ShortName> -- scripts test
  .github specs package.json`).

`test/android-instrumentation-runner.test.mjs:197-204` fails when a class and its `NOT_RUN_BY_A_RUNNER` entry
disagree. Delete each class and its registry or `NOT_RUN_BY_A_RUNNER` row in the same commit.

---

## A. Whole files to delete

### A.1 Android AOSP branding packets (`android/aosp/branding/`)

| # | File | Evidence | Conf. | Dependants to update or delete | Owner | Grep |
|---|---|---|---|---|---|---|
| A1 | `core-launcher/test_policy.py` (221 lines) | Not run by `run-node-tests`, `python-suites` or any workflow. Its predicate matrix duplicates `specs/quint/refinement/application/os-defaults.mjs`, which CI runs. (android-01, research android §3) | H | none | no (owner may keep the FGS transplant) | `test_policy` → 0 |
| A2 | `hidden-navigation-handle/test_hidden_handle.py` | Built from stubs and text assertions. The only reference is the README. | H | `hidden-navigation-handle/README.md` | no | `test_hidden_handle` → 1: its README |
| A3 | `hidden-navigation-handle/prepare.py` | Its only consumer is A2. | H (with A2) | none | no | `hidden-navigation-handle/prepare` → 0 |
| A4 | `hidden-navigation-handle/apply.py` | A near-copy of `system-entry/apply.py`, which already takes `--manifest`. No caller. | H | README instructions → `system-entry/apply.py --manifest` | no | `hidden-navigation-handle/apply` → 0 |
| A5 | `hidden-navigation-handle/PROVENANCE.json` | No reader. It duplicates `manifest.json`. | H | none | no | `PROVENANCE.json` → 0 |
| A6 | `system-entry/PROVENANCE.json` | No reader. It duplicates `manifest.json` plus git history. | H | none | no | `PROVENANCE.json` → 0 |
| A7 | `keyboard-dictation/source-inputs.json` | No reader. Every `source-inputs.json` hit in scripts points at `provision/`. | H | none | no | `keyboard-dictation/source-inputs` → 0 |
| A8 | `home-back-keyboard-inputs.json` | No reader. Only `README.md:65` mentions it. | H (unless the X1 staging manifest adopts it) | `android/aosp/branding/README.md` | no | `home-back-keyboard-inputs` → 1: `branding/README.md` |
| A9 | `POWER-INVOCATION.md` | Stale. It describes an exported ACTION_ASSIST activity, but the activity ships `exported=false enabled=false`. | H | fold 2 lines into the README | no | `POWER-INVOCATION` → 0 |
| A10 | `power-voice/SOURCE.json` | No reader. Two of its 9 rows duplicate `manifest.json`. | H | none | no | `SOURCE.json` → 0 |
| A11 | `secure-camera-inputs.json` | Staging copies it as bytes. Nothing parses it. | H | `scripts/stage-alpha-os-branding.py:103` (copy line) | no | `secure-camera-inputs` → 1: `scripts/stage-alpha-os-branding.py` |
| A12 | `system-entry/test_native_plan.py` (187 lines) | No runner. `python-suites.test.mjs` lists its suites explicitly. The `.cache/` inputs are absent. | H | `system-entry/README.md:37,51` | open (confirm nobody runs it by hand) | `test_native_plan` → 1: `system-entry/README.md` |
| A13 | `core-launcher/.gitignore`, `hidden-navigation-handle/.gitignore`, `provision/.gitignore`, `system-entry/.gitignore`, `system-entry/.gitattributes` | Identical files. Merge them into one `android/aosp/branding/.gitignore` and the root `.gitignore:45`. | H | new `branding/.gitignore` | no | (merge, not a reference check) |
| A14 | `keyboard-dictation/README.md` | Merge into `branding/README.md`. | H | none | no | (merge) |
| A15 | `provision/admitted-previous-sources.json` | An A1 admission of staged files from before the rename. | M | `stage-alpha-os-branding.py` `previous_activity` (35-40, 124, 126-130) | open (confirm no old staged tree exists) | not re-verified (M) |
| A16 | `overlay/frameworks/base/core/res/res/values/alpha-secure-camera.xml`, `overlay/.../SystemUI/res/values/alpha-secure-camera.xml` | Byte copies of the `vendor/alphaphone/secure-camera` static overlay that `branding.mk:3-4` already keeps. | M | `branding.mk` | open (confirm the packet is always present) | not re-verified (M) |
| A17 | `power-voice/` packet (`README.md`, `manifest.json`, `alpha-protected-power-voice.patch`) | No script, test or staging step reads it. It requires an exported `AlphaPowerVoiceActivity`, but the app ships that activity disabled (P-78). | M | → C11 | D7-keep (Power invocation is still planned) | — |

### A.2 Android instrumentation sources (`android/app/src/androidTest/java/ai/alphacompute/alphaphone/`)

Every row also deletes the class's entry in `scripts/android-instrumentation.ts`, whether a `CLASS_REGISTRY` key or a
`NOT_RUN_BY_A_RUNNER` key (line numbers below).

| # | File | Evidence | Conf. | Dependants | Owner | Grep (full name / short name) |
|---|---|---|---|---|---|---|
| A20 | `AllViewAgentContextInstrumentedTest.java` (153) | In `NOT_RUN_BY_A_RUNNER`. Nothing writes the fixture `agent-context-pairing.json`. It drives dev pairing. | H | `android-instrumentation.ts:328` | no | 0 / `AllViewAgentContext` → `android-instrumentation.ts:328` |
| A21 | `ActivityInstanceSelectionInstrumentedTest.java` (28) | Tests the harness (`BoundedActivityScenario`) by reflection (T5). | H | registry `:266` | no | 0 / `:266` |
| A22 | `BrowserUnsupportedReadingInstrumentedTest.java` (33) | `BrowserReadingNavigation` makes the same claim and runs in CI. This class is in no CI lane. | H | registry `:243`; `test/ci-emulator-evidence.test.mjs:234` | no | 0 / `:243`, `ci-emulator-evidence.test.mjs:234` |
| A23 | `CalendarUpgradeInstrumentedTest.java` (103) | Seeds `CalendarEventGuard`, which does not exist in main. It can only pass against a baseline APK from before the extraction. A1. | H | calendar branch of `scripts/test-installed-upgrade.ts` | D1 (delete) | 1: `scripts/test-installed-upgrade.ts` |
| A24 | `CombinedAgentInstrumentedTest.java` (115) | In `NOT_RUN_BY_A_RUNNER`. Nothing writes its fixture. The PRD excludes pairing. | H | `:329` | D5 | 0 / `:329` |
| A25 | `CombinedAgentRestartInstrumentedTest.java` (156) | In `NOT_RUN_BY_A_RUNNER`, "compiled, never executed". Lines 1-82 duplicate A24. | H | `:330` | D5 | 0 / `:330` |
| A26 | `ContactsFlowInstrumentedTest.java` (67) | `@Ignore` (MVP-deferred) and in `NOT_RUN_BY_A_RUNNER`. | H | `:331` | no | 0 / `:331` |
| A27 | `DeviceActionInstrumentedTest.java` (128) | Its runner was removed in `49b1bf4c`. Nothing writes its fixture. | H | `:332` | no | 0 / `:332` |
| A28 | `HostedResultsLifecycleInstrumentedTest.java` (23) | Uses a stub `PluginCall` and a null bridge, then asserts a literal (T3). | M | registry `:269` | no | 0 / `:269` |
| A29 | `KeptCaptureLegacyPathInstrumentedTest.java` (101) | Legacy `Pictures/` reservation (A1). | H | registry `:253`; `test/owned-captures-legacy-path.test.mjs`; → C7 | D1 | 1: `test/owned-captures-legacy-path.test.mjs` / `:253` |
| A30 | `LiveAgentInstrumentedTest.java` (128) | Never run. No script passes `liveAgent`. | H | `:333`; comment `PrototypeFlowInstrumentedTest.java:18`; `test/android-instrumentation-runner.test.mjs:591` comment | no | 1: `PrototypeFlowInstrumentedTest.java` / `:333` |
| A31 | `LocalAgentProviderInstrumentedTest.java` (81) | Pure-function checks of upstream `NativeProviderSlot` and `LocalAgentProviderAdmission`, run through test-only delegates in main. | H | registry `:270`; B-row `AlphaLocalAgentPlugin` provider delegates; mention in `test/browser/local-provider-settings.spec.ts` | no | 1: `local-provider-settings.spec.ts` / `:270` |
| A32 | `LocalServerSocketReleaseInstrumentedTest.java` (29) | Never run. It measures Android, not Alpha. | H | `:326` | no | 0 / `:326` |
| A33 | `NoteAudioMetadataEncryptedInstrumentedTest.java` (33) | Tests the plaintext legacy metadata migration (A1). | H | registry `:245`; → C7 | D1 | 0 / `:245` |
| A34 | `PairedMapsInstrumentedTest.java` (97) | In `NOT_RUN_BY_A_RUNNER`. Nothing writes `paired-maps-fixture.json`. PRD: no pairing. | H | `:334` | D5 | 0 / `:334` |
| A35 | `PairedReminderInstrumentedTest.java` (84) | Same as A34. | H | `:335` | D5 | 0 / `:335` |
| A36 | `PhotosFixtureRecoveryInstrumentedTest.java` (33) | An operator tool that was "never part of a campaign". | H | `:336` | no | 0 / `:336` |
| A37 | `PosterCalendarJourneyInstrumentedTest.java` (204) | Drives the removed Camera Scan mode. The gate `posterJourney` has 0 hits. | H | `:325`; `test/android-instrumentation-runner.test.mjs:627` | no | 0 / `:325`, runner test `:627` |
| A38 | `PublicCloudTransportProbeInstrumentedTest.java` (159) | A test-mocks CLI-session diagnostic. Its gates have 0 hits. | H | `:338` | no | 0 / `:338` |
| A39 | `RemoteAgentInstrumentedTest.java` (54) | PRD: no pairing. Its runner was removed in `49b1bf4c`. | H | `:339` | D5 | 0 / `:339` |
| A40 | `ResidentModelResponseContractTest.java` (33) | Tests the test helper `ResidentModelResponseContract`. Runs only under `--all`. | H | none (the helper stays; `ResidentServiceInstrumentedTest` uses it) | no | `ResidentModelResponseContract` → helper, `ResidentServiceInstrumentedTest`, `android-instrumentation.ts` |
| A41 | `SpeechPipelineTraceInstrumentedTest.java` (71) | In `NOT_RUN_BY_A_RUNNER`. Tests upstream `ai.eliza.voice` only. | H | `:341` | no | 0 / `:341` |
| A42 | `UiDispatchInstrumentedTest.java` (27) | Tests the `TestUiDispatch` helper only (T5). | H | registry `:257` | no | 0 / `:257` |
| A43 | `VoiceFloatPathDiagnosticInstrumentedTest.java` (77) | In `NOT_RUN_BY_A_RUNNER`. Only asserts that evidence was written. | H | `:342` | no | 0 / `:342` |
| A44 | `JourneyJ05InstrumentedTest.java` (~55) | Runs two methods that `BrowserPageQuestion` already runs in the CI reading lane. | M-H | registry `:238`; `test/android-instrumentation-runner.test.mjs:628-643` | no | 1: `BrowserPageQuestionInstrumentedTest.java` / `:238`, runner test `:628-643` |
| A45 | `AccessibilityBounds.java` | A separate class only so that a host javac test can load it. One real caller. Inline it into `TalkBackOrder`. | H | `TalkBackOrder.java:90`; delete `test/accessibility-visible-bounds.test.mjs` and `test/fixtures/AccessibilityBoundsTest.java` | no | `AccessibilityBounds` → `TalkBackOrder.java`, those 2 tests |
| A46 | `DispatchClaim.java`, `ReminderLifecycleTestAccess.java`, `ReminderNotificationActions.java`, `InboxFixtureScope.java`, `ReadinessEpoch.java` | Each has a single user. Merge into `TestUiDispatch`, `ReminderTestAccess`, `ReminderUiTestDriver`, `InboxFixtureConnection` and `StartupDocumentProbe`. | H | the merge target | no | (merge) |
| A47 | `InboxOperationJournalInstrumentedTest.java` (33) | Same scenario as `LargeInboxAttachment` (T4). Merge into it. | H | registry entry | no | (merge) |
| A48 | `ClockRepeatDaysInstrumentedTest.java` (53) | Tests vendored `ClockHandoff`/`ClockDays`. One assertion moves to `ClockAgentReview`. | M-H | registry entry | no | not re-verified (M-H) |
| A49 | `CalendarSyncProviderInstrumentedTest.java` (75) | The renderer side of linked sync is unreachable. | M | → C3 | D4 (renderer); open for the Android bridge | — |
| A50 | `BrowserReadingLiveInstrumentedTest.java` + `scripts/android-browser-reading-live.ts` | Pairs a "Local development agent". No package.json or workflow caller. | M | → C4 | D5 | — |
| A51 | `PairedAsr`, `PairedAsrLive`, `PairedVoice`, `PairedVoiceLive` `InstrumentedTest.java` (262) + `scripts/android-paired-speech-live.ts` | Paired-agent speech. The Live classes run only from a manual script. | M | → C4 | D5 | — |
| A52 | `ScopedVoicePlaybackInstrumentedTest.java` (179) | Exercises only the paired `remote:` route. | M | → C4 | D5 | — |
| A53 | `HostedBackgroundWorkerInstrumentedTest`, `HostedProcessRestartInstrumentedTest` | Exercise `remote:`-credential hosted delivery. | M | → C4 (simplify, or delete with C4) | D5 | — |
| A54 | `AssistantInstrumentedTest.java` (169), `AssistantResidentReuseInstrumentedTest.java` (101) | Launch `AlphaAssistActivity`, which is `enabled=false`, so they cannot pass. | H (cannot pass) | registry `:187,:267`; `scripts/owner/emulator-campaign-check.ts:42,57`; → C11 | open (the D7 activity stays; fix or delete the tests) | — |
| A55 | `WorkflowLegacyReminderUpgradeInstrumentedTest.java` (53) | Seeds come from the old package's data (A1). | M | → C7 | D1 | — |
| A56 | `ResetExternalFixtureInstrumentedTest.java` (154) | No runner passes its args. Reset is "Unfinished (#409)". | M | registry exclusion | open | — |
| A57 | `PhotosForeignLibraryInstrumentedTest.java` (69) + `notification-fixture` `MediaFixtureActivity.java` + `assets/synthetic-blue.mp4` + manifest line 4 | Never receives its `photosForeign*` args, so it is always skipped. | M | `android-instrumentation.ts:255` | open (wire it or delete it) | — |
| A58 | `VideoCopyClosedFailureReviewInstrumentedTest.java` (53) | No runner. | M | `NOT_RUN_BY_A_RUNNER`; B-row `AlphaPhotosPlugin.preserveClosedVideoCopy` | open | — |
| A59 | `PhotoReplaceInstrumentedTest.java` (319), `VoiceWorkerSettlementInstrumentedTest.java` (61), `ReminderDeletionJournalInstrumentedTest.java` (10) + `ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java` (89) | Test upstream engine internals. Move them upstream, then delete. | M | registry entries | open (needs an upstream PR, D14) | — |

### A.3 Android main source and modules

| # | File | Evidence | Conf. | Dependants | Owner | Grep |
|---|---|---|---|---|---|---|
| A60 | `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaListenerPlugin.java` (8) | The renderer uses only `Sense`. The same `SensePlugin` is already registered at `MainActivity.java:356`. | H | `MainActivity.java:355`; `test/always-on-listener.test.mjs:29-45`; `test/support/feature-parity.mjs:66`; `specs/quint/native/manifest.json:219,260` | no (a dead helper; D7 keeps the listener itself) | `AlphaListener` → 4: `MainActivity.java`, `specs/quint/native/manifest.json`, `test/always-on-listener.test.mjs`, `test/support/feature-parity.mjs` (0 in `apps/`) |
| A61 | `.../NativeReadEpoch.java` (11) | No reference under `android/`. | H | `test/native-read-epoch.test.mjs`; `test/fixtures/NativeReadEpochTest.java`; `specs/quint/native/{manifest.json,README.md}`; `specs/quint/refinement/native/{ComponentTraces.java,README.md,index.mjs}`; `feature-parity.mjs` | no (Quint model edit needed, D11) | `NativeReadEpoch` → 9, all tests, specs or docs; 0 in `android/` |
| A62 | `.../CalendarCreationStore.java` (13) | A facade "for installed-state acceptance tests". | H (after the edit) | `AlphaCalendarPlugin.java:97` → call upstream directly; `CalendarCreationRecoveryInstrumentedTest`; A23; `specs/quint/application/manifest.json`; `feature-parity.mjs` | no | `CalendarCreationStore` → 5: `AlphaCalendarPlugin.java`, 2 androidTests, application manifest, feature-parity |
| A63 | `CalendarZones.java`, `HostedDeliveryCancelled.java`, `HostedStorageFault.java`, `NavigationOpenRequest.java`, `SourceRenewalHost.java`, `VoiceEventAdmission.java`, `WorkflowNoticeTapsFactory.java`, `AlphaImageCapabilities.java` | Single-method or two-line classes. Merge each into its user. | H | the merge target | no | (merge) |
| A64 | `android/video-fixture/` (`build.gradle`, `AndroidManifest.xml`, `VideoFixtureActivity.java`, `VideoCopyInstrumentedTest.java` 203, `VideoCopyPreservationInstrumentedTest.java` 182, `assets/qa-source.json`, `assets/qa-long.mp4` 362 KB) | Not in `VERIFIED_TASKS`. No script or workflow builds `:video-fixture`. `qa-source.json` points at deleted classes. `qa-long.mp4` has no reader. | H | Move `assets/qa-source.mp4` to `test/fixtures/` and update `test/browser/native-video-library-change.spec.ts:7` and `scripts/ci/affected.ts:14`. Remove the module row from `android/consumer-host.json:46` and the name from `test/android-host.test.mjs:119,122`. | no | `video-fixture` → 8, but only `consumer-host.json`, `affected.ts`, `android-host.test.mjs` and `native-video-library-change.spec.ts` (`qa-source.mp4`) are real. The rest are the string `'video-fixture'` used as a test id. `qa-long` → 0. |
| A65 | `android/notification-fixture/synthetic-media-provenance.json` | Provenance note with no reader. | H | none | no | `synthetic-media-provenance` → 0 |
| A66 | `android/signing/public/PROVENANCE.json` | No reader. Only the `.pem` files in that folder are read. | H | none | no | `PROVENANCE.json` → 0 |
| A67 | `android/signing/public/fingerprints.json` | No reader of the committed copy. Its digests are duplicated in `os-custody-expected.json` and `release-signer.json`. | M | none | open (ceremony record) | — |
| A68 | `LegacyCloudRecovery.java` (82) | → C5 | M | → C5 | D1 | — |
| A69 | `PairedAgentCredential.java` (34), `PairedSpeechContract.java` (15), `HostedTransport.java` (48) | → C4 | M | → C4 | D5 | — |
| A70 | `AlphaAssistActivity.java`, `AlphaPowerVoiceActivity.java`, `AlphaQuickSettingsTile.java` | All `enabled=false`, with no enabler anywhere. | M | → C11 | D7-keep | — |
| A71 | Seven `android/sense/.../*.java` identity shims (`ConsentActivity`, `IndicatorLeaseProvider`, `ListenerActionReceiver`, `ListenerControlProvider`, `ListenerTileService`, `ListeningService`, `SenseApplication`) | Needed only because `componentPackage` is the product package. The listener has never shipped. | L-M | → C11 | D7-keep | — |

### A.4 Renderer (`apps/app/src/`)

Re-export shims are files whose whole body re-exports another module. Deleting one means rewriting its importers
to import the target directly. Grep hits for a shim are mostly importers to rewrite, not evidence against deleting it.

| # | File | Evidence | Conf. | Dependants | Owner | Grep |
|---|---|---|---|---|---|---|
| A80 | `browser/file-archive.ts`, `browser/scan-correction.ts`, `browser/scan-edges.ts` (1 line each) | Pure re-exports. | H | Importers: `prototype/browser-camera.ts`, `prototype/scan-correction-review.ts`. Specs that import the shim path in-page: `test/browser/files-bulk.spec.ts`, `scan-correction.spec.ts`, `scan-review-keyboard.spec.ts`, `scan-edges.spec.ts`. `test/browser-camera-storage.test.mjs`, `test/scan-document-drafts.test.mjs`, `specs/quint/services/{manifest.json,scan-source-conformance.mjs}`, `specs/quint/refinement/services/scan.mjs`, `feature-parity.mjs`. | no | `file-archive` → 7 (3 are lucide icon names); `scan-correction` → 11; `scan-edges` → 3 |
| A81 | `prototype/assistant-draft-controller.ts` (7) | Alias-only shim. | H | 6 importers (`browser/calendar-editor-draft.ts`, `prototype/{agent-adapter,calendar-edit-draft-adapter,calendar-form-draft-adapter,canonical-calendar-drafts,inbox-unsaved}.ts`); `specs/quint/application/manifest.json`; `specs/quint/refinement/application/calendar-adapter-fixture.mjs`; others | no | `assistant-draft-controller` → 17 |
| A82 | `prototype/canonical-notes-editor.ts` (1) | Rename re-export. | H | `prototype/canonical-notes-ui.ts:12`; `specs/quint/application/manifest.json`; `test/browser/notes-photos-list-focus.spec.ts`; `feature-parity.mjs` | no | `canonical-notes-editor` → 4 |
| A83 | `prototype/mock-attention.ts` (4) | Its only importer, `data-adapter.ts:2`, already imports `model.js`. | H | `prototype/data-adapter.ts`; `feature-parity.mjs` | no | `mock-attention` → 2 |
| A84 | `prototype/scan-text-layer.ts` (1) | `export *` shim. All 3 importers import only the type `ScanTextLine`. | H | `prototype/{scan-document,scan-pdf,scan-searchable-review}.ts`; `specs/quint/services/manifest.json`; `specs/quint/refinement/services/scan.mjs`; `feature-parity.mjs` | no | `scan-text-layer` → 6 |
| A85 | `prototype/maps-chat-adapter.ts` (current 86 lines) | Dead copy. `main.tsx:46` imports `installMapsChatAdapter` from `maps-adapter`, and `mapsChatText` lives in `runtime/action-message-presentation.ts`. | H | `prototype/calendar-approval-adapter.ts` (comment); `scripts/prepare-client-features.ts`; `specs/quint/application/manifest.json:4254,4299`; `feature-parity.mjs:385`; `maps/guidance.ts` importer. The file may be reused as the home of the moved live chat adapter. | no | `maps-chat-adapter` → 7 (no `import` from apps) |
| A86 | `maps/agent-context.ts`, `background-navigation.ts`, `cloud-session.ts`, `contracts.ts`, `device-navigation.ts`, `guidance.ts`, `route-distance.ts`, `runtime.ts`, `screen.ts` (9 × 1 line) | Each is one `export * from '.eliza/.../plugin-maps/src/client/*'` line. | H (mechanical) | In-folder relative importers (for example `maps/cloud-maps.ts:2` `./cloud-session` and `maps/resident-relay.ts:4` `./device-navigation.ts`); `prototype/maps-adapter.ts`, `agent-adapter.ts`, `runtime/device-actions.ts`, `browser/location*.ts`, `browser/workflow-{location,trigger-runtime}.ts`. Scripts: `test-cloud-maps.ts`, `test-maps-device-navigation.ts`, `test-maps-reroute-freshness.ts`. Quint: `specs/quint/services/manifest.json` (several rows), `specs/quint/native/manifest.json:630`, `specs/quint/application/manifest.json:2838`, `specs/quint/refinement/services/{maps.mjs,maps-screen-source.mjs}`. Tests: `test/maps-navigation.test.mjs:171`, `test/cloud-maps-session.test.mjs:15`, ~9 browser specs that import `maps/runtime` in-page; `feature-parity.mjs:319-321`. | no | `maps/<name>'` → 0 to 3 each. A second grep for `./cloud-session` and `./device-navigation.ts` found the in-folder and harness importers above. |
| A87 | `runtime/assistant-draft-record.ts` (3) | A one-line type alias. | H | `prototype/inbox-unsaved.ts`; `specs/quint/application/manifest.json`; `feature-parity.mjs` | no | `assistant-draft-record` → 4 |
| A88 | `runtime/calendar-availability.ts` (20) | Pure re-export. | H | `prototype/{agent-adapter,calendar-availability-review}.ts`, `runtime/phone-context.ts`; `scripts/test-calendar-availability-{flow,provider-rows}.ts`; `test/calendar-availability{,-reader}.test.mjs`; `test/browser/calendar-availability.spec.ts`; `test/fixtures/CalendarAvailabilityReaderTest.java`; `feature-parity.mjs` | no | `calendar-availability` → 10 |
| A89 | `runtime/gmail-grants.ts` (24), `runtime/gmail-read-ahead.ts` (2), `runtime/mail-preview.ts` (2), `runtime/maps-contract.ts` (1), `runtime/inbox-unsaved-record.ts` (6), `runtime/note-dates.ts` (1), `runtime/notes-contract.ts` (1), `runtime/reviewed-mail-context.ts` (7), `runtime/telephony-actions-contract.ts` (10) | Pure re-exports. | H (mechanical) | Importers in `prototype/` and `runtime/`; `scripts/prepare-client-features.ts`; `scripts/inbox-adapter-fixture.ts`; `scripts/test-inbox-*.ts`; `specs/quint/{application,services}/manifest.json`; `specs/quint/refinement/application/google-*.mjs`; `specs/quint/refinement/services/inbox-coordinator-ports.mjs`; `specs/quint/refinement/application/notes-coordinator.mjs`; host tests `gmail-read-ahead`, `mail-preview`, `inbox-draft-copies`, `context-selection`; `feature-parity.mjs` | no | `gmail-grants` 20; `gmail-read-ahead` 5; `mail-preview` 4; `maps-contract` 3; `inbox-unsaved-record` 9; `note-dates` 4; `notes-contract` 15; `reviewed-mail-context` 5; `telephony-actions-contract` 5 |
| A90 | `runtime/voice-assistant.ts` (27), `runtime/voice-turn-routes.ts` (31) | Re-export shims, each with one product importer (`voice-adapter.ts:39,35`). | H | `prototype/{voice-adapter,agent-adapter}.ts`; `runtime/voice-timing.ts`; `scripts/{aggregate-voice-latency,native-voice-latency,native-voice-latency-emulator,prepare-client-features}.ts`; `specs/quint/native/manifest.json`; `test/{live-voice,voice-assistant,voice-turn-routes}.test.mjs`; `feature-parity.mjs`; text mention in `NativeVoiceLatencyInstrumentedTest.java` and `docs/prd.md` | no | `voice-assistant` → 24 (generic word); `voice-turn-routes` → 9 |
| A91 | `runtime/notes-organize-contract.ts` (68) | Identical to the upstream projected twin except for one signature. Only caller: `agent-adapter.ts:1057`. | H | `prototype/{agent-adapter,notes-organize-executor}.ts`; `scripts/prepare-client-features.ts`; `test/notes-organize.test.mjs`; `feature-parity.mjs` | no | `notes-organize-contract` → 5 |
| A92 | `runtime/live-segment-stream.ts` (11) | No `src` importer. | H | `test/voice-assistant.test.mjs`; `specs/quint/native/manifest.json:74`; `feature-parity.mjs` | no | `live-segment-stream` → 4 (0 in `apps/`) |
| A93 | `runtime/live-voice.ts` (34) | Only a type-only import in `native-live-voice.ts:5`. Move the type there. | H | `runtime/native-live-voice.ts` plus a dozen string mentions in scripts and specs (`live-voice` is also a generic token) | no | `live-voice` → 25 (generic token; product import is only `native-live-voice.ts`) |
| A94 | `runtime/photo-library.ts` (12) | Its wrappers are used only by `test/photo-library.test.mjs`. | M | `prototype/{agent-adapter,camera-adapter,photo-library-adapter}.ts` (check these import the upstream name); Quint manifests (application, native, legacy) | open (copy intent) | — |
| A95 | `browser/register-hosted-results.ts` (6) | Exists only to control import order. | M | `browser/register.ts`; needs upstream `registerPlugin` late-web support (D14) | no | — |
| A96 | `browser/calendar-backup.ts` (82) | → C9 | H | `browser/calendar-recovery.ts`; `scripts/storage-specs.ts`; `test/browser/calendar-backup-restore.spec.ts`; `feature-parity.mjs` | D3 | `calendar-backup` → 4 |
| A97 | `browser/calendar-linked-local.ts` (186), `browser/calendar-sync-fields.ts` (177), `runtime/calendar-linked-provider.ts`, `calendar-linked-storage.ts`, `calendar-linked-store.ts`, `calendar-sync-host.ts` (345), `calendar-sync-settings.ts` (257), `runtime/google-calendar-selection.ts` (75), `runtime/native-calendar-sync.ts` (68) | → C3 | H (renderer) | see C3 | D4 | `calendar-sync-host` → 7, `calendar-sync-settings` → 10, `google-calendar-selection` → 15 (no product importer outside the stack) |
| A98 | `runtime/legacy-calendar-preservation.ts` (22) | → C2 | H | see C2 | D1 | `legacy-calendar-preservation` → 6 |
| A99 | `prototype/legacy-notes-access.ts` (62), `prototype/notes-trash-adapter.ts` (275), `note-source-adapter.ts` (115), `note-web-source-adapter.ts` (28), `notes-query-executor.ts`, `notes-query-review.ts` | → C1 | H (legacy-only) | see C1 | D1 | `legacy-notes-access` → 7 |
| A100 | `runtime/cloud-personal-protocol.ts` (95), `cloud-personal-intent.ts` (33), `cloud-personal-setup.tsx` (14), `runtime/development-cloud-agents.ts` (149), `runtime/paired-voice.ts` (46) | → C4 | H (product); the harness still uses them | see C4 | D5 | `cloud-personal-protocol` → 11, `development-cloud-agents` → 10, `paired-voice` → 6 |
| A101 | `runtime/native-recovery-backup.ts` (16) | → C9 | M | `browser/domain-recovery.ts:24-25`; `test/browser/assistant-draft-storage.spec.ts` | D3 | `native-recovery-backup` → 3 |
| A102 | `runtime/voice-entry-policy.ts` (2) | → C10 (dormant listener invocation) | M | see C10 | D7-keep | — |
| A103 | `runtime/development-cartesia-flag.ts`, `runtime/development-cloud-voice.ts`, `runtime/digest-inbox.ts`, `runtime/agent-calendar-client.ts`, `automation-completion.ts`, `automations-route-policy.ts`, `calendar-edit-draft.ts`, `canonical-calendar-draft.ts`, `clock-agent-review.ts`, `clock-handoff-history.ts`, `note-audio-lock.ts`, `phone-dial-contract.ts`, `sms-agent-contract.ts`; `browser/` `json-domain-document.ts`, `notice-action.ts`, `notification-recovery.ts`, `preference-recovery.ts`, `reminder-{action,creation}-document.ts`, `reminder-recovery.ts`, `screen-locked.ts`, `video-codecs.ts`, `calendar-recovery.ts`, `deleted-note-origins.ts`, `development-cloud-document.ts`, CSS `calendar-meeting.css`, `calendar-response.css`, `mail-attachments.css`, `review.css`, `selected-document-viewer.css`; `prototype/` `calendar-edit-draft-adapter.ts`, `scan-event.ts`, `notes-recorder-control.ts`; `maps/basemap.ts`; `browser/workflow-resources.ts`, `workflow-messages.ts` | Small single-importer files. Merge each into its owner (the chunk "Files" tables name the target). | H | the merge target plus manifest and feature-parity rows | no | (merge, not a reference check) |
| A104 | `prototype/fixtures.empty.js` | Needed only while `model.js` imports fixture seeds. | — | → C13 | D6 | — |

### A.5 Scripts (`scripts/`)

| # | File | Evidence | Conf. | Dependants | Owner | Grep |
|---|---|---|---|---|---|---|
| A110 | `scripts/aosp-unsigned-debug.init.gradle` | No reference in the repo or in `vendor/eliza`. | H | none | no | `aosp-unsigned-debug.init` → 0 |
| A111 | `scripts/cloud-subscription-latency.ts` | A one-off probe for #410. Only self-referenced. | H | none | no | `cloud-subscription-latency` → 0 |
| A112 | `scripts/compare-prototype.py`, `scripts/prototype-capture.ts` | Prototype comparison tooling with no caller. | H | none | no | `compare-prototype` → 0; `prototype-capture` → 0 |
| A113 | `scripts/fingerprint-voice-assets.ts` | Only an allow-list regex names it. | H | `test/llama-cpp-only.test.mjs:36` | no | `fingerprint-voice-assets` → 1: `test/llama-cpp-only.test.mjs` |
| A114 | `scripts/stage-native-apps.ts` | Only a comment names it. It is a candidate receipt dated 2026-09-29. | H | comment `PasswordProviderSupport.java:16` | no | `stage-native-apps` → 1: `PasswordProviderSupport.java` |
| A115 | `scripts/test-automatic-update-platform.ts`, `scripts/test-update-confirmation-platform.ts` + `test/fixtures/automatic-update-android/`, `test/fixtures/update-confirmation-android/` | No runner or wrapper. The fixtures are used only by these scripts. | H | delete together | no | scripts → 0 each; fixtures → 1 each (their own script) |
| A116 | `scripts/test-native-calendar-consumer.ts` | No reference. | H | none | no | `test-native-calendar-consumer` → 0 |
| A117 | `scripts/maps/test-region.py`, `scripts/maps/test-renderer.ts`, `scripts/maps/test-recovery-renderer.ts` | No reference. | H | none | no | `maps/test-region` → 0; `maps/test-renderer` → 0; `maps/test-recovery-renderer` → 0 |
| A118 | `scripts/test-photo-filter-png-reference.ts` | Only named inside a JSON asset. | H | `android/app/src/androidTest/assets/photo-filter-goldens.json` (text field) | no | `test-photo-filter-png-reference` → 1: `photo-filter-goldens.json` |
| A119 | `scripts/removed-profile-flags.ts` | A tombstone that refuses removed flags (A8). | H | 5 call sites: `android-build-preflight.ts`, `build-android.ts`, `gradle-verification.ts`, `quint-lib.ts`, `stage-local-agent-runtime.ts`, `verify-apks.ts`. Tests: `test/{android-build-path,one-runtime-profile,upstream-pin-guard}.test.mjs`. Also `product.gradle:8-9` refusal (B). | no | `removed-profile-flags` → 9 (callers and tests above) |
| A120 | `scripts/aosp-clock-contract.ts`, `scripts/aosp-image-capability.ts` | Pure re-exports of vendor modules. | H | `scripts/stage-aosp.ts`, `scripts/verify-aosp-clock.ts`; `test/{aosp-release-signing,aosp-image-capability,aosp-sms}.test.mjs` | no | `aosp-clock-contract` → 3; `aosp-image-capability` → 3 |
| A121 | `scripts/ci/reproduce-bun-spawn-seccomp.py` + `.github/workflows/bun-spawn-seccomp.yml` | A one-off reproduction that ran twice on 2026-10-03. | H | `scripts/ci/affected.ts` (regex entry) | no | `reproduce-bun-spawn-seccomp` → 1: its workflow; `bun-spawn-seccomp` → `affected.ts` + the script |
| A122 | `scripts/ci/reproduce-paradee-model.py` + `.github/workflows/reproduce-paradee-model.yml` | Never run. | H | `test/ci-pin-bound-scripts.test.mjs` | no | `reproduce-paradee-model` → 2: the workflow and `ci-pin-bound-scripts.test.mjs` |
| A123 | `scripts/prepare-quint-history.ts` | → C17 | M | `package.json` `quint:prepare-history`; `test/quint-tla-inventory.test.mjs` | D11 | `prepare-quint-history` → 2 |
| A124 | `scripts/qualify-head.ts` (465) | Re-runs CI qualification locally. Only tests import it. | M | `test/qualify-head.test.mjs`; parts of `test/pilot-units.test.mjs`; `scripts/android-resident-instrumentation.ts`; `test/docs-links.test.mjs` | open (evidence tooling) | — |
| A125 | Workflow host probes `scripts/test-reviewed-workflow-host.ts`, `test-workflow-{approvals-host,approval-crash,cancel-recovery,lifecycle-host,metadata-host}.ts`, `scripts/fixtures/workflow-host.ts`, `start-reviewed-workflow-agent.ts` | Evidence tooling with no workflow caller. | M | their wrapper tests | open | — |
| A126 | `scripts/owner/{forged-branch-scan,incident-access-audit,incident-ci-exposure,merge-review}.ts`, `owner/incident-2026-10-27-iocs.json` | Only `test/owner-*.test.mjs` call them. | M | `test/owner-*.test.mjs` | open (once incidents #658/#659 close) | — |
| A127 | 17 `CAMPAIGN_RUNNERS` scripts that no workflow runs | — | M | their fake-adb runner tests | open | — |
| A128 | `scripts/storage-specs.ts` + firefox/webkit Playwright projects + `storage` job | Engines the product does not ship. | M | `playwright.config.ts`; `browser.yml` storage job | open | — |

### A.6 Tests (`test/`)

| # | File | Evidence | Conf. | Dependants | Owner | Grep |
|---|---|---|---|---|---|---|
| A130 | `test/fixtures/development-scope-provider.mjs` | No reference. | H | none | no | `development-scope-provider` → 0 |
| A131 | `test/photos-native-order.test.mjs` | An exact duplicate of a test in `photos-library-patch.test.mjs` (43 of 45 lines). | H | none (glob-run) | no | `photos-native-order` → 0 |
| A132 | `test/update-channel-gradle.test.py` | No runner. | H | none | no | `update-channel-gradle` → 0 |
| A133 | `test/aosp-fresh-presets.test.py` | Only README commands name it. | H | `android/aosp/branding/{keyboard-dictation,provision}/README.md` | no | `aosp-fresh-presets` → 2 READMEs |
| A134 | `test/maps-route-distance.test.mjs`, `test/calendar-agent-write-host.test.mjs`, `test/maps-navigation.test.mjs` | Test upstream code (T5). | H | none for the first two (glob-run). `maps-navigation` imports `maps/cloud-session.ts` (A86). | no | `maps-route-distance` → 0; `calendar-agent-write-host` → 0; `maps-navigation` → 8 (generic token: androidTest class names and `scripts/maps/test-native-*.ts`, not by-file references) |
| A135 | `test/password-dev-editor.test.mjs` | Tests the developer-only vault surface. | H | none | no | `password-dev-editor` → 0 |
| A136 | `test/native-read-epoch.test.mjs` + `test/fixtures/NativeReadEpochTest.java` | Deleted with A61. | H | Quint, see A61 | no | → 0 / → 1 (each other) |
| A137 | `test/owned-captures-legacy-path.test.mjs` | Deleted with A29. Refers to a nonexistent `patches/eliza/owned-captures-legacy-path.patch`. | H | — | D1 | `owned-captures-legacy-path` → 0 |
| A138 | `test/notes-capacity-fixture.test.mjs` + `test/fixtures/NotesCapacityFixtureTest.java` | A host JVM test of an androidTest fixture (T5). | H | none (`NotesCapacityFixture.java` stays) | no | → 0 / → 1 (each other) |
| A139 | `test/accessibility-visible-bounds.test.mjs` + `test/fixtures/AccessibilityBoundsTest.java` | Deleted with A45. | H | — | no | → 0 / → 1 |
| A140 | `test/browser/notes-named-review.spec.ts` | Same three titles as `notes-review.spec.ts`. Stitches stripped source together. | H | none | no | `notes-named-review` → 0 |
| A141 | `test/browser/notes-query-review.spec.ts` | Same titles. Its subject is dead (B-row `notes-query-executor`). | H | `scripts/test-notes-query-flow.ts`; `notes-review.spec.ts` (matching cases); `feature-parity.mjs` | no | `notes-query-review` → 5 (mostly the product file of the same name) |
| A142 | `test/browser/dev-wallet.spec.ts`, `test/wallet-disabled.test.mjs` | → C8 | H | — | D2 | `dev-wallet` → 0; `wallet-disabled` → 0 |
| A143 | `test/browser/accessibility-audit.spec.ts` | Tests the helper, not the product (T5). | H | none (the helper `accessibility-audit.ts` stays; its 9 importers import the `.ts`) | no | `accessibility-audit` → 9, all importers of the helper `accessibility-audit.ts`, none of the spec |
| A144 | `test/browser/calendar-fixture.ts` | Duplicates `helpers/calendar-storage-hold.ts`. | M-H | `calendar-storage-migration.spec.ts`, `helpers/canonical-calendar.ts`, `fixtures/calendar-mounted-editor.mjs`, `fixtures/isolated-native-campaign.mjs` | no | `calendar-fixture` → 4 |
| A145 | `mock-readiness.spec.ts`, `login-field-reporter.spec.ts`, `reading-sensitive.spec.ts` (native-snippet half) | Java text-block extraction (T2). | M-H | none | no | — |
| A146 | ~40 "not e2e" specs (research tests-browser appendix, for example `calendar-options`, `dock-clearance`, `photo-filter-fallback`, `domain-*`, `dev-digest-storage`, `simulator-concurrency`, `upstream-client-features`, `view-navigation`, `calendar-linked-storage`) and 19 legacy/migration specs | No user action (T6). The legacy specs go with C1, C2, C5, C6 and C7. | M | `scripts/ci/affected.ts` path map | D10 / D1 | — |
| A147 | 23 pure source-text (A) host test files; ~268 transplant (T2) files; 23 host/Playwright same-name twins (host side) | T1, T2, T4 (research tests-host appendix). | M-H | Quint harnesses that share their transplant helpers | D10 | — |
| A148 | `test/quint-legacy-*-refinement.test.mjs` (8) + `test/fixtures/quint/*Comparison.qnt` (7) | → C17 | M | — | D11 | — |
| A149 | 4 Quint aggregate tests `test/quint-{application,services,native}-refinement.test.mjs` (and composition) **or** ~185 per-model wrappers | The same campaigns run twice (T4). | M | `browser.yml:211-221` composition step | open (which copy stays) | — |

### A.7 CI and formal specs

| # | File | Evidence | Conf. | Dependants | Owner | Grep |
|---|---|---|---|---|---|---|
| A150 | `.github/workflows/lemma-check.yml` | Broken. `browser.yml` verify duplicates it fully (Dafny on PATH, `LEMMA_REQUIRE_BACKEND=1`). | H | `specs/lemma/README.md`; `test/lemma-check.test.mjs` and `test/lemma-checker.test.mjs` (check whether they pin the workflow file or the npm script) | no | `lemma-check` → 3 |
| A151 | `.github/workflows/digest-restart.yml` | `resident-prepare.yml:44-49` runs the same `agent:test-digest-restart`. Its automatic triggers are gated off by a repository variable. | H | `scripts/ci/affected.ts:38` regex | no | `digest-restart` → 9 (mostly the npm script and test names; the workflow file itself is referenced by `affected.ts`) |
| A152 | `.github/workflows/quint-model-check.yml` | Never completed. | H | none; replacement is a nightly changed-model run | no | `quint-model-check` → 0 |
| A153 | `specs/quint/legacy/core/check-configurations.mjs`, `interaction-metadata.json`, `lifecycle-metadata.json` | No caller outside the README. | H | `specs/quint/legacy/core/README.md` | no | `check-configurations` → 1: README; `interaction-metadata` → 0; `lifecycle-metadata` → 0 |
| A154 | `specs/quint/refinement/native/AsrPipeFailureProbe.java` | No reference. | H | none | no | `AsrPipeFailureProbe` → 0 |
| A155 | `specs/quint/develop-state-review.md`, `notes-storage-getter-review-20261109.md`, `pixel-native-review-20261109.md`, `verification.md` | Point-in-time notes with stale counts. | H | none | no | → 0, 0, 0; `quint/verification` → 0 |
| A156 | `specs/quint/ui-return-review-20261109.md` | Point-in-time note. | M-H | free-text rows in `specs/quint/{application,services}/manifest.json` | no | `ui-return-review-20261109` → 2 manifests |
| A157 | `docs/formal-model-audit-2026-11/` | Point-in-time audit. Many grep hits above are in it. | M | none | open (D13 treats audit folders as removable docs) | — |
| A158 | `specs/quint/legacy/**` (11 historical comparisons, 16 upstream Core conversions) | → C17 | M | see C17 | D11 | — |
| A159 | 6 "complementary audit scope" twin Quint models | Merge them into the canonical models. | M | their manifests | D11 | — |

---

## B. Exports, functions, branches and flags inside files that stay

Grouped by file. "Unexport" means removing the `export` keyword only. Where a symbol has test-only users, the
dependant column names them.

### B.1 Android main (`android/app/src/main/java/ai/alphacompute/alphaphone/`)

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B1 | `AlphaLocalAgentPlugin.java` | `PROVIDER_MODEL_PATTERN` (483), `CLOUD_PROVIDER_BASE` (433), `cloudProviderToken` (481), `applyProviderEnvironment` (482), `applyUnboundEnvironment` (484-495), `providerCheckFailure` (300), 4-arg `saveVerifiedProvider` (323), `providerIdentity` (496-499) | `grep android/app/src/main`: declaration only | H | A31; source-slicing host tests (4, 3 and 5 files) | no |
| B2 | `AlphaLocalAgentPlugin.java` | `validProviderToken` forward (480) | 1 caller, `AlphaConnectionPlugin:225` → call `LocalAgentProviderAdmission` | H | `AlphaConnectionPlugin` | no |
| B3 | `AlphaLocalAgentPlugin.java` | `attachForTest`, `lifecycleEpochForTest`, `adoptStreamForTest`; `instrumentationRecoveryEndpoint` (44-45, 151-160, 680-689) | Only callers are the Assistant androidTests and Quint `CredentialResidentTraces.java`. `enrollForTest`/`launchedGenerationForTest` stay. | H to move out of main | A54; `specs/quint/refinement/native/CredentialResidentTraces.java` | no |
| B4 | `AlphaLocalAgentPlugin.java` | `launchSurface`, `takeInvocation` (330-348); `PowerLaunchPin`/`capturePowerLaunchPin` (101-118) | No renderer caller. The sole Power caller is disabled. | M | → C11; Quint `AssistantEntryTraces` | D7-keep |
| B5 | `AlphaDevicePlugin.java` | Plugin method `reconcileUpdate(PluginCall)` (495-497). The private `reconcileUpdate()` stays. | No caller in `apps/`, `.eliza`, `test/`, `scripts/` or `specs/` | H | none | no |
| B6 | `AlphaDevicePlugin.java` | Bounded read at 202-205 → use `ConnectionTransport.readBounded` | A duplicate in the same file | H | none | no |
| B7 | `AlphaDevicePlugin.java` | Optional `/intent` in `UPDATE_BINDING` (293, 746) | Written only by earlier bound builds (A1) | M | → C7 | D1 |
| B8 | `AlphaDevicePlugin.java:846` | Comment `// End of updater methods for host replay.` | A slice marker for `specs/quint/refinement/native/update-barrier.mjs:30` | after the AppUpdater split | Quint harness | D11 |
| B9 | `AlphaCredentialStore.java` | `providerAdmissionGeneration()` (294-302); null branch at :111 (unreachable after :110) | 0 main callers; `test/power-cold-native-pin.test.mjs:142` | H | that test | no |
| B10 | `AlphaCredentialStore.java` | `slotHash`/`slotFile` (72-73) | androidTest-only (5 classes) and test fixtures | M | androidTests | no |
| B11 | `AlphaCredentialStore.java` | `retainedLimit` (56-62); legacy branches (79-82, 105, 135, 180, 196-217, 239) | A1 | M | → C5, C7 | D1 |
| B12 | `AlphaBrowserPlugin.java` | Constant re-exports + `ephemeralProfile` (18-23) | Only 4 androidTest classes use them | H | those androidTests → `AlphaBrowserStores` | no |
| B13 | `AlphaBrowserStores.java` | `LEGACY_PREFIX`, `legacyEphemeralPrefix` (+ re-export in `AlphaBrowserPlugin`) | "Builds before P-04" (A1) | M | → C7 | D1 |
| B14 | `AlphaActionJournalPlugin.java` | Hand-built `WorkflowNoticeDelivery` (24-25) → `WorkflowNoticeTapsFactory.delivery`; `read`/`response` renames (20-21) | Duplicate or pure rename | H | none | no |
| B15 | `AlphaActionJournal.java` | Legacy terminal Clock replay branch (54-56) | "Preserve exact legacy terminal replays" (A1) | M | → C7 | D1 |
| B16 | `AlphaConnectionPlugin.java` | Instance `writeCredentialSlot`/`removeCredentialSlot` (167, 171); `alpha-transport-diagnostics` SharedPreferences write (343-344) | No main caller (androidTest casts to reach them); DEBUG-only | M | androidTests | no |
| B17 | `AlphaCloudSignInPlugin.java` | `receiptSlot` (53) | androidTest:93; slice marker `test/cloud-deployment.test.mjs:42` | M | those tests | no |
| B18 | `AlphaCloudSignInPlugin.java` | `savedSignInRecoveryStatus`, `restoreSavedSignIn` (24-29, 74-146) | → C5 | M | → C5 | D1 |
| B19 | `AlphaDeviceAppsPlugin.java` | `phone`/`sms` fields (17) | Hard-coded false. The renderer reads only `aospImage` and `contacts` (`main.tsx:380`). | H | none | no |
| B20 | `AlphaAssistActivity.java` | `takeInvocation` (57-65) | The renderer uses `Sense.takeInvocation` | H (code) | → C11 | D7-keep (the activity stays; this is a dead helper) |
| B21 | `AlphaGmailPlugin.java` | `notificationSettings` (31) | 0 callers in `apps/` (upstream wrapper exposes it) | M | none | no |
| B22 | `AlphaNoteAudioPlugin.java` | `migrateLegacyMetadata`, `migrationState`, `migrationFailures`, `migrationStatus`, `migrationWorker` | A1 | M | → C7 | D1 |
| B23 | `AlphaFilesPlugin.java` | `PREF`, `load()`, `releaseRetiredTree` | `alpha-files-tree` has no writer | H | → C7 | D1 |
| B24 | `AlphaMediaConfig.java` | `.legacyCaptures("Pictures/")` (15-16) | A1 | H | A29, A137; → C7 | D1 |
| B25 | `AlphaMailAttachmentsPlugin.java` | `MAX_BYTES`; forwards `validateOpaque`, `opaqueMime`, `read`, `hash`, `validate`; unused imports `java.nio.*`, `java.nio.charset.*`, `java.security.*` | 0 readers; only androidTest and regex pins | H | regex-pin tests | no |
| B26 | `AlphaImageCapability.java` | `featureName` pass-through | 1 main caller | H | none | no |
| B27 | `AlphaNavigationService.java` | `stopCount`, `lastStopReason`, `lastTitle`, `lastText`, `snapshot()`; pre-Q branches (77, 202-203) | androidTest and Quint only; minSdk 29 | M / H | androidTest; Quint trace | no |
| B28 | `AlphaMapsTransportPlugin.java` | Dev transport (21-67), moved to `testMocks`; `text()` (`AlphaNavigationService.bounded` already bounds) | Refuses unless `ELIZA_DEV_ALLOW_TEST_MOCKS` | H (move) | none | D6 |
| B29 | `AlphaHostedResultsPlugin.java` | Unused imports `Uri`, `PackageManager` | — | H | none | no |
| B30 | `AlphaPhotosPlugin.java` | `MEDIA_CONFIG` alias; `qaMarker` (inline it); `preserveClosedVideoCopy` (30-31) | Alias; single caller; androidTest-only (A58) | H / H / M | regex pins; A58 | `preserveClosedVideoCopy`: open |
| B31 | `AlphaVoiceCloudPlugin.java` | `instrumentationBaseUrl`, `instrumentationCredentialSlot` → `testMocks`; paired speech (268-300 + `paired` branch) | Test hooks in main; paired speech is → C4 | M | `CloudVoiceInstrumentedTest:48` | D5 for paired |
| B32 | `AlphaTelephony.java` | Plaintext journal source `"alpha-sms-sends.journal"` | A1. Needs an upstream `SmsTelephonyConfiguration` change. | L | → C7 | D1 + D14 |
| B33 | `ConnectionRoutes.java:26` | `calendarSync` | `git grep ConnectionRoutes.calendarSync` → 0 | H | none | no |
| B34 | `HostedTransport.java` | `Connections` + 4-arg constructor (12, 18-19) | Only the 3-arg constructor is used | H | none (whole file → C4) | no |
| B35 | `HostedNoticePoster.java` | `result(tap,redacted)` and `(tap,redacted,ask)` overloads (35-36); unused imports (10-12) | "Visible for builder tests" | H | `HostedResultNoticeInstrumentedTest:81` | no |
| B36 | `HostedResultNotices.java` | 1-arg `capture(String)` (75-77) | Only `test/fixtures/HostedNoticeWithdrawTest.java` and `HostedResultNoticesTest.java` | H | those fixtures | no |
| B37 | `CloudDeployment.java` (generated) | `PRODUCTION_WEB`, `PRODUCTION_SERVICES`, `*_ENTITLEMENT_AUDIENCE`, `STAGING_WEB`, `STAGING_SERVICES` | 0 Java readers. Edit the generator `scripts/cloud-deployment.ts:75`, not the generated file. | H | the generator | no |
| B38 | `DailyAppsPlugin.java` | `// MVP-DEFERRED:` commented-out code (12, 32, 135-137) | Tombstones | H | none | no |
| B39 | `NotificationAccess.java` | Forwards `component`, `apps`, `list`, `history`, `action`, `redact`, `clearHistoryBoundary`, `LOCK` (0 hits); `prefs`, `granted`, `listener`, `eventGeneration`, `signature`, `status`, `update` (androidTest-only) | — | H | androidTests | no |
| B40 | `SelectedDocumentAccess.java` | `shareUri` (0 callers); `read`, `selections`, `initialize` | Instrumentation-only, or identical to `documents()` | H | androidTests; A-row NotesDocument flow | no |
| B41 | `WorkflowNoticeDelivery.java` | `approvalTimeout`, `publishApproval`, `withdrawApproval(id,now)`, `expireApprovals`; empty alias interfaces `Storage`/`Poster`; `OwnerRoutes.Assets` | Tests and Quint only; aliases of upstream types | H | Quint traces | no |
| B42 | `NativeDigestSources.java` | 7-arg `read` overload; split into 2 constructors | Test-only callers | H | tests | no |
| B43 | `NativeDigestSources.java` | `at` fallback for `legacyAlarm` rows (79-80) | Upstream still declares `legacyAlarm` | L | upstream | open |
| B44 | `RendererCredentialSlots.java` | 3 forwards + `nativeNamespaces()` | `ConnectionInstrumentedTest` only | H | that test | no |
| B45 | `NativeDigestHost.java:26` | Unreachable action re-check | Already restricted at :18 | H | none | no |
| B46 | `WorkflowWorkerAssets.java` | Zero-read branches (:30, :68); null `packageStamp` branches | `InputStream.read(byte[])` contract | M | none | no |
| B47 | `ResetBeforeDispatch.java` | `readLegacyCloudSlot`, `distinctCredential`, legacy step (32, 37, 42-58) | → C5 | M | → C5 | D1 |
| B48 | `MainActivity.java` | Reflective PasswordTransfer registration (358-362); line 355 (A60); `isAssistantSurface()` and its 11 conjuncts | PRD excludes password transfer (→ C9); the only override is the disabled assist activity | M | → C9, C11 | D3; D7-keep |
| B49 | `NativeDeletionCoordinator.java` | Unversioned-target branch (:48 else, :51) | No product writer of version-1 targets found; the upstream path is unverified | L | — | open |
| B50 | `AlphaSystemPlugin.java` | `isAssistantLaunch` | → C11 | M | — | D7-keep |
| B51 | `PrivateSocketProbeService` | `!BuildConfig.DEBUG` check + `buildConfig true`; manifest `android:debuggable` | Only debug variants exist | H | none | no |
| B52 | `DataIntegrityProvider.java:73` | Symlink check | `NOFOLLOW_LINKS` already excludes links | H | none | no |

### B.2 Android resources, build and config

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B60 | `res/drawable/notification_icon.xml` | Clipped wordmark sub-paths (from `M226.53,99.56`; 9,299 of 24,140 bytes) + `<clip-path>` | They lie outside the 120×120 viewport and are never drawn | H (visual check) | none | no |
| B61 | `res/drawable/app_icon.xml` | Same sub-paths; possibly the whole file (minSdk 29 always selects `drawable-v26`) | Byte-pinned by `provision/source-inputs.json`; consumed by `stage-alpha-os-branding.py:133` | H / M | AOSP re-pin | open (location) |
| B62 | `res/values-night/styles.xml` | Restate as colour and bool resources | 6 of ~11 values differ | H | none | no |
| B63 | `res/values/styles.xml:10` | `windowActionBar`/`windowNoTitle` | The parent is already `DayNight.NoActionBar` | H | none | no |
| B64 | `testMocks/AndroidManifest.xml:4` | `RECORD_AUDIO` | Identical to main manifest line 3 | H | none | no |
| B65 | `res/values/eliza_passwords.xml:8-9` | Values equal to the upstream defaults | — | H | none | open (may prefer an explicit pin) |
| B66 | `res/values/alpha-system-entry.xml:2-5` | Tile strings | Used only by the disabled tile | — | → C11 | D7-keep |
| B67 | `product.gradle` | 8-9 removed-profile refusal; 33-38 `ELIZAOS_APP_LINK_HOST` input; 151-159 `verifyRuntimeWebProfile` | `build-android.ts:89` and `gradle-verification.ts:278` already strip these; nothing sets the host; `build-android.ts:304-307` refuses the same profile | H | `test/one-runtime-profile.test.mjs:57`; `test/android-host.test.mjs:110` | no |
| B68 | `proguard-rules.pro` | Lines 11, 21, 23-26, 58-59 (H); 40-41 (M); 29-36 manifest `{*;}` keeps (M) | Subsumed by broader rules, or name no compiled package | H / M | check `mapping.txt` | no |
| B69 | `android/aosp/product.json` | `physicalProduct` | No reader | H | `test/aosp-product-lock.test.mjs:45` | no |
| B70 | `pilot-system-update-enrollment.json` | `legacyOTACertificateSha256` + type member at `stage-os-update-enrollment.ts:9` | Never read | H | none | no |
| B71 | `build-toolchain.json` | `remapBuildPath`, `schema` | Never read; remap is hard-coded true | H | none | no |
| B72 | `qualified-host.json` | `jniIdentityRelocated` | A constant the stage script writes and then checks against itself (B3) | M-H | `stage-embedding-host.ts:111,149` | no |
| B73 | `qualified-voice-host.json` | `asrSlot.current`, both `componentBuild` strings (H); the `asrSlot` block (M, derivable) | No reader | H / M | none | no |
| B74 | `asr-inputs.json` | `runtimeEnv` | No reader | H | none | no |
| B75 | `consumer-host.json` | App dependencies: credentials ×2, googleid, androidx.browser, media3 ×2; the `video-fixture` module row | Already declared by the patched modules; A64 | H | confirm the resolved graph is unchanged | no |
| B76 | `local-speech/build.gradle:11-14` | Vendor fallbacks | The module is always staged; the fallback path does not exist | H | none | no |
| B77 | `verification-reviewed-groups.json` | `review` changelog text | No reader | H | none | no |
| B78 | `release-signer.json` | `apkSigningRotation` + rotation code paths | Package renamed; `lastRelease` is null | L | rotation scripts | open (high impact if an installed base exists) |
| B79 | `upstream-native-sources.json` | `patches` + patch branch of `prepare-patched-native.ts` | `"patches": []` | M | the script | open |
| B80 | `android/aosp/branding/system-entry/prepare.py` | 352-355 always-true assert; 372 patch copy; 373-393 overlay and manifest writes nothing reads | — | H | none | no |
| B81 | `system-entry/manifest.json`, `provision/source-inputs.json`, `core-launcher` (7 keys), `hidden-navigation-handle` (4 keys) | Unread fields and status keys | Every reader was grepped | H | none | no |
| B82 | `core-launcher/SOURCE-INPUTS.json`, `hidden-navigation-handle/manifest.json` | `url` fields, rebuilt and then compared to themselves (B3) | — | M | the readers | no |
| B83 | `system-entry/SOURCE-INPUTS.json` (7 rows), `provision/source-inputs.json` (6 reference rows) | Unread rows | — | M | none | open (review references) |
| B84 | `system-entry/README.md:89-116`, `power-voice/README.md:15-23`, `provision/README.md:60-65` | History narrative (A8) | — | H | none | no |
| B85 | `AlphaQsDefaultsPolicy.java` | v3 legacy-tile migration `LEGACY_ALPHA` (25-37, 52-53) | Migrates OS settings from the image before the rename | L | — | open (keep until that image is retired) |
| B86 | `AlphaFreshSetupPolicy` | `eligible`/`homeVerified` | Single-caller conjunctions kept for a host test | H | host test edit | no |
| B87 | `stage-alpha-os-branding.py` | `AlphaAppearance` activity + 4 strings + staging lines 46-48, 138 | Development surface inside the product image | M | — | open |
| B88 | `trusted-worker.mjs:1-361` checked-in prelude | Verbatim vendor output, kept in sync by a marker-slicing test | M | `test/trusted-worker-prelude.test.mjs`; needs a generation step | no |
| B89 | `video-account-fixture.js:20` | `savedSignInRecoveryStatus` | → C5 | H (coupled) | — | D1 |

### B.3 Android instrumentation (methods, receipts and imports inside kept classes)

| # | Location | Delete | Evidence | Conf. | Dependants |
|---|---|---|---|---|---|
| B100 | `CalendarFlowInstrumentedTest` 40-73 | `calendarFormPersistsOneRealEventAcrossRecreation` | Verbatim copy of `CalendarCrud:33-60` | H | — |
| B101 | `BrowserSensitiveReading:103-104`, `BrowserIsolatedReading:32` | Trailing `cancelThenApproveOnce` | Duplicates `BrowserReading` | H | — |
| B102 | `CalendarExternalEditor:208-210` | Receipt `external-calendar-result.json` | B5 | H | `scripts/test-calendar-regression.ts:110-114` |
| B103 | `CalendarDeletionRestart:79` | `addResults(calendarRestart*)` | No reader | M-H | — |
| B104 | `BrowserSignins` 79-105; `BrowserExternalHandoff.publicResolved…`; `LauncherApps` 69-92; `ClockHandoff#invalidIntent…`; `ContactsCatalog#literalSearch…`; `SettingsCrashLog#forcedUncaught…`; `SettingsSystemFacts` (2 methods); `SystemShade#everyOutcome…` + `FakeStatusBar`/`RefusingStatusBar` | Pure tests of upstream classes (T5) | Move upstream or delete | M-H | D14 |
| B105 | `CalendarAvailability.timeZoneMatchesByRulesNotSpelling` (160-166) | Unit test of a one-method class | M | runner count 4 → 3 |
| B106 | `CameraFlow.cameraDeniedForever…` (131-150), `CalendarAgentCrud.insertHandoff…` (105-122) | Never selected by a runner | M | wire a case, or delete |
| B107 | `ConnectionInstrumentedTest#productionTransportRejects…`; `CloudSignInCallback#signInSlotsAreNativeOnly`; `SettingsRoles.calendarRowMatchesRuntimeGrant`; `ReminderLifecycle.fullStoreRefuses…`; `ReminderLifecycle.dueRemindersUseASeparate…` | Duplicates of coverage elsewhere | H / M-H | — |
| B108 | `MapsInstrumentedTest` 61-80; `MapsRegionalInstrumentedTest` 22-58; `NotesSecureStorage.freshInstallLegacyMigration…` 47-75; `PhotoEdit.grantedLibrarySave…` 54-79; `ReminderAgent.receiptSurvives…` 20-38; `ReminderRecovery` `verify-reboot` branch; `ReminderNoticeQuestion…` 77-101 | Gate args that nothing passes | H (M for `MapsRegional` and `ReminderNoticeQuestion`) | — |
| B109 | `NoteAudio.optInRetiredDeletion…` 160-178; `NotesSecureStorage.secureMigrationProcessRestart…` 77-131; `NotesStorageDurability.loweredTrashCap…` 39-69; `ReminderAgent.legacyMigration…` 39-53; `ReminderOneOff` legacy rows (29, 51-56); `ReminderUpgrade` legacy seeds; `NoMockProduct.legacyMockSelectionRequiresSignIn` 47-64 | A1 legacy tests | M-H | → C7 (and C4 for NoMockProduct); `scripts/ci/pending-recovery-ui.py:24` `audio-fence` phase; `notes-secure-migration` campaign |
| B110 | `NotesDocumentInstrumentedTest` 114-183 (test-mocks import/export + restart phase) | → C9 | M | `scripts/test-native-restart.ts:56` |
| B111 | `NoteRecordingSave.transcriptPrefixIsBounded…` 26-30 | Pure static check (T3) | H | — |
| B112 | `PhotosTrash.twoActivityAlbumWrites…` + `assistant`/`blockedAlbumWorkers` (154-194) | Launches the disabled `AlphaAssistActivity` | M | rewrite as single-Activity, or delete |
| B113 | `WorkflowNoticeProcessDeath#approvalNoticeOpensOnly…` | T4 overlap with `WorkflowApprovalNoticeProcessDeath` | M | `pending-recovery-ui.py` phase and parser (line 33); `test-pending-recovery-phases.py` |
| B114 | `WorkflowNoticeTap` main-looper hold harness (15, 35, 93-127) | Tests a `TestUiDispatch` timeout | H | — |
| B115 | `WorkerCrashDiagnostic` tombstone parser (30-62), or the whole file | No assertion or script reads it | M | `ResidentWorkflowCrash:235` |
| B116 | Evidence and receipt writes with no reader: `installedGenericHttpsBrowsers` (`BrowserInstalledResolver:27`); `local-speech-evidence/*.json`; `RealClock.record()`; `PhotosTestFixture` touch trace + `ALPHA_PHOTO_TOUCH_*` println; `ReminderTapProcessDeath:92`; `speech-no-network-evidence/result.json`; `note-read-aloud.json`; `TalkBackOrder.diagnose` dump + `/sdcard/Download` screenshot; result bundles `workflowApprovalNoticeProcessDeath`, `workflowNoticeProcessDeath`, `workflowOwnerPreparedIntentSender`, `workflowReturnedTapDiagnostic_*` | B5 | H (M for local-speech WAVs and `TalkBackOrder.diagnose`) | — |
| B117 | `BoundedActivityScenario` diagnostics (27-62, 68, 116, 133, 135-138) + `ReminderOneOff:48` `diagnosticCheckpoint` | The gate `lifecycleDiagnostics` is passed by nothing | H | — |
| B118 | `AndroidShade.useAutomationFlags`/`automationFlags`; `TestUiDispatch.started()`/`DispatchClaim.started()`; `TalkBackOrder.Result.actionable/groups/seenAssistant`; `VideoInstrumentedTest.playbackDiagnostics()`; `WorkflowNoticeOwnerFixture.OWNER_SLOT`; duplicate asserts at `ResidentWorkflowCrash:284`; `BrowserAutofill:173` `assertNotNull`; unused locals `delivery`; unused helpers `voice()`/`field()` (PairedMaps/PairedReminder), `requestId` (PairedAsr); Java `hash()` in DeviceAction | No caller, or a duplicate | H | — |
| B119 | Unused imports in ClockHandoff, CrossAppRestart, DailyApps, Flow, PhotosBatch, PasswordVaultFixture, PhotosMultiShare, PrototypeFlow, ReminderDeletionStorage (8), Shell, SelectedDocument, SettingsFlow, SpeechPipelineTrace, WebViewTestDriver | Import-only occurrences | H | — |
| B120 | `scripts/android-instrumentation.ts` | Every registry and `NOT_RUN_BY_A_RUNNER` row for the A.2 deletions | — | H | `test/android-instrumentation-runner.test.mjs`; `scripts/owner/emulator-campaign-check.ts` |

### B.4 Renderer: build, flags and composition

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B130 | `build-flags.ts:7-11` | `updateChannelCheckEnabled` | `git grep` in apps, android and scripts: definition only | H | → C10 | D8 |
| B131 | `main.tsx:97-99`, `:121`, `:174`; 9 sites of `testMocksEnabled &&` before `mock`/`fixture`; `settings-adapter.ts:48` `browserDevProfile` alias; inner `testMocksEnabled&&` in `connection-ui.tsx:4004`; re-ANDed `devSurfacesEnabled` in `apps.ts:12`, `development-identity.ts:7,12`, `development-agent-document.ts:12`, `development-account-document.ts:19`, `development-cloud.ts:17`, `development-digests.ts:12,72`; `voice.ts:204` | Re-checks of flags already folded into `dev-profile.ts:7,13` | — | H | none | no |
| B132 | `main.tsx:168` and `:175` | Duplicate `installWorkflowAdapter`/`installAutomationsAdapter` call | Merge into one condition | H | none | no |
| B133 | `vite.config.ts` | `@eliza-system` alias (152-157); `@elizaos/contracts/stated-clock-time` alias (121) + `tsconfig.json:108`; `existsSync(emptyFixturesModule)` tolerance (69-70) | 0 consumers in apps, tests, scripts or `.eliza/client-features` | H (M for stated-clock-time: an upstream bump could start using it) | none | no |
| B134 | `vite.config.ts` | mock-admission stubs (30-32); `server.fs.allow` vendor entries (166-167); stubs at 28-29 (keep one of stub or fold) | — | M / L-M / H | `audit:bundle`; `npm run dev` and browser specs | no |
| B135 | `tsconfig.json` | `/src/*` path (24); `"ignoreDeprecations": "6.0"` (22) | No TS import of `/src/`; no deprecated option | H / M | run `tsc` | no |
| B136 | `vite.config.ts` | Unexport `productionContentSecurityPolicy`; `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` read in `flagOn` | 0 importers; every launcher sets the unprefixed name | H / M | — | open for the env read |
| B137 | `scripts/dev-local.ts:48` | `VITE_ALPHA_DEV_CARTESIA` | Overridden by the define at `vite.config.ts:110` | H | — | no |
| B138 | `capacitor.config.ts:10` | `android.path`, `allowMixedContent:false` | Capacitor 8 defaults | H | — | no |
| B139 | `prepare-client-features.ts` | `projectVoice` option; `CLIENT_FEATURE_PATCHES`; retired-patch guard (324-329) | No caller passes `projectVoice:false`; no importer | H | — | no |
| B140 | `product/native-cloud-runtime.ts:8`, `scripts/agent-identity.ts:13` | Identity re-validation of literal, `satisfies`-typed values | B3 | H | — | no |
| B141 | `native.ts:17-23` | `launcherListens` | Always true on both platforms | M | `main.tsx:192` | no |
| B142 | `maps/regional-provider.ts:8-18` | `regionalDataset`, `RegionalDataset` | Test-only | H | `test/dev-surface-gates.test.mjs:110,120` | no |
| B143 | `maps/map-plane.ts:33-36` | Channel validation in `resolveMapColors` | Browser serialisation is already valid | M | `test/map-theme-colors.test.mjs:68-69` | no |
| B144 | `maps/agent-navigation.ts:2`, `maps/cloud-provider.ts:3`, `maps/share.ts:4` | `export *` pass-through lines | D4 | H | importers | no |
| B145 | `product/alpha-product-registration.ts:122-274` | 146 `--alpha-photo-*` + 5 `--alpha-scan-photo-*` tokens; `--alpha-wallet-*` tokens; `inventory` entries; `dailyApps` retained key | Only `model.js` synthetic art, Wallet and legacy notes read them | — | → C8, C13, C1 | open (photo tokens) / D2 / D1 |
| B146 | `prototype/README.md:24-26, 33`; `model.js:119` "See CONTRACT.md"; `PLAN.md` refs (`files.ts:31`, `agent-adapter.ts:974`, `notes-folders-adapter.ts:6`, `model.js:3178,3220`); `#411`/`#701`/`issue 408` comments; `mvp-features.ts:3-17` narration | Tombstones and pointers to files that do not exist (A8) | H | none | no |

### B.5 Renderer: `browser/`

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B150 | `browser-poll.ts:15-86` | `createSessionSaver`, `SessionSaver`, `saveRetryDelay`, `retryDelayForCount`, `SAVE_RETRY_*` | `git grep -w createSessionSaver -- apps`: definition only | H (as unshipped code) | `test/browser-session-persistence.test.mjs`; Quint `browser-tab-lifecycle.mjs` + manifest; LemmaScript proof | open (delete, or adopt it in the product) |
| B151 | `clock.ts:35` | `storage` listener for `alpha.browser.reminders.v1` | Nothing writes the key | H | — | no |
| B152 | `development-account-document.ts:33` | `storage` listener on `alpha.browser.cloud.account.v1` | Legacy key with no writer | H | — | no |
| B153 | `development-digest-occurrence.ts` | Pre-`settledOccurrences` branches; alias re-exports (24-31); `digestSourceState` wrapper; `DIGEST_RUN_WINDOW_MS` | Dev data only (A1); renames | H | — | no |
| B154 | `audio-settings.ts` | `installed` guard | Single caller | H | — | no |
| B155 | Dev documents | Self-validators `validateDevelopmentAgent`, `validateDevelopmentDigests`, cloud-document `validate`, actions `validate`, `executionPart` shape check, account `decode` checks | They validate bytes the same module wrote | M | — | no |
| B156 | `calendar.ts:99`, `daily.ts:113`, `development-execution-document.ts:24`, `cloud-connection.ts:88` | Impossible or repeated checks | — | H | — | no |
| B157 | `calendar-store.ts` | `restore()` | Used only by the backup restore | H | → C9 | D3 |
| B158 | `calendar-editor-draft.ts:27`; `development-cloud-ui.tsx:26,28` + `development-identity.ts:22-25` `developmentOwnerRecovery` | "Recover editor storage" and recovery buttons | Backup/reset dialogs, test-mocks only | H | → C9 | D3 |
| B159 | `apps.ts` | Wallet row | — | H | → C8 | D2 |
| B160 | Inner dev gates: `simulated-apps.ts:17-18,20`, `simulated-inbox.ts:10`, `simulated-messages.ts:10`, `simulated-voicemail.ts:6`, `simulated-workflows.ts:23`, `incoming-simulation.ts:8`, `simulator-recovery.ts:12,28,31`, `simulator-writer.ts:10,18`, `location-simulation.ts:10,16,19`, `device-controls.tsx:16,51`, `development-workflows.ts:18`, `digest-storage.ts:11`, `digest-authorization-document.ts:21`; `workflow-location.ts:8` production message branch | Reachable only through the already-gated simulator entry | H (once one dev boundary exists) | — | D6 |
| B161 | `device-adapter.ts:10` | Product string "Device settings unavailable…" | The adapter is installed only under `devSurfacesEnabled` | H | — | no |
| B162 | `notifications.ts:219` | `result.collected?'Posted':'Posted'` | Both branches are identical | H | — | no |
| B163 | `device.ts:100` | `buildInfo()` alias | 0 callers | M | — | no |
| B164 | `note-audio-store.ts:12` | `audioMetadata=notesAudioMetadata` alias | Import the upstream name | H | `voice.ts` | no |
| B165 | Unexport: `DevicePreferences`, `browserDeviceFacts`, `DevelopmentGrant`, `activeFocusBlocks`, `BrowserHostedResults`, `BROWSER_ASR_UNAVAILABLE`, `LocationSimulation`, `AudioRow`, `NOTES_AUDIO_BACKSTOP_MS`, `alphaAudioDatabase`, `PendingNoteSegment`, `notificationStorageKey`, `reminderCreationStorageKey`, `reminderStorageKey`, `BrowserSensor`, `SpeechErrorCode`; `CaptureSegment`, `CalendarReviewSource`, `CalendarAlert`, `CalendarDeletionTarget`, `readCalendarEditorDraft`, `CalendarPerson`, `EditableCalendarEvent`, `RecurringCalendarRecord`, `CalendarOccurrence`, `calendarStorageKey`, `DevelopmentAgentState`, `DevelopmentMessage`, `validateDevelopmentAgent`, `DevelopmentDigestState`, `OccurrenceLoop`, `ExecutionPart` | `git grep -w`: 0 users outside the defining file | H | — | no |
| B166 | `workflow-notices.ts:25` | `savedWorkflowNoticeHistory` | 0 app callers; 3 browser specs use it through `page.evaluate` | M | those specs | no |
| B167 | `workflow-history.ts:34,49` | Hidden `description`/`noticeDescription` paragraphs | Never filled or shown | M | — | no |
| B168 | `workflow-speech.ts:1` | Alias re-export | — | H | — | no |
| B169 | `daily.ts:73-76,81` (+ `browser/daily.ts:172`) | `restoredResult` listener overload; `restoreSelected()` | No renderer caller | M | — | open (native side) |
| B170 | `voice.ts:340-344,346` | `saveRecording`, `migrationStatus` | Specs and native tests only | L-M | — | open (plugin parity) |
| B171 | `domain-recovery.ts`, `domain-document.ts`, `json-domain-document.ts`, `notification-store.ts:10-11`, `digest-storage.ts:23-35`, `preference-documents.ts:7`, `reminder-store.ts:6`, `hosted-results.ts:12`, `digest-authorization-document.ts:22,26`, `device-preferences.ts:22`, `journal-retention.ts:12-13`, `video-edit.ts:67-74`, `voice.ts:52-58,175,346`, `workflow-notices.ts:7,24,29,70`, `workflow-history.ts:55,65,79-80`, `workflow-drafts.ts:12`, `development-*-document.ts` legacy reader lambdas, `calendar-store.ts:11` | Legacy envelopes and readers | — | — | → C6 | D1 |
| B172 | `simulated-apps.ts:21,33-39`; `simulated-workflows.ts:59`; `workflow-receipts.ts:14-27,37` | Wallet simulation | — | — | → C8 | D2 |

### B.6 Renderer: `prototype/`

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B180 | `view.reply = () => null` and similar: `browser-adapter.ts:424`, `contacts-adapter.ts:123`, `inbox-cloud-adapter.ts:59`, `maps-adapter.ts:180`, `sms-adapter.ts:198`, `phone-adapter.ts:198-200`, `workflow-adapter.ts:66` | `p.reply` is replaced globally at `agent-adapter.ts:1939` (A6) | H (`phone` suggestions/status: M) | none | no |
| B181 | `native-adapter.ts` | `installed` WeakSet, `restore[]`, returned disposer, `_Component` param (20, 133, 137-139, 398, 406-408); `tileAccessibleName`/`tileStateText` re-exports (96); unexport `residentModelLabel`, `EgressPrivacy`, `PrototypeNativeOptions` | Single call `main.tsx:125` ignores the return value | H | `test/native-adapter-activity.test.mjs:15` stub | no |
| B182 | `native-adapter.ts` | `replacement()` branches for phone, messages, inbox, browser, maps, contacts, wallet + `smsPayload`, `mailPayload`, `browser()` (157-181, 207-275); tile presentation (86-108) | Those renders are fully replaced in product | M / M-H | → C12, C13 | D6 |
| B183 | `data-adapter.ts` | WeakSet guard (9, 15-16); `homeCalendarPeople`, `homeCalendarItemDescription` (213); empty table and phone/messages/inbox wraps (23-40, 62-64); Wallet (30, 65-69) | — | H / H / depends on C13 / D2 | → C13, C8 | — |
| B184 | `maps-adapter.ts` | Disposer, `disposed`, `original`, `!module` guard; template-less bindings `grid, major, fwy, water, parks, rwy, routeD, doneD, hasRoute, pins, labels, meCss, mapDown, mapUp, sheetSw, sheetTap` (289-302); `notNative`/`native`/`hasNativeMap` + `template.html:2231` | `main.tsx:126` ignores the return; 0 template references; constant values | H | Quint harness if it calls the disposer | no |
| B185 | `browser-adapter.ts` | Disposer (668) + `disposed` flag (47 uses) + `flags.disposed`; fixture flags `isNews/isEnc/isBook/isSearch/isGeneric/recents/people/agOn/confirm` (471, 473); `// host-modal:begin/end` markers + test-only parameter (577-581); identical-branch ternary (401) | Return value ignored; slice markers exist only for tests | H | `test/browser-host-modal.test.mjs` (T2) | no |
| B186 | `camera-adapter.ts` | `export {restartAfterResume}` (66); `mediaAccessDenied` + import (104-105); duplicate `owner.set` (335); disposer (1735); `legacyFile` + empty-id handling (990-1003, 1036, 1070); legacy scanned-note path (194-200) | — | H / H / H / M / M-H / → C1 | Quint `photos-window.mjs:131` (disposer) | D1 for the legacy path |
| B187 | `browser-camera.ts` | v2 → v3 photo DB migration cursor + `??row.path` fallbacks (40-45, 88, 217); re-export `editReceiptAbandoned`/`editReceiptSettled` (11-12); duplicate `mediaId` (197); unexport `SHARE_LIMIT`, `ImportedCameraImage`, `splitVideoRow` | — | H | `test/browser-camera-storage.test.mjs:135` | D1 |
| B188 | `calendar-adapter.ts` | 6 unused imports (11); `out.calendarSourceLabel/Text` (181-182); identical ternaries (182, 272, 325); `typeof setTimeout/clearTimeout` (160, 162); duplicate render wrapper (174); stale comments (21, 180) | — | H | T2 tests for the `typeof` guards | no |
| B189 | `agent-calendar-adapter.ts` | Second `views.calendar.render` wrapper (310); `typeof getAppRecordClient` (84); legacy authority (→ C2) | — | H | — | D1 for the legacy authority |
| B190 | `calendar-form-draft-adapter.ts:60` | `out.formDraftAvailable=false` | Constant | H | — | no |
| B191 | `canonical-calendar-drafts.ts:13` | `destinationChanged`/`admitted` captures + `?.call` | This file is the only definer | H | — | no |
| B192 | `canonical-notes-controller.ts:4-5` | `CanonicalNotesViewHooks` alias; `NotesPhase` re-export | — | H | — | no |
| B193 | `canonical-notes-ui.ts` | Previous-notes branch (339-340, 346-349, 352); `DEVICE_ONLY_STATE`, trash stubs, `LOCAL_HANDLES` | D1; A6 undo layer | H / M | → C1 | D1 |
| B194 | `clock-adapter.ts` | Legacy `localStorage` reader + `clockHandoffLegacyKey` (27); `blocked()` and `'Offline'` refusals (25, 61, 91) | The key is never written; the refusals are always false | H | — | no |
| B195 | `chat-overlay-motion-adapter.ts:81,182` | `chat-release:begin/end` markers | Exist only for test slicing | H | the slicing test | no |
| B196 | `context-selection.ts` | Folder context path (14, 16-103, folder half of 248-273) + `agent-adapter.ts:682`; then `installContextSelection` | → C19 | H | `test/context-selection.test.mjs` | no |
| B197 | `files-index.ts` | 73-110 `typeLabel`, `matchesFileQuery`, `compareFilesEntries`, `sortLabel`, `words`, `collator`, `SortMode`, `SortableEntry`; `'tree'` kind (`treeId`, `renameTree`, `revoke`, `revokeTree`, branches 28/47) + `selection-adapter.ts:194` | → C19 | H | `test/files-index.test.mjs`; `FilesRecentIndex.qnt` + its harness | D11 |
| B198 | `dc-lite.js:71-72` | Notes special cases | `primaryLabel`/`primaryIcon` are produced nowhere | H | — | no |
| B199 | `home-cards.ts` and `installHomeCardVisibility` | Aliases `CalendarCardState`, `HomeAgenda`, `briefOutcome`, `presentHomeNext`, `homeAgendaHeader`, `calendarCardState`, `presentHomeCalendar`, `attendeeInitials`; `installHomeCardVisibility` + `home-date-line` template blocks (template 35, 105, 4522) + `.home-date-*` CSS + `connectGoogle` + `homeShow*` | Test-only; constant false (`data-adapter.ts:203-206`) | H | `test/home-cards.test.mjs` | no |
| B200 | `contactActs`, `filesOpenKey`, home-overview card builder exports; `locationMimeTypes` self-validation | — | H | tests | no |
| B201 | `agent-adapter.ts` | `api.assist` (1399-1403); stale "Until the pin carries…" comments + `unknown` casts (1002-1003, 1014-1016, 1053-1054); unexport `declineProposal`, `composerNeedsSizing`, `managedGoogleSource`, `calendarErrorText`, `nativeCalendarScope`; Wallet terms (691, 695); tile code (82-84, 707, 1248, 1263, 1537-1589); `headsOk` (1538); legacy Notes engine | 0 callers; upstream unions now carry the types | H | → C8, C12, C1 | D2, D1 |
| B202 | `automations-adapter.ts` | `workflowDetail` output (176); `p.cachedAutomationsHome` (170) → local | 0 readers | H | — | no |
| B203 | `workflow-adapter.ts` | `!view.automationsManaged` auto-refresh branch + `'scheduled'` phase (462, 468); prototype builder template slots | `automations-adapter.ts:44` always sets it | H / M | → C13 | no |
| B204 | `workflow-authoring.ts` | `draftStorageDescription` (20); Previous-notes branches (54, 134); unreachable last arm (184) | 1 hit | H | → C1 | — |
| B205 | `voice-adapter.ts` | Paired voice route (`createPairedVoice`, `pairedVoice`, `pairedReady`, `pairedAsrReady`, `preparingPaired`, 316-331, ~45 lines); `enter()` `preparedLocal` + 297; `'review'` send-policy path (`reviewConversationTurn`, `conversationReview`, 950-954); legacy voice-note deletion and Trash path (~190 lines); A6 overrides (1253, 1269, 1354, 1355, `noSummary`, `lines=[]`); identical ternary (347); `voicePreferenceKeys` listener (1516); unexport `voiceVisuals`, `voiceBarHeights`; make the Notes API members `voiceNoteActive`, `reviewAudioDeletion`, `commitAudioNoteDeletion` closures; `hold()` call (859) | `route==='agent'` is impossible; all callers pass `undefined` | H / H / M-H / M / M / H | → C4, C10, C1, C13; Quint manifest symbol `reviewConversationTurn` | D5, D8, D1 |
| B206 | `inbox-cloud-adapter.ts` | `openInbox` + `openInboxHandler` (41, 51-52, 995, 1050); `fullDate` (921); `typeof gmailRead!=='function'` (150, 629) | Test-only; never called | H | `scripts/inbox-adapter-fixture.ts`; `scripts/test-inbox-attention-flow.ts:25` | no |
| B207 | `inbox-drafts.ts:11-14` | `ForwardSource`, `SuggestionTarget` | 0 importers | H | — | no |
| B208 | `local-speech-playback.ts` | `speakNote` (58); `typeof ResizeObserver` (136); `try{dispatchEvent}catch` (44) | 3 test callers | H | tests | no |
| B209 | `locale-time.ts` | Unexport `HourCycle`, `monthName`, `weekdayNames`, `monthNames` | — | H | — | no |
| B210 | `notes-query-executor.ts:25-82`; `notes-query-review.ts:28-53` | `executeNotesSearch`, `executeNamedNotes`, `matchNotesContent`, `matchNotesName`, `ApplyExactNotes`, `fold`, `instant`, `ReviewResult`; `reviewNoteTitles`, `reviewNamedNote` | No reference outside the file; `notes_search`/`notes_named` are not dispatched | H | A140, A141 | no (the remainder → C1) |
| B211 | `phone-adapter.ts` | `phoneRows`, `CALL_TYPE`, `nativeRows`, `nativeStatusDot`, `nativeContacts` (12-17, 215-219) | Not bound in the template | H | test; services manifest | no |
| B212 | `sms-adapter.ts` | `nativeReceipts`, `nativeSim` (0 readers); `nativeRows`, `nativeInThread`, `nativeSims`, `nativeSend`, `nativeSendMms`, `nativeAttachments`, `nativeClear`, `simLabel` (test-only) | — | H | host tests; Quint replays | no |
| B213 | `notifications-adapter.ts` | `alphaCanonicalTap`/`alphaCanonicalWake` (73); simulated-shade notices (90-212) | Test-shaped; dev-only | H / H (move) | `scripts/test-canonical-notification-navigation.ts`; Quint | D6 |
| B214 | `note-recorder.ts` + `runtime/note-recorder-driver.ts` | Live transcription stream (`live`, `syncLive`, `closeLive`, `liveFinals…`, `displayTranscript`); segment transcription pump | → C20 | H (unreachable) | — | open (A4: is it planned?) |
| B215 | `notes-document-adapter.ts:22-28` | Test-mocks text import | → C9 | H | — | D3 |
| B216 | Unexport `NOTES_TRASH_MAINTENANCE_INTERVAL_MS`, `loadNoteOrigins`, `PhoneInfoRow/Section/Client/State`, `NoteRecorderPhase`, `describeLibraryChange`, `deviceLibraryAvailable`, `createScanPdf` (M), `voicePrivacyRow` | — | H | — | no |
| B217 | `photo-library-adapter.ts:14`; `scan-review.ts:42,56` `pdfDisclosure`; `scan-correction-review.ts:9,29` `help`; `reminder-adapter.ts:27` `events` alias + duplicate refresh (486/490) | Unused, or hidden and never filled | H | — | no |
| B218 | `scan-event.ts` | Re-exports `suggestScanEvent`, `ScanEventContext` | 0 importers / identity test | H | `test/scan-event.test.mjs` | no |
| B219 | `phone.css` | 841-857 duplicate `.maps-chat-*`; 26-30 `.voice-overlay`; 202-211 `.alpha-map-share*`; 332-337 header-action rules; 341-345 `[data-alpha-notes-rec-clock]`; 558-564 `.alpha-camera-tools`; 573-578 note-card rules; 389-392 (duplicates 382); 7 (subsumed by 258) | `git grep` of each selector token → 0 outside the file | H | none | no |
| B220 | `prototype.css` | 4 `.al`; 45 `#stage`; 200-201 `.alpha-note-speech-control`; 2 and 44 `body`/`html,body` | No users; overridden by `phone.css:1` | H | in-page harnesses that import only `prototype.css` | no |
| B221 | `settings-adapter.ts` | `note` helper (756); `cloud-plan` page + `day` (919-924); `'Privacy & data'` branch (1100-1121); Models page branch (~25 lines, plausible); first `definition.back` wrap (352-357); second `componentDidUpdate` wrap (705-710, merge); `installedRows` (142-144); `mergeDeviceFacts` or its inline twin; `settingsParents.history`/`nestedParents.history`; `out.persona` dead write (737); legacy calendar rows (862-870) | Never called or unreachable | H (Models and history: plausible, needs a probe) | `test/settings-truth.test.mjs`; Quint pin on `mergeDeviceFacts` | owner picks the `mergeDeviceFacts` semantics; D1 for the calendar rows |
| B222 | `share-panel` | `emailUnavailable` option (adapter 16/23/29 + `runtime/share-panel.ts` type) | Never read | H | — | no |
| B223 | `system-shade` re-exports `overflowPullDecision`, `PULL_SLOP`, `STATUS_BAND`, `PullContext/PullStart/ShadeSurface`; `telephony-attention` line 15 + `readTelephonyAttention`; `telephony-presenters` `nameOf`, `Names`, `CallKind`, `AttentionRow`, `AttentionCard`; `telephony-review` `contactChangeLines`, `presentTelephonyReview`; `summary-source` alias re-exports (4-7) | 0 importers through these modules | H | — | no |
| B224 | `summary-note-review` hand-rolled dialog | Duplicates `openReview` (merge) | H | — | no |
| B225 | `model.js` | `LOCK_SUM` import (14) + fixtures (`fixtures.js:550`, `fixtures.empty.js:69`); IC keys `brTabs brUser camScan phSelect notesRecDot mapsStraight inboxFwd`; 45 to 83 `IC.x = IC.x \|\|` self-defaults; `typeof PN`, `pnFmt`, `pnRel` guards; `VIEWS.x &&` guards; `clearKey` (449), `noop` (1575); dead locals (`joinNext` 699-700, `nm` 395, `loc` 1097, `total` 2634, params `pnIni num`, `calMatch api`); `api.now==null`, `(api&&api.st)\|\|{}`, `(api.S&&…)`, `BR_START\|\|{}`, `MAPS_SAVED\|\|{}`; unbound render values (notes `vo.actCount/empty/bars/toCal/calIcon/calLabel/calText`, `pinIcon/pinCss`, `lk.when`, `emptyMessage`; files `pv.saveSum/sum`, `fd.toggleSort/sortLabel`; settings `persona/openChar/scrollFix`; workflows `noop`); `NOTES_WAVE` (2923); `ST_TOP` (4609); try/catch around `api.setView`, `focus`, `setPointerCapture` and scroll resets (M) | 0 uses (grep); impossible states | H | `canonical-icons.test.mjs` + the icon catalog (IC keys) | no |
| B226 | `model.js` | Heads-up banner; Wallet; reply/scripted demo; fixture views | → C12, C8, C13 | — | — | — |
| B227 | `template.html` | `r.kCalendarDisplay` row (4096); tombstone comments (3186, 4513, 4512) | `git grep kCalendarDisplay` → only this line | H | — | no |

### B.7 Renderer: `runtime/`

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B240 | `workflow-device-contract.ts:99-181` | Forked approval poster (`ApprovalPosterSession`, `ApprovalPosterNative`, `definiteNoticeFailure`, `createWorkflowApprovalPoster`) | Every user imports the upstream `workflow-approval-poster.ts` | H | none | no |
| B241 | `workflow-device-contract.ts` | `validateWorkflowReminderResult` (42-46); `parseWorkflowPhoneReview` (47-50); marker `workflow-notice-coordination:begin` (52); re-exports `SELECTED_REMINDERS_WINDOW`, `workflowObject`, `workflowId` | Test-only; no reader | H | `test/workflow-reminder-contract.test.mjs`, `workflow-output-contract.test.mjs`, `workflow-typed-schedule.test.mjs` | no |
| B242 | `voice-selection.ts` | `'agent'` in `VoicePreference` and the return type; `voicePreferenceKeys` (9-12) | `selectVoiceRoute` never returns `'agent'` | H | → C10; `test/voice-selection.test.mjs:115,148,154` | D8 |
| B243 | `voice-selection.ts` | Send-policy switch (14-29) + `setVoiceSendPolicyForTests`; Clef switch (31-40) | Constant values | M | → C10 | D8 / D7-keep (Clef) |
| B244 | `note-recorder-driver.ts:84,89-93` | `browserDevProfile && selected==='agent'` and the paired branch | Impossible route | H | → C10, C4 | D8 |
| B245 | `voice-timing.ts` | `voiceTimingMarks`, `voiceTimingRecords`, `clearVoiceTiming`, `setVoiceTimingClock`; `storage`/`clock`/`nativeEntry` options (46) | No product importer; equal the upstream defaults | M-H / H | tests | no |
| B246 | `view-navigation.ts` | `interactionAvailable()`, `ready()`, `rendererReady` | Tests only | H | 3 specs | no |
| B247 | `startup-permissions.tsx` | sessionStorage fallback `alpha:startup-permission-progress:v1` (36, 43-48); `permissionAccess` (51-54, verbatim upstream) | Never written | H | — | no |
| B248 | `startup-permission-progress.ts` | Native versions 1-3; `StartupPermissionChoice` | Historical | M-H / H | → C6 | D1 |
| B249 | `startup-permission-flow.ts` | `startupPhotoAccess`, `startupLocationAccess`, `defaultStore`, `read/writeStartupPermissionMemory`, `StartupPermissionMemory`; the `'did not confirm revoking'` substring (108) | Wrappers or test-only; no producer | H | Lemma regeneration | no |
| B250 | `workflow-intents.ts:39-44` | `legacy()` seed + `WorkflowIntentOwner` alias | Pre-document browser slots | M-H | → C6 | D1 |
| B251 | `workflow-local-time.ts` `_locale`; `automations-protocol` `automationWhen` `_zone`/`locale`; `google-accounts` `_serviceName` + callers' `serviceName`/`cloudServiceName` | Ignored parameters | H | callers | no |
| B252 | `workflow-presentation.ts` | Native probe (`workflowPresentationProtocol`, `probePresentation`, `presentationReady`) | Both bridges ship in the same APK | M | — | open (stalled-bridge behaviour) |
| B253 | Voicemail `'cloud'` transcription mode | Only `'local'` is ever installed | M | Quint model | open |
| B254 | `always-on-listener.ts` | `assistantInvocation` (53-57), `MODAL` (60) | 0 references | H | none | no |
| B255 | `always-on-listener.ts` | Dormant invocation half (`installListenerInvocation`, `openListenerSettings`, `INVOCATION_EVENT`); `main.tsx:430` | `externalVoiceInvocationEnabled = false` | — | → C10 | D7-keep |
| B256 | `agent-calendar-view.ts` | `date` helper (7, shadowed); `canonicalHomeCalendar` (48) | Never called; T2 slice only | H | `test/agent-calendar-refresh-state.test.mjs:12` | no |
| B257 | `agent-calendar.ts` | Injectable `ClientFactory` | Only ever passed `undefined` | H | — | no |
| B258 | `agent-calendar.ts` | `LegacyCalendarCapture`, `CalendarPreservation`, `transition-required`, `legacy-recovery`, `confirmLegacyRetention` | — | — | → C2 | D1 |
| B259 | `aosp-telephony.ts` | Alias types `PermissionState, RoleState, Subscription, ContactCard, HandoffStatus, HandoffResult, AccessKind`; re-exports `SMS_*_MAX*`, `MessageDirection`, `MmsSendResult`, `MessageStatus`, `SmsMessage`, `SmsSendState`, `SmsThread`, `TelephonyRole`, `TelephonyStatus` | No importer names them | H | — | no |
| B260 | `clock-contract.ts` | Re-exports `CLOCK_CAPABILITY`, `ClockOperation`, `ClockResult`, `ClockHandoffResult`, `CLOCK_DAY_NAMES`, `ClockSetRequest`, `ClockDraftRequest`; test-only aliases `clockDays`, `validateClockOperation`, `validateClockOutcome`, `describeClockHandoff` | — | H | tests | no |
| B261 | `alpha-client.ts` | `close?()` + `old?.close?.()` try/finally; `import.meta.env === undefined` shim (185) | The sole transport never defines `close` | H | — | no |
| B262 | `alpha-client.ts` | Dev loopback session (`developmentSessionsAllowed`, `developmentSessionOrigin`, `developmentOrigin`) | Used only for `kind==='local'` | M | → C4 | D5 |
| B263 | `browser-notes-document.ts` | `DocumentNotesStore` re-export, `openBrowserNotes` (test-only); legacy archive (`legacy`, `sameLegacy`, `assertLegacy`, daily key) | — | H / M | → C1 | D1 |
| B264 | `clock-handoff-history.ts` | `clockHandoffLegacyKey` + legacy reader | The upstream `legacy` option is optional | H | — | no |
| B265 | `app-speech.ts` | `testMocksEnabled` branch | D5 dev branch in the production router | M | — | D6 |
| B266 | Unexport (no outside importer): accessibility-timeout `TimeoutPort`, `ResumePort`, `ACCESSIBILITY_TIMEOUT_BASE_MS`; action-message-presentation notice constants + `WorkflowRunCard`; alpha-client `AlphaClientState`; aosp-image `AOSP_TELEPHONY_PLUGIN`; aosp-telephony `ALPHA_TELEPHONY_UNAVAILABLE`; app-record-completion `AppRecordInvalidation`; automations-protocol `AutomationKind`, `AutomationSnapshot`, `ScheduledVerb`; browser-cloud-resident `BrowserProvider*`; browser-notes-document `browserNotesKey`; calendar-approval-client `CalendarApprovalConnection`; canvas-geometry `LARGE_TEXT`, `SPLIT_CANVAS`; client-observation-support helpers | — | H | — | no |
| B267 | `cloud-protocol.ts` | `membershipBalance`; `googleCalendarFeed`; `initiateGmail`; `gmailStatus`; `requestData` options `runtimeBase`, `onStatus`; `cloudEnvironmentAvailable`; `GoogleCalendar*` and `safeMailLink` re-exports (109-116); `import.meta.env` shims (36, 48) | No caller, or scripts and tests only | H | `scripts/test-google-calendar-protocol.ts`; `scripts/test-cloud-protocol.ts:204`; `test/browser/helpers/one-calendar.ts` | no |
| B268 | `cloud-protocol.ts` | `googleCalendarSync`, `googleCalendars` | — | M | → C3 | D4 |
| B269 | Cloud sign-in types | Unexport `CloudLoginAttempt`, `CloudLoginResult`, `CloudSessionRevocation`, `CloudSignInFailureCode`, `CloudSignInGoogleMfaRequired`, `CloudSignInActions`, `AlphaAuthBrand`, `VoiceClip`; delete `SIGN_IN_SENDING`, `SIGN_IN_SIGNING_IN` | 0 importers | H | — | no |
| B270 | Sign-in port | `savedSignInRecoveryStatus`, `restoreSavedSignIn` members | — | M | → C5 | D1 |
| B271 | Cloud product class | Dev hand-off sign-in `login`/`handOffLogin`/`delay` (move to a dev subclass) | Test-mocks only | H (move) | — | D6 |
| B272 | `cloud-voice.ts` | `transcribeDevelopmentCloudRecording`/`synthesizeDevelopmentCloud` + `developerSpeech` arms; "Older bridge builds" catch in `readNativeCloudStreamTiming` | Implemented only by the dev host; the method ships in the same APK | M / H | — | D6 |
| B273 | Cloud CSS | `.alpha-membership-actions`, `.alpha-membership-footer`, `.alpha-billing-review` (5 rules), `.alpha-account-cancel`, `.alpha-auth-body`, `.alpha-provider-confirm`; overridden declarations in `connection-ui.css:4,10,18-19`; duplicate segmented rule `cloud-membership-ui.css:64` | 0 non-CSS uses | H / M (visual) | — | no |
| B274 | `cloudDelegationSlot` regex export | Move to `scripts/fixtures/cloud-delegation/native.ts` | H | — | no |
| B275 | `connection-ui.tsx` | `restoreSavedResidentHistory` + `void` (1967-1968); unexport `membershipReadDiagnostic` (552), `presentActionEntry` (1999); `typeof window/document/navigator` and `typeof …subscribeConversationEvents` guards; lazy `residentRebindQueue ??=`; `const providerChoice` (3865); busy/Cancel block (3870, always false); `cancelRecoveryReview` (2807); `saved` flag (2782-2783); orphan doc comment (2159-2165); `residentBrowserLogin`/`browserCloudLogin` (fold into `signInBrowser`); `selectCloudProvider` | 0 references, or impossible states | H | `test/recovery-restart-action.test.mjs:6` (`cancelRecoveryReview` marker) | no |
| B276 | `connection-ui.tsx` | `residentQa`/`RESIDENT_QA` + gate-QA message (256-260, 1460); test-mocks Android Cerebras form (4044-4045) + `confirmRemove` | — | M | audit marker; `local-provider-settings.spec.ts` | open |
| B277 | `connection-ui.tsx` | Hosted/paired/personal path, legacy selections, legacy text envelope | — | — | → C4, C5 | D5, D1 |
| B278 | `google-calendar-selection.ts` clear call in `google-connection-ui.tsx:224`; `googleCalendarAccountKey` export | — | H | → C3 | D4 |
| B279 | `crash-log.ts` | `INFERENCE_*` exports, `CRASH_LOG_MAX_ENTRIES`/`RETENTION_MS` re-export, `CrashSource` | 0 references | H | — | no |
| B280 | `device-actions.ts` | `ContextNotice`, `DeviceJournalIdentity`, `ReviewableDeviceOperation`, `WorkflowPresentationOperation`, `ForegroundReviewOperation`, `NamedTargetExactOperation`, `selectedNotesRead`, `validateForegroundReviewOperation`, `PendingReviewItem`, `validateReviewableDeviceOperation`; unexport `alphaDeviceActionProfile` (H); `proposalContextNotice`, `FOREGROUND_OPERATION_TYPES`, `deviceJournalContext` (M, test/script-only) | 0 references | H / M | T3 tests | no |
| B281 | `gmail-background.ts` type re-exports (4) + `gmailBackgroundMessage`; `gmail-mailbox.ts` `GmailFailure`, `setGmailReadState` | 0 / test- or script-only | H | — | no |
| B282 | `google-accounts.ts` | Optional-port fallbacks, observation-budget options, `initiateGoogleWithReturn?` fallback | The only caller always supplies them | H | — | no |
| B283 | `google-workspace-return.ts` | `nativeGoogleWorkspaceReturnAvailable` header probe | Ships in the same APK | H | — | no |
| B284 | `device-view-profile.ts` | `legacy` const and string result | Every path returns `''` | H | — | no |
| B285 | `diagnostics-export.ts` | `'offline'`, `'remote'`, `'local'`, `'cloud'`, `'paired-agent'`, `'development-agent'`; try/catch in `sanitizeNativeInferenceTiming` | Only live state is passed in | H / M | aggregator scripts that read old exports | no |
| B286 | `error-boundary` | `typeof __APP_VERSION__`, `typeof window`, `isPluginAvailable('DeviceApps')` | Vite defines it; browser-only; the plugin ships in the APK | H | — | no |
| B287 | `conversation-selection.ts` | `validate(next)` re-check; write read-back | B3 | H | — | no |
| B288 | `GMAIL_ACCOUNTS_CHANGED` | Merge into the Google event | Dispatched and listened together | M | — | no |
| B289 | `dock-clearance` header history comment; property exports | A8; test-only | H | — | no |
| B290 | `inbox-attachment.ts:6` | `AttachmentRefusedError`/`attachmentRefused` re-export | 0 importers | H | — | no |
| B291 | `inbox-operation.ts` | Re-exports `composerContent`, `composerKind`, `inboxOperationKey`, `reviewBinding`, `reviewBindingRefusal`, `ComposerEmail`, `InboxOperationRecord`, `ReviewBinding`, `attachmentBytes`, `checkOutgoingAttachments`, `outgoingAttachmentLimits`; `InboxOperation.receiptReads` | 0 src importers through this path | H | scripts and tests (repoint them) | no |
| B292 | `local-reply-speech.ts` | `holdSpeechEngine`, `releaseSpeechEngineHold`, `hold()` + `voice-adapter.ts:859`; `openMicrophoneAvailable` | No Java implementation; the call always rejects and is swallowed | H | — | no |
| B293 | `local-agent.ts` | `localAgentRefusal`; `recoveries` counter; `residentAttachable`, `ports`/`bridge`/`nativePlatform` seams; exports `requestNativeAgent`, `NativeRequestPort`, `localAgentAvailable`, `LocalAgentMethod`, `configureLocalCloudProvider`, `awaitLocalAgentStopped`; ~23-25 "Update Alpha" / "in this version" guards + optional `?` on `LocalAgentBridge`/`NativeRequestPort`; `import.meta.env` shim (69) | Test-only, or always truthy | H | host tests that inject the ports | no |
| B294 | `local-agent-storage.ts:9`, `browser-cloud-resident.ts:5`, `development-cloud-voice.ts`, `build-flags.ts` | `import.meta.env === undefined` Node shims | Exist only for Node unit tests | H once those tests go | D10 | no |
| B295 | Renderer-wide | ~35 `typeof BroadcastChannel/window/document/navigator/localStorage` guards and 27 `localStorage` try wrappers | B2, B1 | H | — | no |
| B296 | `hosted-digest-ui.tsx:289,292` | `testMocksEnabled&&connection.kind==='cloud'` | Retired hosted path | H | → C4 | D5 |
| B297 | `hosted-digest-ui.tsx`, `hosted-digests.ts`, `local-agent-storage.ts` | Optional `Pending.phase` / "older build" handling | Every writer sets the phase (A1) | M | Lemma and Quint text pins | D1 |
| B298 | `hosted-result-notices.ts` `backgroundStatus?`, `lastSuccess?`; `hosted-digests.ts` `digestToggledSpec` | No reader; one-line spread | H / M | — | no |
| B299 | `media-copy-intent.ts:14` | localStorage legacy seed | A1 | M | → C6 | D1 |
| B300 | `native-assistant-draft-recovery.ts` | Legacy fields | A1 | M | → C6 | D1 |
| B301 | `managed-service-routes.ts:19-20` | sync-v1 admissions | No renderer caller | L-M | → C3 | open |
| B302 | `image-sms.ts` | `receiptLabel` alias; `createSmsSession` wrapper | D4 | H | — | no |
| B303 | `native-connection.ts` | `memorySecretBackend` (60-67), `durableSecretsWithFallback` (125-138); unexport `browserConnectionSlot`, `ConnectionPort`, `BrowserSecretBackend` | Never called in product | H | `test/connection-step-contracts.test.mjs:88-103` | no |
| B304 | `native-connection.ts` | credentialId migrate-on-read (243-245); `removeStoredCloudCredential` (256-266) + `connection-ui.tsx:2635` | Only older builds wrote that data | M | → C5 | D1 |
| B305 | `native-connection.ts` | `remoteCredentialStore`, `nativeRemoteRequest` | — | M | → C4 | D5 |
| B306 | `subscription-entitlement.ts` | `allowanceText` (43-45); `void copy;` (69); unexport `ResidentAdmissionOutcome` | 0 references; no-op | H | none | no |
| B307 | `subscription-entitlement.ts:35-40` | Credits branch | The PRD calls credits non-policy | — | — | open |
| B308 | `notes-store.ts:10-12` | `STORAGE_FULL_CODE` | 0 src, 0 tests | H | — | no |
| B309 | `phone-workflow-authoring.ts` | `zoneOffsetMinutes` (28-29); `parsePhoneCatalog` (25) | 0 users; test-only | H | test | no |
| B310 | `notes-trash-policy.ts` | 11 forwards (keep the 4 callers via `notesTrashPolicy`), `notesTrashOverflows`, `NotesTrashPlan` | Scripts and tests only | H | scripts and tests | no |
| B311 | Unexport: `reminder-deletions` `PendingReminderDeletion`; `note-audio-deletions` `audioDeletionDocument`; `notes-trash` `browserNotesTrashKey`; `notes-folders-model` `NOTES_FOLDER_LIMIT`, `NOTES_FOLDER_NAME_MAX`, `emptyNotesFolders`; `notes-view` `noteInstant`; `owner-reminder-port` `ReminderVisibility`, `ReminderUi`, `AgentReminderStatus`; owner-reminder protocol `OWNER_REMINDER_BYTES`, `ReminderOwner`, `reminderDigest`; `owner-route-policy` `OwnerRouteGroup`; `remote-protocol` `RemoteIdentity`, `RemoteAuthStatus`, `droppedResponse`; `resident-recovery` `RecoveryReview`, `RecoveryArchive`, `ResidentBootStatus`, `residentBootLost`; `service-read-cache-store` `sharedMailKeys`; `telephony-executor` `ContactMatch`, `TelephonyExecution`; `text-scale` `LARGE_TEXT_CLASS`; `text-share` `nativeTextSharing`; `note-origin` `recordNoteOriginOf`, `RecordNoteOrigin`; `notes-secure-store` `NotesOpenStage`, `mergeNotesDrafts`, `notesDraftChanges`; `permanent-voice-deletion` `PermanentDeletionEvidence/Step`, `DeletionLease`; `notes-organize-contract` `NOTES_ORGANIZE_CAPABILITY`, `NOTES_ORGANIZE_TYPES`; `phone-context` `OWN_NOTIFICATION_SOURCE` | `grep -rlw` over `apps/app/src`, `android/app/src`, `test`, `scripts`, `specs`: 0 outside users | H | — | no |
| B312 | `photo-library.ts` | `scopePresentation`, `reviewText`, `describeLibraryOperation` | `test/photo-library.test.mjs` only | M | that test | open |
| B313 | `phone-context.ts:106-129` | `phoneContextMessage` legacy envelope + `connection-ui.tsx:1679,3389,3423`; `legacy-app-calendar-*`, `legacy-app-notes-source` kinds | — | M | → C4, C1, C2 | D5, D1 |
| B314 | `service-read-cache-store.ts:8-9,23-27,38-40` | `sharedMailKeys`/`retireSharedMail` | A one-off cleanup that runs on every start | M-H | → C6 | D1 |
| B315 | `note-origin.ts:35-39` | Whole-record revision fallback in `voiceNoteChanged` | For links made before content revisions | M | → C6 | D1 |
| B316 | `cloud-service-info.ts` | Move to `scripts/` | Only scripts and tests import it | H (move) | — | no |
| B317 | `ConnectionSnapshot` | `agents`, `cloudPersonal`, `providerSignInSelection`; `kind` values `remote`, `local`, `cloud` | — | H with C4 | → C4 | D5 |
| B318 | `passwords/password-manager.ts` | `passwordManagerHoldsEntries` export | Read only by tests | L | fence tests | no |

### B.8 Scripts, workflows and tests (partial deletions)

| # | Location | Delete | Evidence | Conf. | Dependants | Owner |
|---|---|---|---|---|---|---|
| B330 | `scripts/android-workflow-native.ts:86`, `test-calendar-regression.ts:58`, `native-test-fixture.ts:113` | `assert.equal(pkg,'ai.alphacompute.alphaphone')` self-checks | B3 | H | — | no |
| B331 | `scripts/prepare-ci-emulator.ts:67-69` | Tablet branch | Orientation is pinned to `'unspecified'` | H | — | no |
| B332 | `apps/app/public/icons/lucide/source.json:5-142` | `sourceFiles` block + generator | Only shape-checked | L | `canonical-icons.test.mjs` | open |
| B333 | `senders/sources.json:12-15` | `assetdash.com` error entry | No image on disk; the JSON is read by nothing | H | — | no |
| B334 | `delegation-return.html:2` | Redundant guards (replace with one duplicate-key check) | — | H | CSP hash recompute | no |
| B335 | `test/quint-conformance.test.mjs:30-63` | CallbackLanding block | A strict subset of the `portable.mjs` trace grid | M | — | open (canonical Quint harness) |
| B336 | `speech-env.ts` `RENAMED`/`RETIRED`; `runtime-profile.ts` CLI branch | — | M | — | open |
| B337 | package aliases `dev:local`, `quint:typecheck`, `quint:test`, `quint:simulate`, `quint:conformance` | Only `specs/quint/README.md` references them | H | that README | no |
| B338 | `android-emulator.yml` | `fused-speech` job and the `all` option | Unreachable (the build refuses, :72-76) | H | `speech-candidate.ts` | open (hosted voice staging) |
| B339 | `android.yml` | Dispatch-only verify steps (31-34, 63-82); second `setup-bun` | Duplicates `browser.yml` verify | H | — | no |
| B340 | `browser.yml:211-221` | Production-job composition refinement | Same as `test/quint-composition-refinement.test.mjs` | H | — | no |
| B341 | `android.yml:83`, `resident-android.yml:272` | `upstream stage-launcher-overlay` test | Tests `vendor/eliza`; upstream CI owns it | H | — | no |
| B342 | `release-cloud-app-signing.yml:115-117`, `publish-qualified-app-update.yml:146-150` | Legacy `.mjs` suffix fallbacks | The `.mjs` scripts no longer exist | M | — | open (oldest signable commit) |
| B343 | `required-checks-ruleset.json` | `Repository verification` entry | `Browser MVP result` already aggregates it | H | — | D12 (repository settings belong to the owner) |
| B344 | `resident-android.yml:245` or `python-suites.test.mjs:27` | One of the two runs of `resident-crash-diagnostic.test.py` | Runs twice | H | — | no |
| B345 | `test/aosp-listener-systemui.test.mjs:45` | Permanently skipped test | — | H | — | no |
| B346 | 20 environment knobs with no setter (tests-host P7) | — | H | — | no |
| B347 | `test.skip(project!=='production')` lines in 5 production specs | `testMatch` already restricts them | H | — | no |
| B348 | `production-surface.spec.ts` test 1; `native-speech.production.spec.ts:62-72`; `chat-system-notices.spec.ts` first test; 7 duplicated `chat-continuity.spec.ts` tests | Duplicates of `audit-production-bundle.ts:144` or of production twins | H | — | no |
| B349 | Test helper exports: `resident-stub.ts` `emailCode`; `accessibility-states.ts` `INSTALLED_APPS_STATE`; `helpers/legacy-notes.ts` `selectLegacyNotesSource`; drop `export` on `FlagOffMessage/Calendar/Event/Options/Schedules`, `StubStream`, `StubMapsPlace`, `ResidentStubOptions`, `TelephonyFixture`, `CanonicalCalendarFixtureOptions`, `HomeCalendarEvent`, `Violation`, `PageAuditOptions` | `git grep -w`: definition only | H | — | no |
| B350 | Text pins: `test/files-browser.test.mjs:261-262`; `test/accessibility-coverage.test.mjs:163-169`; `test/browser/mock-readiness.spec.ts:4-7`; `test/aosp-image-capability.test.mjs:156`; `test/settings-truth.test.mjs:20` | T1/T2 | H | — | D10 |
| B351 | Two upstream cases in `test/native-live-pcm.test.mjs`; upstream policy run in `login-surfaces.test.mjs:358` | Test upstream code (T5) | H | — | no |

---

## C. Retired feature paths (one coordinated deletion each)

Each unit is deleted in one commit (or one PR) with all of its dependants. Units are ordered so that later ones
can assume earlier ones are gone where noted.

### C1. Legacy "Previous notes" engine and legacy notes storage (A1, P10)

- **Owner:** D1 (delete). **Confidence:** H that it is reachable only through the "Previous notes" switch.
- **Evidence:** `notesStore` is assigned only by `selectNotesSource('legacy')` (`agent-adapter.ts:617`). The canonical
  api always sets `notesSourceMode:'canonical'` (`canonical-notes-ui.ts:320,342`), so render returns at
  `agent-adapter.ts:2087`. PRD: no app-data migration.
- **Renderer files (whole):** `prototype/legacy-notes-access.ts`, `prototype/notes-trash-adapter.ts`,
  `prototype/note-source-adapter.ts`, `prototype/note-web-source-adapter.ts`, the remainder of
  `prototype/notes-query-executor.ts` and `prototype/notes-query-review.ts`.
- **Renderer symbols:**
  - `agent-adapter.ts`: `:303-392, 558-637, 646-655, 774-788, 1046-1052, 1061-1096, 1123-1128, 1153-1159,
    1267-1322 (except 1268-1269), 1325-1331, 1353-1368, 1999-2006, 2025-2039, 2088-2096`, the legacy instance
    fields, `notesSourceOptions`, and the `notesSourceMode` branches (10 files).
  - `canonical-notes-ui.ts`: 339-352 and `DEVICE_ONLY_STATE`, trash stubs, `LOCAL_HANDLES`.
  - `camera-adapter.ts`: 194-200.
  - `workflow-authoring.ts`: 54, 134.
  - `voice-adapter.ts`: legacy voice-note deletion and Trash path (`deleteVoiceNote`, `refusedVoice`,
    `deleteVoiceNoteForever`, `reviewAudioDeletion`, `commitAudioNoteDeletion`, `voiceNoteStorage`,
    `persistNoteRecording`, `addTranscript` legacy branches, ~190 lines).
  - `note-origin-adapter` v1 path; `notes-folders-adapter` legacy release; notes-organize host legacy binding.
  - `runtime/notes-store.ts` (`LEGACY_NOTES_KEY`, `notesStorageKeys.legacy`, lines 3 and 5).
  - `runtime/notes-secure-store.ts:12-16` (`LEGACY_NOTES_SOURCE_KEYS`, `readLegacyDailyNotes`).
  - `runtime/browser-notes-document.ts` (`legacy()`, `sameLegacy`, `assertLegacy`, daily key).
  - `runtime/phone-context.ts` `legacy-app-notes-source` and note-source kinds.
  - `template.html` 2415, 2425, 2461 (unwrap 2424); `alpha-product-registration.ts` `dailyApps:"alphaphone:daily:v1"`.
- **Android:** `NotesSecureStorageInstrumentedTest.secureMigrationProcessRestartPhase` (77-131) + the
  `notes-secure-migration` campaign; `NotesStorageDurabilityInstrumentedTest.loweredTrashCap…` (39-69, with C7
  `retainedLimit`).
- **Tests and specs:** `test/fixtures/previous-notes-source-opening.mjs`; `test/notes-owner-retirement.test.mjs`;
  the legacy cases in `test/native-secure-slots.test.mjs`; `test/browser/helpers/legacy-notes.ts`; the legacy-notes
  browser specs (in the 19 legacy specs, A146); `test/browser/notes-named-review.spec.ts`; `notes-query-review.spec.ts`.
- **Quint:** `specs/quint/refinement/application/previous-notes-availability.mjs` and its model, plus the
  `specs/quint/application/manifest.json` rows for `legacy-notes-access.ts` and the notes adapters.
- **Other dependants:** `test/support/feature-parity.mjs` rows; `scripts/test-notes-query-flow.ts`.

### C2. Legacy calendar authority and preservation (A1)

- **Owner:** D1. **Confidence:** H in the renderer. Chunk app-24 rates it H; research rated it M while asking
  whether Android legacy data could reach the browser document. D1 resolves that question.
- **Evidence:** nothing writes `'legacy-google'`. The preserved document comes from an old browser layout.
- **Files:** `runtime/legacy-calendar-preservation.ts`.
- **Symbols:**
  - `runtime/agent-calendar.ts`: `LegacyCalendarCapture`, `CalendarPreservation`, `'transition-required'`,
    `'legacy-recovery'`, `confirmLegacyRetention`.
  - `prototype/agent-calendar-adapter.ts`: 15, 42-48, 57-59, 64-82, 127-128, 142, 151, 215, 219-224, 235-255,
    258, 301-304, plus the transition UI.
  - `settings-adapter.ts:862-870` (legacy calendar recovery rows); `runtime/phone-context.ts:49-52`
    `legacy-app-calendar-*`; `legacyDayOffset`; `maps-adapter` version-1 Calendar return (`calendarPlugin`,
    `mapsEventStillThere`).
- **Tests and specs:** `test/calendar-empty-bootstrap-repro.test.mjs`; `test/fixtures/calendar-mounted-editor.mjs`
  (legacy parts); `test/browser/calendar-storage-migration.spec.ts`.
- **Quint:** `specs/quint/refinement/application/calendar-preservation-confirmation.mjs` + model +
  `specs/quint/application/manifest.json` row.
- **Other dependants:** `feature-parity.mjs`.

### C3. Client-side Calendar linked-sync stack (A2)

- **Owner:** D4 (delete the renderer stack). The Android `CalendarSyncBridge` and its slot allowlist remain an open
  owner question. **Confidence:** H in the renderer.
- **Evidence:** `openCalendarSyncSettings` and `startCalendarSyncHost` have 0 importers in `apps/` or `android/`.
  Every other file is reachable only through them. The live path is `agent-calendar.ts` `changeSync`.
  `specs/quint/refinement/application/google-calendar-link-publication.md:18-22` already calls it test-only.
- **Files:**
  - `runtime/calendar-sync-settings.ts` (move the type to `google-accounts.ts`), `runtime/calendar-sync-host.ts`,
    `runtime/calendar-linked-store.ts`, `runtime/calendar-linked-storage.ts`, `runtime/calendar-linked-provider.ts`,
    `runtime/native-calendar-sync.ts`, `runtime/google-calendar-selection.ts`.
  - `browser/calendar-linked-local.ts`, `browser/calendar-sync-fields.ts`.
- **Symbols:** `CloudProtocol.googleCalendarSync`, `googleCalendars`, `calendarSyncHttp`;
  `google-connection-ui.tsx:224` clear call and the `googleCalendarAccountKey` export;
  `managed-service-routes.ts:19-20` sync-v1 admissions (open); `ConnectionRoutes.calendarSync` (Java, already 0 hits).
- **Android (owner):** `CalendarSyncBridge.java`, `CalendarSync*` main files, the `AlphaCredentialStore` and
  `RendererCredentialSlots` slot entries, `CalendarSyncProviderInstrumentedTest.java`.
- **Tests:** `test/browser/calendar-sync-settings.spec.ts`, `calendar-linked-storage.spec.ts`, `one-calendar.spec.ts`
  (sync parts), `test/browser/calendar-sync-fixture.ts`; `test/calendar-linked-store.test.mjs`,
  `test/calendar-sync-settings-navigation.test.mjs`, `test/native-calendar-sync-port.test.mjs`; the
  calendar-sync parts of `test/native-secure-slots.test.mjs` and `test/fixtures/browser-daily-stores.mjs`;
  `test/fixtures/CalendarSyncSnapshotTest.java`; `test/fixtures/google-account-panel.mjs`;
  `test/browser/accessibility-states.ts` row.
- **Scripts:** `scripts/test-calendar-sync-provider.ts`, `scripts/test-google-calendar-selection.ts`,
  `scripts/storage-specs.ts` rows.
- **Quint:** `specs/quint/services/manifest.json` and `specs/quint/native/manifest.json` rows;
  `specs/quint/application/manifest.json` row; `specs/quint/refinement/composition/ports.mjs`;
  `specs/quint/refinement/services/calendar.mjs` (linked-store part);
  `specs/quint/refinement/application/google-calendar-link-publication.{mjs,md}`;
  `specs/quint/refinement/native/credential-coordinator-platform.mjs` (sync slot).
- **Other dependants:** `feature-parity.mjs`.

### C4. Hosted, paired, remote and personal-Cloud agent paths (A3, P15)

- **Owner:** D5. Delete the product-side code now. Keep the remote/mock harness that retained e2e specs drive until
  those specs move to the resident dev bridge, then delete the harness. **Confidence:** H that no production build
  reaches it: every entry throws `pairingRetired()` unless `testMocksEnabled`.
- **Renderer files:** `runtime/cloud-personal-protocol.ts`, `cloud-personal-intent.ts`, `cloud-personal-setup.tsx`,
  `runtime/development-cloud-agents.ts`, `runtime/paired-voice.ts`; `browser/development-cloud-ui.tsx`,
  `browser/development-cloud.ts`, `browser/development-cloud-document.ts`.
- **Renderer symbols:**
  - `connection-ui.tsx`: `connectCloud`, `connectRemote`, `remoteIdentity`, `pair`, `restoreHosted`,
    `pairedRequest`, `cloudList`, `cloudManage`, `personal*`, `inspectPersonal`…`personalWork` (607-657),
    `detachCloudTarget` (658), `developmentCloud()` (800), `pairingError` (1698-1707), the `hosted` object, the 10
    hosted controller wrappers, pairing + dev Cloud JSX, test-mocks remote copy (`PENDING_FALLBACK`,
    `NO_SESSION_FALLBACK`, `NO_AGENT_SEND`/`NO_AGENT_VOICE` test arms, `RESIDENT_UNPACKAGED` remote arm,
    `NO_PROVIDER_DEVELOPMENT`), the legacy text envelope in `send` (3429-3434, 3441).
  - `'remote'|'local'|'cloud'|'mock'|'none'|'offline'` Selection kinds; `Active` and `ConnectionSnapshot.kind`
    arms; `ConnectionSnapshot.agents`, `cloudPersonal`, `providerSignInSelection`.
  - Legacy selection migrations: `migrateLegacyMock`, `migrateLegacyHostedSelection`, `LEGACY_HOSTED_SELECTION`,
    `legacyHostedKind`, `persistOffline`, the re-save in `startResidentGate`, staging `CLOUD_SERVICE` scrub.
  - `runtime/remote-protocol.ts` `RemoteProtocol` class (94-296). Keep `conversationRoomId`, `turnAbortPath`,
    `turnAbortOutcome`, `messagePageQuery` and `conversationViewHeaders`, and move them to `local-agent.ts`.
  - `native-connection.ts` `remoteCredentialStore`, `nativeRemoteRequest`; `alpha-client.ts` dev loopback session;
    `getPairedVoiceBinding` and the voice-adapter paired state (316-331); `native-reading-voice.ts:28-30`;
    `note-recorder-driver.ts:89-93`; `hosted-digest-ui.tsx:289,292`; `phone-context.ts:106-129`
    `phoneContextMessage` + `connection-ui.tsx:1679,3389,3423`; `diagnostics-export.ts` values `remote`, `local`,
    `cloud`, `paired-agent`, `development-agent`.
- **Android main:** `PairedAgentCredential.java`, `PairedSpeechContract.java`, `HostedTransport.java` + the
  `cloud`/`remote`/`local` modes in `HostedDelivery.configure`, `NativeDeviceEnrollmentKey.cloud`, paired speech in
  `AlphaVoiceCloudPlugin` (268-300 + `paired` branch).
- **Android tests:** `PairedAsr`, `PairedAsrLive`, `PairedVoice`, `PairedVoiceLive`, `PairedMaps`, `PairedReminder`,
  `RemoteAgent`, `CombinedAgent`, `CombinedAgentRestart`, `AllViewAgentContext`, `BrowserReadingLive`,
  `ScopedVoicePlayback`, `HostedBackgroundWorker`/`HostedProcessRestart` (remote parts),
  `NoMockProduct.legacyMockSelectionRequiresSignIn`; scripts `android-paired-speech-live.ts`,
  `android-browser-reading-live.ts`; their registry and campaign rows.
- **Host tests:** `test/cloud-personal-protocol.test.mjs`, `test/legacy-hosted-selection.test.mjs`,
  `test/live-voice.test.mjs` (paired parts), `test/white-label-copy.test.mjs` row, `test/automations-transport.test.mjs` row.
- **Browser specs:** first move these to the resident dev bridge: `cloud-personal-onboarding.spec.ts`,
  `cloud-personal-intent-storage.spec.ts`, `cloud-account-panel.spec.ts:40`, `view-navigation-react.spec.ts:40`,
  `chat-continuity.spec.ts:689`, `connection-preference-storage.spec.ts:18`, and the 2 production specs that seed
  `LEGACY_HOSTED_SELECTION`.
- **Scripts:** `test-cloud-personal-flow.ts`, `test-connection-history.ts`, `test-cloud-protocol.ts` (personal parts).
- **Quint:** `specs/quint/application/manifest.json` (`development-cloud-agents`); `quint-legacy-sign-in-refinement`;
  the paired rows in the native manifest.
- **Other dependants:** `feature-parity.mjs`.

### C5. Legacy Cloud sign-in recovery (pre-namespace credentials, A1)

- **Owner:** D1 (the Android owner should still acknowledge it). **Confidence:** M-H.
- **Files:** `android/.../LegacyCloudRecovery.java`.
- **Symbols:**
  - Java: `AlphaCloudSignInPlugin.savedSignInRecoveryStatus/restoreSavedSignIn` (24-29, 74-146);
    `AlphaCredentialStore` legacy branches (79-82, 105, 135, 180, 196-217, 239);
    `ResetBeforeDispatch.readLegacyCloudSlot/distinctCredential` + legacy step (32, 37, 42-58).
  - Renderer: `legacySignInRecovery`, `restoreSavedSignIn`, the Restore button, the sign-in port members
    `savedSignInRecoveryStatus`/`restoreSavedSignIn`, `native-connection.ts` `removeStoredCloudCredential`
    (256-266) + `connection-ui.tsx:2635`, credentialId migrate-on-read (243-245), the per-start Cloud key scrub.
- **Tests:** `android/app/src/androidTest/assets/video-account-fixture.js:20`; cloud sign-in host tests that cover
  restore; `quint-legacy-sign-in-refinement` + model.

### C6. Legacy browser storage envelopes and "Download old copy" (A1, browser P2)

- **Owner:** D1. Current persisted formats and key names stay byte-identical. **Confidence:** M-H. Nothing writes
  the legacy keys (`git grep localStorage.setItem`). They were added on 2026-10-04 for a pre-release preview.
- **Symbols:**
  - The `legacy` path in `domain-document.ts`; the `{raw}` wrapper in `json-domain-document.ts`; "Download old
    copy" and the "older copy remains available" copy in `domain-recovery.ts:17,36,60`.
  - Legacy readers: `notification-store.ts:10-11`, `digest-storage.ts:23-35`, `development-execution-document.ts:11-14`,
    `development-account-document.ts:10`, `development-agent-document.ts:21`, `development-cloud-document.ts:8`,
    `development-digest-document.ts:16`, `calendar-store.ts:11`, `preference-documents.ts:7`, `reminder-store.ts:6`,
    `hosted-results.ts:12`, `digest-authorization-document.ts:22,26`, `device-preferences.ts:22` `legacyChanged`.
  - `migrateAudio` and `voice.ts:52-58,175,346`; `journal-retention.ts:12-13` "predate this policy";
    `video-edit.ts:67-74` MIME sniffing; `workflow-notices.ts:7,24,29,70`; `workflow-history.ts:55,65,79-80`
    "⤓ Older"; `workflow-drafts.ts:12`; `workflow-intents.ts:39-44`.
  - `media-copy-intent.ts:14`; `native-assistant-draft-recovery.ts` legacy fields (+ `DomainRecovery` legacy fields);
    `startup-permission-progress.ts` v1-3 + `startup-permissions.tsx:36-48`; `service-read-cache-store.ts`
    `retireSharedMail`/`sharedMailKeys`; `note-origin.ts:35-39`; `browser-camera.ts` v2 → v3 cursor;
    `clock-adapter.ts:27` and `clock-handoff-history.ts` legacy keys; `Pending.phase` "older build" handling (B297).
- **Tests:** the domain-* and legacy migration browser specs (part of the 19 in A146); `test/browser-camera-storage.test.mjs:135`.
- **Formal:** Lemma and Quint text pins on `Pending.phase`.

### C7. Android legacy readers and upgrade tests (A1, android P5)

- **Owner:** D1. Keep one generic "update keeps data" test. **Confidence:** M-H.
- **Symbols:**
  - `AlphaNoteAudioPlugin` migration (`migrateLegacyMetadata`, `migrationState`, `migrationFailures`,
    `migrationStatus`, `migrationWorker`) + `apps/app/src/browser/voice.ts:346` shim.
  - `AlphaFilesPlugin.PREF`/`load()`/`releaseRetiredTree`; `AlphaMediaConfig.legacyCaptures("Pictures/")`;
    `AlphaBrowserStores.LEGACY_PREFIX`/`legacyEphemeralPrefix` (+ the re-export in `AlphaBrowserPlugin`);
    `AlphaCredentialStore.retainedLimit`; the optional `UPDATE_BINDING` `/intent`; the `AlphaActionJournal` legacy
    Clock replay (54-56); the `AlphaTelephony` plaintext journal (L, needs upstream).
  - **Not** `CalendarDeletionIdentity` numeric form (see "Corrections").
- **Android tests:** `CalendarUpgrade`, `KeptCaptureLegacyPath`, `NoteAudioMetadataEncrypted`,
  `WorkflowLegacyReminderUpgrade`, `ReminderUpgrade` legacy seeds, `StorageLegacyAccess`,
  `ReminderAgent.legacyMigration…`, `ReminderOneOff` legacy rows, `NoteAudio.optInRetiredDeletion…`,
  `NotesStorageDurability.loweredTrashCap…`.
- **Scripts:** the legacy seeds in `scripts/test-installed-upgrade.ts:38,117` (`legacy-digest`, calendar branch);
  `test/installed-upgrade-runner.test.mjs:77`; the `audio-fence` phase in `scripts/ci/pending-recovery-ui.py:24`;
  the registry rows.
- **Host tests:** `test/owned-captures-legacy-path.test.mjs`.
- **AOSP:** `provision/admitted-previous-sources.json` + `previous_activity` (open). `AlphaQsDefaultsPolicy`
  `LEGACY_ALPHA` stays open (it targets the OS image, not app data).

### C8. Wallet (AP-13 deferred, A3)

- **Owner:** D2 (delete). **Confidence:** H. Wallet is registered only `if (testMocksEnabled)`.
  `mvp-features.ts:17,19,23` says "Removed from MVP in both distributions".
- **Symbols:**
  - `model.js` 3848-4159 (Wallet module), `WAL_*` fixtures + `COPY.wallet`, `secureAdmits` "wallet", `pUp`
    double-tap (5921), `model.js:5484`, Wallet presets/icon in `WF_KINDS`.
  - `template.html` 3231-3524; `fixtures.empty.js:51-54`; `data-adapter.ts:30,65-69`; `agent-adapter.ts:691,695`;
    `native-adapter.ts` wallet replacement branch; `apps.ts` Wallet row; `browser/simulated-apps.ts:21,33-39`;
    `simulated-workflows.ts:59`; `workflow-receipts.ts:14-27,37`.
  - `alphaPaletteColor` (`alpha-product.ts:64-67`); `--alpha-wallet-*` tokens; `inventory` view entries.
- **Tests:** `test/browser/dev-wallet.spec.ts`, `test/wallet-disabled.test.mjs`.
- **Other dependants:** the `mvp-features.ts` wallet entry (keep it only if the feature list must name deferred
  features); `feature-parity.mjs`.

### C9. Backup, restore, import/export and password transfer (A3)

- **Owner:** D3 (delete). **Confidence:** H for the renderer backup; M for the native pieces.
- **Files:** `browser/calendar-backup.ts`; `runtime/native-recovery-backup.ts`; merge `browser/calendar-recovery.ts`
  into the domain recovery table.
- **Symbols:**
  - `calendar-store.ts` `restore()`; `domain-recovery.ts:10-60` test-mocks backup/reset/restore dialog and the
    device backup branch (24-25); `calendar-editor-draft.ts:27` "Recover editor storage";
    `development-cloud-ui.tsx:26,28` recovery buttons + `developmentOwnerRecovery`.
  - `passwords/password-manager.ts:8,54-60,133-136,245-263` import/export; `MainActivity.java:358-362`
    PasswordTransfer registration; `notes-document-adapter.ts:22-28` text import;
    `NotesDocumentInstrumentedTest` 114-183 + `scripts/test-native-restart.ts:56` + `SelectedDocumentAccess.selections()`.
- **Tests:** `test/browser/calendar-backup-restore.spec.ts`; `test/browser/assistant-draft-storage.spec.ts` (backup
  parts); `test/browser/password-manager.spec.ts` (import/export cases); `scripts/storage-specs.ts` rows;
  `ResetPolicyInstrumentedTest` (keep its "plugin absent" assertion).

### C10. Constant-false switches (A4)

- **Owner:** D8 deletes `updateChannelCheckEnabled`, the send-policy override and the `'agent'` route. D7 keeps
  Clef and external voice invocation.
- **Delete (D8):**
  - `build-flags.ts:7-11` `updateChannelCheckEnabled`, its pin in `test/settings-truth.test.mjs:20`, and the
    route-stub bodies in `chat-dictation-api.spec.ts:15` and `voice-stop-speaking.spec.ts:6`.
  - `voice-selection.ts:14-29` send-policy switch + `setVoiceSendPolicyForTests`; the voice-adapter `'review'` path
    (`reviewConversationTurn`, `conversationReview`, 950-954) + its Quint manifest symbol.
  - `'agent'` in `VoicePreference`/`selectVoiceRoute`; `note-recorder-driver.ts:84,89-93`; voice-adapter paired
    route (overlaps C4); `test/voice-selection.test.mjs:115,148,154`; `scripts/test-cloud-voice-flow.ts:77`
    (passes `'cloud'`, keep).
- **Keep (D7):** `voice-selection.ts:31-40` Clef switch; `externalVoiceInvocationEnabled`, `voice-entry-policy.ts`,
  `always-on-listener.ts` invocation half, `main.tsx:430`. Only dead helpers inside them are deleted (B254).

### C11. P-78 dormant entry points (assistant, Power and Quick Settings)

- **Owner:** D7 says keep. This unit is **not** to be deleted. It is listed so that each piece is known.
- **Files and symbols:** `AlphaAssistActivity`, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile` + manifest
  entries; `PowerLaunchPin`/`capturePowerLaunchPin`; `Agent.launchSurface`/`takeInvocation`;
  `AlphaSystemPlugin.isAssistantLaunch`; DailyApps assistant hooks; `MainActivity.isAssistantSurface()`;
  `alpha-system-entry.xml:2-5` tile strings; `android/aosp/branding/power-voice/`; the seven `android/sense`
  identity shims.
- **Safe now (dead helpers):** `AlphaListenerPlugin` (A60); `AlphaAssistActivity.takeInvocation` (B20).
- **Open:** `AssistantInstrumentedTest` and `AssistantResidentReuseInstrumentedTest` cannot pass while the activity
  is disabled. Fix them or delete them (A54). `PhotosTrash.twoActivityAlbumWrites…` uses the same activity (B112).

### C12. Heads-up banner and quick-settings tiles (A5)

- **Owner:** no for the banner. Tiles are dev-only today; whether in-app tiles are planned is an owner question.
  **Confidence:** H.
- **Symbols:**
  - Banner: `model.js` `showHeads`, `headsDone`, `heads*` values (5436, 5442, 5454, 5463, 5720-5723, 5910-5915),
    `n === "heads"` branch, `heads` in BASE; `HEADS` + `LOCK_SUM` fixtures (`fixtures.js:548,550`,
    `fixtures.empty.js:69`); `agent-adapter.ts:1538` `headsOk`; dev-rail "Incoming text" button
    (`development-rail.html:46`).
  - Tiles: `agent-adapter.ts:82-84, 707, 1537-1590`; `main.tsx:196-204`; `native-adapter.ts` `honestTiles`,
    `tileFactsFromSnapshot`, `tileSettingsPages`, tile presentation (86-108); `out.shadeN` filter; brightness.
- **Tests:** `test/home-cards.test.mjs:103` (asserts the banner is absent; keep the assertion as a template check
  or drop it); `test/shade-tile-facts.test.mjs`.

### C13. Fixture simulator inside the product renderer (A5, A6)

- **Owner:** D6. Keep the dev capability behind one `dev/` boundary. Move the code there; delete only what serves
  deleted features. **Confidence:** H that production cannot reach it.
- **Move out of the product files:**
  - `model.js`: `reply:` responders + `scriptedReply` (~350 lines); `Component.send/reply/agentSay/cardAct/startVoice`
    bodies; fixture `actions:`; `VOICE` and `COPY.replies`; Phone/Messages, Inbox (972-1128, 785-854), Maps
    (2524-2911), test-mocks Browser (1585-1888) and Workflows renders (~390 lines); dev-rail values `jumps`,
    `subJumps`, `modes`, `legend`, `themes`, `toggleFs`, `fs`/`notFs`, `rootJustify`; the Settings add-account flow
    with a password field (5042-5082; AGENTS.md forbids collecting credentials).
  - `template.html`: Phone 222-492; Messages 597-756; canned Browser pages 1417-1622; Calendar invites/RSVP; Photos
    people/place/share sheet; stand-in shade 4515-4561; fixture voice panel 4493-4510; canned chat cards 4316-4400;
    Contacts prototype; Settings consent/scopes/password sheet; Workflows History; Files receipt and sheets
    (M, needs a probe).
  - `fixtures.empty.js`; `data-adapter.ts` empty table.
- **Undo layers to delete after the move (A6):** `browser-adapter.ts:471-473` flags; `camera-adapter.ts:1490,1630`;
  `native-adapter.ts:227,280` scrubs; `contacts-adapter.ts:131,133`; `selection-adapter.ts:177-178`;
  `phone-adapter.ts:215` and `sms-adapter.ts:263` `nativePrototype:false`; the voice-adapter and workflow-adapter
  A6 overrides.
- **Delete with C8 and C12:** the Wallet and heads-up parts.

### C14. `android/video-fixture` module

See A64. Delete the whole module, move `qa-source.mp4` to `test/fixtures/`, and update `consumer-host.json:46`,
`test/android-host.test.mjs:119,122`, `scripts/ci/affected.ts:14` and
`test/browser/native-video-library-change.spec.ts:7`. **Owner:** no. **Confidence:** H.

### C15. Never-run and unrunnable instrumentation

The classes in A20, A24-A27, A30, A32, A34-A39, A41-A43, the `NOT_RUN_BY_A_RUNNER` rows in
`scripts/android-instrumentation.ts:324-342`, the `test/android-instrumentation-runner.test.mjs` assertions that
name them (591, 627-643), and the campaign lists in `scripts/owner/emulator-campaign-check.ts`. The unread evidence
writers (B116) and dead gates (B108) go in the same change. **Owner:** no (D5 for the pairing ones).
**Confidence:** H.

### C16. Renderer re-export shims (D4), as one mechanical rewrite

The files are A80-A84, A86-A90, A93, `prototype/assistant-draft-controller.ts`, `runtime/voice-assistant.ts` and
`voice-turn-routes.ts`. Rewrite every importer to the target module. Update the path pins that name the shim:

- `specs/quint/{application,services,native}/manifest.json`;
- the harnesses under `specs/quint/refinement/**` that compile or import shim paths (`maps.mjs`,
  `maps-screen-source.mjs`, `scan.mjs`, `scan-source-conformance.mjs`, `calendar-adapter-fixture.mjs`,
  `inbox-coordinator-ports.mjs`, `notes-coordinator.mjs`, `google-*.mjs`);
- `scripts/prepare-client-features.ts`;
- `test/support/feature-parity.mjs`;
- the browser specs that `import('/src/...shim')` in-page.

Ideally this comes after the D13 `@eliza/*` alias. **Owner:** no. **Confidence:** H.

### C17. Historical Quint models (`specs/quint/legacy`, P6)

- **Owner:** D11. Retire once no live harness imports from it.
- **Prerequisites:**
  - Move `deferred`/`tick` from `legacy/core/source-support.mjs` to `refinement/support`.
  - Move `CoreTaskScheduler.qnt` (used by `refinement/services/task-scheduler/index.mjs:7`) into `services/`.
  - Decide on the `mms-historical-sources.json` witnesses used by `refinement/native/{mms,sms}-dispatch.mjs`.
  - Lower the floors in `test/quint-checker.test.mjs:32`.
- **Delete:** `specs/quint/legacy/**`; `test/fixtures/quint/*Comparison.qnt` (7); `test/quint-legacy-*-refinement.test.mjs`
  (8) and the ~26 legacy, historical and core tests; `quint:prepare-history` + `scripts/prepare-quint-history.ts`;
  `test/quint-tla-inventory.test.mjs` (or its legacy part); `specs/quint/legacy/core/check-configurations.mjs` and
  its metadata (A153, already removable).
- **Other dependants:** the `photo-library.ts` legacy refinement (`specs/quint/legacy/photos-library/*`).

### C18. Dead or duplicate CI workflows (P4)

- **Delete:** `lemma-check.yml`, `digest-restart.yml`, `bun-spawn-seccomp.yml` + `.py`, `reproduce-paradee-model.yml`
  + `.py`, `quint-model-check.yml` (A121, A122, A150-A152).
- **Steps inside kept workflows:** B338-B344.
- **Dependants:** `scripts/ci/affected.ts` regexes (14, 38, bun-spawn); `test/ci-pin-bound-scripts.test.mjs`;
  `test/lemma-check*.test.mjs`; `specs/lemma/README.md`.
- **Owner:** no, except D12 for the required-check ruleset.

### C19. Files folder-context and `'tree'` index (removed feature)

- **Evidence:** the only dispatcher of `alpha-folder-context` was `files-tree-adapter.ts`, deleted in `ba6fe9e70`.
  `__native_tree` is set nowhere. The tree writer was deleted before the package rename.
- **Delete:** the `context-selection.ts` folder path (14, 16-103, folder half of 248-273), `agent-adapter.ts:682-683`,
  then `installContextSelection`; `files-index.ts` 73-110 helpers and the `'tree'` kind (`treeId`, `renameTree`,
  `revoke`, `revokeTree`) + `selection-adapter.ts:194`.
- **Dependants:** `test/context-selection.test.mjs`, `test/files-index.test.mjs`, `FilesRecentIndex.qnt` + its harness.
- **Owner:** no (D11 for the model edit). **Confidence:** H.

### C20. Note recorder live transcription and segment pump (A4)

- **Evidence:** the only product constructor (`voice-adapter.ts:1180-1188`) passes no `live`, passes
  `async()=>null`, sets `automaticTranscription:false` and calls only `finishAudio`.
- **Delete:** in `note-recorder.ts`, the `live` option, `syncLive`, `closeLive`, `liveFinals…`, `displayTranscript`,
  `pump`, the transcriber argument, `automaticTranscription`, `remoteTranscription`, `needsTranscriptionConsent` and
  the non-audio `finish`; `runtime/note-recorder-driver.ts` `noteSegmentTranscriber` and `setText` →
  `setNoteSegmentText`.
- **Dependants:** host tests of the recorder; Quint voice-note models that name these symbols.
- **Owner:** open (is live note transcription planned?). **Confidence:** H that it is unreachable.

### C21. Development-only renderer modules (D6: move, not delete)

These 48 files (~260 KB) are excluded from deletion: `development-*`, `simulated-*`, `simulator-*`,
`incoming-simulation`, `location-simulation`, `password-provider`, `digest-delegation*`,
`digest-authorization-document`, `digest-storage`, `digest-live-sources`, the 15 `workflow-*` simulator modules,
`focus-state`, `device-adapter`, `device-controls.*`. DECISIONS D6 keeps the capability behind one `dev/` boundary.
The deletions inside them are B153, B155, B160 and the Wallet parts (C8). The personal-Cloud parts go with C4.

---

## Corrections: candidates the chunk reviews refuted (do not delete)

| Item | Why it stays | Source |
|---|---|---|
| `custom_url_scheme` string (`res/values/alpha-canonical-notifications.xml`) | The generated `NativeNotificationProjector.java:123` reads it via `getIdentifier`. Renaming the misleading file is still fine. | android-16 |
| `AppTheme.NoActionBar` style | Capacitor `BridgeActivity.onCreate` applies it. Only the redundant items inside it go (B63). | android-16 |
| okhttp app dependency | `local-speech` uses `compileOnly` and needs the app's runtime copy. | android-16 |
| `CalendarDeletionIdentity` numeric "legacy" form | It is the current single-event format, which upstream `CalendarPlugin.deleteReviewedExact` dispatches. Rename it; do not delete it. | android-14 |
| `legacyIds` in `alpha-product-registration.ts:325` | Upstream `product-registration.ts:320-345` requires every `rendererKeys` value to be a `legacyIds` key. | app-08 |
| `test/fixtures/cloud-voice-view.d.mts` | Types `cloud-voice-view.mjs` for `scripts/test-cloud-voice-*.ts` under `typecheck:scripts`. Keep it while those scripts exist. | tests-host §7 |
| `NotesCapacityFixture.java` | Still used by instrumentation. Only its host test goes (A138). | android-07 |
| Test helpers in `test/browser/` and `helpers/` | None is fully orphaned: each has at least one importer. | tests-browser §5 |
