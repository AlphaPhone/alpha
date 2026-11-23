# Chunk specs-36: native refinement harnesses (NativeDigest … ResidentCoordinator)

24 files under `specs/quint/refinement/native/`. Reports: `files/specs/quint/refinement/native/<name>.md`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| NativeDigestTraces.java | refinement harness (product) | PORT | `native-digest-platform.mjs` slices `HostedDelivery.java`; extract `NativeSourceWork` into its own class and compile it whole |
| NavigationServicePorts.java | support | KEEP | with navigation harness |
| NavigationServiceTraces.java | refinement harness (product, whole-file) | PORT | stop reading `AlphaNavigationService.snapshot()` (B27); observe `activeSession()`, the notification and stop events |
| NoteBridgePorts.java | support | MERGE | into `NoteRecordingPorts.java` (one held queue) |
| NoteBridgeSourceProbe.java | JVM probe | DELETE | `probeNoteBridge` has no caller; subset of NotePermission scenarios |
| NotePermissionTraces.java | refinement harness (product) | KEEP | replace in-Java campaign launcher with `javaTraceCampaign` |
| NoteRecordingPorts.java | support | KEEP | merge target |
| NoteRecordingServiceTraces.java | refinement harness (product) | KEEP | launcher → `javaTraceCampaign` |
| NoteRecordingTraces.java | refinement harness (product) | KEEP | `legacy-binding` scenario goes only if the recorder's unbound-journal branch goes (owner question) |
| OnDeviceRecognizerTraces.java | refinement harness (upstream-only) | KEEP | upstream-change lane |
| PipedCaptureTraces.java | refinement harness (upstream-only) | KEEP | upstream lane; launcher → `javaTraceCampaign` |
| PlaybackTraces.java | refinement harness (upstream-only) | KEEP | upstream lane |
| ProducerTraces.java | refinement harness (upstream SystemUI) | KEEP | upstream lane; manifest entry has `sources: []` |
| ProviderPorts.java | support | KEEP | with IndicatorProvider |
| README.md | doc | MERGE | into `specs/quint/native/README.md` (~10 lines), delete; stale "patched source" claims |
| RecognizerAvailabilityTraces.java | refinement harness (upstream-only) | KEEP | upstream lane |
| RecognizerRetirementProbe.java | JVM probe | DELETE | duplicate of 3 OnDeviceRecognizer scenarios; drop 2nd test in `test/quint-on-device-recognizer.test.mjs` and `recognizer-retirement.mjs` (move `recognizerPlatformSources`) |
| ReminderDeliveryTraces.java | refinement harness (product + upstream) | KEEP | runner reuses `java.mjs`; manifest regex → APK audit; legacy scenario bound to upstream `legacyName` |
| RendererBackgroundRebuildReplay.java | ITF forward replay (product, whole-file) | KEEP | field reads follow MainActivity split |
| RequestWithdrawalReplay.java | ITF forward replay (product) | PORT | `request-withdrawal-platform.mjs` cuts 6 spans out of `AlphaLocalAgentPlugin.java`; extract request worker class; delete oracle canaries |
| ResetAdmissionRegression.java | JVM integration regression | MOVE / MERGE | into the reset integration test replacing `test/reset-startup.test.mjs` |
| ResetOrchestrationTraces.java | refinement harness (product) | PORT | ports regex-extracted from `test/reset-startup.test.mjs`; move to `reset-platform.mjs` |
| ResetTraceHooks.java | support | KEEP | travels with reset ports |
| ResidentCoordinatorTraces.java | refinement harness (product, whole-file) | KEEP | 14 private fields + `launchedGenerationForTest` pinned |

Counts: KEEP 15, PORT 4, MERGE 2 (+1 MOVE/MERGE), DELETE 2.

## Behaviours that would lose all coverage
- None from the two DELETEs: `NoteBridgeSourceProbe` never runs; `RecognizerRetirementProbe` is fully covered by
  `duplicate-language-error`, `cancelled-language-error`, `active-language-error` (and the one-probe assertion in
  `observe()`).
- At risk if `ResetAdmissionRegression` is deleted rather than moved: cross-process single reservation of the final
  slot, contended reset lock defers, crash after reservation commit, failed settlement write, `Integer.MAX_VALUE`
  saturation, corrupt-budget repair, window boundary/backwards clock, marker removed mid-attempt.
- At risk if `test/reset-startup.test.mjs` is deleted/merged before `ResetOrchestrationTraces` gets its own port
  module: the whole `ResetRecovery` orchestration campaign fails (its ports are parsed out of that test file).
- `legacy-binding` (NoteRecording) and `legacy-null-occurrence` (ReminderDelivery) scenarios: delete only with the
  product/upstream branch they cover.

## Shared helpers worth keeping
- `java.mjs:javaTraceCampaign`: replace four hand-written per-scenario JVM launchers (`NotePermissionTraces`,
  `NoteRecordingTraces`, `NoteRecordingServiceTraces`, `PipedCaptureTraces`) and the private javac/java pipeline in
  `reminder-delivery.mjs` (add an optional extra classpath).
- One Notes port class (`NoteRecordingPorts` absorbing `NoteBridgePorts`) with a single held main-queue; removes the
  `note-bridge-platform.mjs` string replacement of `Handler.post`.
- `ResetTraceHooks` + a new `reset-platform.mjs` shared by the refinement harness and the moved reset test.

## Cross-file actions
1. Product refactors needed to remove text slices (T10): extract `HostedDelivery.NativeSourceWork` methods into a class;
   extract the `AlphaLocalAgentPlugin` request worker (admission/deadline/withdrawal) into a class. Model re-runs prove
   identity.
2. Land B27 (`AlphaNavigationService.snapshot()` and the four statics) together with the NavigationServiceTraces
   observation change.
3. Land B28 (Maps dev transport → testMocks) and drop the Base64/transport stubs from `navigation-service-platform.mjs`.
4. `residentSources` (resident-coordinator.mjs) must follow A63/D5 merges (`HostedStorageFault`, `VoiceEventAdmission`,
   `CloudDeployment`); `RendererBackgroundRebuildReplay` sources drop `NavigationOpenRequest.java` when it is nested.
5. Upstream-only models here (`NativeOnDeviceRecognizer`, `NativeRecognizerAvailability`, `NativePipedCapture`,
   `StreamingPlayback`, `ListenerLeaseProducer`, `NativeIndicatorProvider`): run in a lane triggered by
   `upstream.lock.json` / `android/upstream-native-sources.json` / the model / this directory; upstream follow-up (D14).
   Note `android/upstream-native-sources.json` has no patches, so all "patched/staged" wording is stale.
6. Every per-model `test/quint-*.test.mjs` wrapper for these campaigns duplicates the native aggregate (T4): keep one runner.
7. Drop evidence ceremony in runners: oracle canaries (request-withdrawal), reset summary/trace JSON files, exact
   trace counts in `test/quint-renderer-background-rebuild.test.mjs`.
8. Move the `AndroidManifest.xml` receiver regex from `reminder-delivery.mjs:49` to the APK/manifest audit.

## Owner questions
- Recorder journals without `ownerDigest`: can only an older build produce them? If yes, delete the unbound-journal
  branch in `AlphaNoteRecorder` (treat as unrecoverable) together with `legacy-binding` / `legacyAudioRetainsNoOwnerTest`.
- Upstream reminders: should upstream `ReminderConfiguration` accept no legacy store so the product can drop
  `alpha-local-reminders-v1` and the legacy upgrade scenario?
- Should upstream-only native models move to `vendor/eliza` (follow-up) or stay here behind an upstream-change lane?
- Where do product test hooks live (`launchedGenerationForTest`, Q-AND-7)?
