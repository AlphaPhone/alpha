# Chunk android-10 — androidTest `Resident*` … `VideoCopy*` (29 files)

Per-file reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<Name>.java.md`.
Line counts are physical lines of very dense code. "Est. after" means content after the cleanup, before any formatter run (a formatter will grow the physical count).

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| ResidentStreamTransportInstrumentedTest.java | KEEP (move upstream later) | 116 | 110 |
| ResidentTestFixture.java | SIMPLIFY (absorbs shared resident session) | 56 | 70 |
| ResidentWorkflowCrashInstrumentedTest.java | SIMPLIFY | 367 | 280 |
| RotationInstrumentedTest.java | SIMPLIFY | 103 | 70 |
| ScopedCalendarDeletionInstrumentedTest.java | SIMPLIFY | 60 | 40 |
| ScopedVoicePlaybackInstrumentedTest.java | DELETE with paired speech (owner) / else SIMPLIFY | 179 | 0 (110 if kept) |
| SelectedDocumentInstrumentedTest.java | SPLIT (+ `DocumentsUiPicker.java` ~95) / SIMPLIFY | 350 | 210 |
| SettingsCrashLogInstrumentedTest.java | SIMPLIFY (drop upstream CrashLog unit method) | 87 | 45 |
| SettingsFlowInstrumentedTest.java | SIMPLIFY | 140 | 105 |
| SettingsNativeInstrumentedTest.java | SIMPLIFY (single App-permissions row test) | 45 | 35 |
| SettingsRolesInstrumentedTest.java | SIMPLIFY (drop duplicate calendar-row method) | 227 | 150 |
| SettingsSystemFactsInstrumentedTest.java | SIMPLIFY (drop 2 upstream pure-function tests) | 82 | 35 |
| ShareFlowAssertions.java | SIMPLIFY | 94 | 65 |
| ShareReceiverActivity.java | KEEP | 38 | 32 |
| ShellInstrumentedTest.java | SIMPLIFY | 104 | 70 |
| SpeechNoNetworkInstrumentedTest.java | KEEP | 165 | 155 |
| SpeechPipelineTraceInstrumentedTest.java | DELETE | 71 | 0 |
| SpeechSentenceCancellationInstrumentedTest.java | KEEP (upstream candidate) | 46 | 46 |
| StartupDocumentProbe.java | SIMPLIFY | 68 | 60 |
| StartupReadinessInstrumentedTest.java | KEEP | 23 | 23 |
| StorageCategoriesInstrumentedTest.java | SIMPLIFY / upstream candidate | 54 | 50 |
| StorageLegacyAccessInstrumentedTest.java | KEEP (research mis-classified it as legacy data) | 57 | 57 |
| SystemShadeInstrumentedTest.java | SIMPLIFY | 128 | 95 |
| TalkBackOrder.java | SIMPLIFY | 201 | 160 |
| TestUiDispatch.java | KEEP (nest `DispatchClaim`, drop `started()`) | 38 | 40 |
| TextScaleInstrumentedTest.java | SIMPLIFY | 59 | 50 |
| TrustedPackagedWorker.java | SIMPLIFY | 46 | 40 |
| UiDispatchInstrumentedTest.java | DELETE | 27 | 0 |
| VideoCopyClosedFailureReviewInstrumentedTest.java | DELETE (with main hook; owner) | 53 | 0 |
| **Total** | | **3,084** | **~2,090 (+~150 in new shared helpers)** |

Outside the chunk the same changes also delete `ReadinessEpoch.java` (18), `DispatchClaim.java` (11), `AlphaPhotosPlugin.preserveClosedVideoCopy` (2), and the ~70 local `until`/`js` copies in other androidTest files once the shared helpers exist.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `until(condition)` JS poller | helper | Rotation:27, SettingsCrashLog:27, SettingsFlow:25, SettingsNative:14, SettingsRoles:36, SystemShade:32, TextScale:18, SelectedDocument:36 (`waitFor`), Shell (inline ×5) | 71 androidTest files define one | `WebViewTestDriver.until(cond)` |
| `js(code)` / `eval(scenario,code)` / `evaluate(scenario,js)` | helper | Rotation:26, SettingsCrashLog:26, SettingsNative:13, SettingsRoles:35, SystemShade:31, TalkBackOrder:52, TextScale:17, SelectedDocument:33, Shell:16 | 38 `String js(` + 25 `String eval(` files | delete; call `WebViewTestDriver.evaluate` |
| promise → window key → poll | helper | ScopedVoicePlayback.call:21, SelectedDocument.plugin:267, Shell:28-30, SystemShade:82-83 | ~30 files | `WebViewTestDriver.awaitPromise(expr)` |
| click button by label (`click`/`button`/`label`/`press`) | helper | SelectedDocument:44, SettingsFlow:30,91, SettingsNative:15, SettingsRoles:38, SettingsCrashLog:28 | many | `WebViewTestDriver.clickButton(name[, prefix])` |
| composer/input value setter (`HTMLTextAreaElement.prototype,'value'`) | helper (JS snippet) | Rotation:71, SettingsRoles:133, Shell:55, TextScale:24 (input) | 21 files | `AppNavigation.setComposer(text)`, `WebViewTestDriver.setInput(sel,v)` |
| `settings()` / `open(view)` navigation | helper | SettingsNative:16, SettingsRoles:39, TextScale:19, SelectedDocument.openFiles:179 | AppNavigation.request/selected used ad hoc everywhere | `AppNavigation.open(view)` |
| `shell(command)` via UiAutomation | helper | SettingsFlow:22, SettingsRoles:32, SettingsSystemFacts:22, ShareFlowAssertions:41,55, Shell:78 | 25 files | `TestShell.run` |
| top-resumed activity scan of `dumpsys activity activities` | helper | SettingsFlow:82, SettingsRoles:89, ShareFlowAssertions:43,57, Shell:89-97 | 11 files | `TestShell.topResumed()` / `awaitTopResumed()` |
| accessibility-tree BFS / node click | helper | SelectedDocument.find/press:74-89, ShareFlowAssertions.nodes:63, SettingsRoles.dialogNode/click:49-67 | others | `UiNodes` |
| SHA-256 → hex | helper | ResidentTestFixture:18,20,25 (three in one file), TrustedPackagedWorker:19, SelectedDocument:266, ShareFlowAssertions:78, ShareReceiverActivity:31, SpeechPipelineTrace:34 | 30 androidTest files use `%02x` | one `TestDigests.sha256Hex(InputStream,long)` |
| `readUtf8` / private `write` (sync+chmod) | helper | ResidentWorkflowCrash:21,175, TrustedPackagedWorker:17,20 | — | `Files.readString`, `ResidentTestFixture.writePrivate` |
| `nativeCall` / `request` / `startAndEnroll` | helper | ResidentWorkflowCrash:28-40,109-145, ResidentTestFixture.nativeGet:26 | ResidentServiceInstrumentedTest:24-65 | `ResidentTestFixture.ResidentSession` |
| `ownedChild/stopped/owner/agent` wrappers | helper (pass-through) | ResidentWorkflowCrash:147-150 | ResidentServiceInstrumentedTest:67-70 | delete; call fixture |
| loopback HTTP fixture (header parse, Content-Length, bearer) | class | ResidentWorkflowCrash.HeldModel:151, ScopedVoicePlayback.Fixture:48 | other loopback fixtures in androidTest | `LoopbackHttp` |
| disposable calendar create/cleanup | helper | ScopedCalendarDeletion:31-34,52-54 | CalendarDeletionReview, CalendarDeletionRestart, CalendarSyncProvider, CalendarUpgrade, CalendarCreationRecovery | `CalendarFixture` |
| `DeferredDeletionJournal.Store` anonymous adapter | type | ScopedCalendarDeletion:42 | main `NativeDeletionCoordinator.java:24-28` | production accessor |
| MediaStore fixture + DocumentsUI picker | helper | SelectedDocument:49-131 | used by BrowserFlow, CameraScan, NotesDocument, PosterCalendarJourney via `new SelectedDocumentInstrumentedTest()` | `DocumentsUiPicker` |
| restart-phase prepare/verify/cleanup scaffolding | helper | SelectedDocument:240-261,325-349, SettingsFlow:128-139, TextScale:44-58, SettingsCrashLog:58-86 | other `*ProcessRestartPhase` methods | `RestartFixture` |
| `expectedSummary` (App-permissions count) | helper | SettingsNative:26-30 | inline copy SettingsRoles:219-222; renderer `permissionSummary` | SettingsNative only |
| `Action` (throwing runnable) | type | ShareFlowAssertions:14 | JUnit `org.junit.function.ThrowingRunnable` | JUnit type |
| `ASSISTANT_GROUP`, `GROUPS` (READING_GROUPS) | const | TalkBackOrder:32,112 | `test/browser/accessibility-audit.ts` | shared JSON asset |
| `CLIPPED` clipping script | const | Rotation:39 | used by AccessibilityLifecycle | androidTest asset + `LayoutChecks` |
| startup readiness JS query | const | StartupDocumentProbe:49 | extracted by `test/browser/mock-readiness.spec.ts` | androidTest asset |
| `safeIpcRefusal` / `safeBootReason` label lists | const | ResidentWorkflowCrash:41-54 | strings in generated `ElizaAgentService` | read from upstream or delete |
| `DispatchClaim` | class (separate file) | TestUiDispatch:10 | — | nested in TestUiDispatch |
| `ReadinessEpoch` | class (separate file) | StartupDocumentProbe:16 | — | nested in StartupDocumentProbe |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `SpeechPipelineTraceInstrumentedTest.java` + `NOT_RUN_BY_A_RUNNER.SpeechPipelineTrace` | In `NOT_RUN_BY_A_RUNNER` (`scripts/android-instrumentation.ts:341`); arg `speechPipelineTrace` set by nothing; tests only upstream `ai.eliza.voice`; output dir collected by nothing | High |
| `UiDispatchInstrumentedTest.java` + registry `UiDispatch` | Tests the androidTest helper `TestUiDispatch` only; no CI lane; T5 | High |
| `VideoCopyClosedFailureReviewInstrumentedTest.java` + `NOT_RUN_BY_A_RUNNER` entry + `AlphaPhotosPlugin.preserveClosedVideoCopy` (main :30-31) | No runner; args set by nothing; the main method's only caller is this class (grep) | Medium (owner: is the manual recovery still needed?) |
| `ScopedVoicePlaybackInstrumentedTest.java` + registry entry | Only exercises the paired `remote:` route + `synthesizePaired` (PRD: no hosted-agent pairing) | Medium (depends on the paired-speech decision) |
| `SettingsCrashLogInstrumentedTest.forcedUncaughtExceptionIsRecordedByClassOnlyAndReadBackFromDisk` | Pure upstream `CrashLog` unit test; reachable only via `--all` (class is campaign-only; restart runner calls only the other method) | High (confirm upstream test) |
| `SettingsSystemFactsInstrumentedTest.switchMappingsNeverGuess`, `.everySettingsPageHasASpecificFirstChoice` | Pure upstream `SystemFacts`/`SystemSettingsPages` table tests | High (confirm upstream) |
| `SystemShadeInstrumentedTest.everyOutcomeIsReportedAndOnlyAnAcceptedCallIsOpened` + `FakeStatusBar`/`RefusingStatusBar` | Upstream `SystemShade` mapping; `test/system-shade.test.mjs:84` says it is "tested there" | High |
| `SettingsRolesInstrumentedTest.calendarRowMatchesRuntimeGrant` | Duplicates `SettingsNativeInstrumentedTest` row check; `settingsCalendar` arg set by no runner | High |
| `TestUiDispatch.started()` / `DispatchClaim.started()` | No caller (grep) | High |
| `TalkBackOrder.Result.actionable/groups/seenAssistant` as API | No caller reads them (grep) | High |
| `TalkBackOrder.diagnose` Settings "Notifications" geometry dump + `/sdcard/Download` screenshot | No script pulls `alpha-accessibility-fixture-*` (grep 0); one-off investigation | Medium |
| `SpeechNoNetworkInstrumentedTest` evidence file `speech-no-network-evidence/result.json` | No reader (grep 0) | High |
| Unused imports: Shell (CountDownLatch, TimeUnit, AtomicReference, JSONObject), SelectedDocument (KeyEvent, CountDownLatch, TimeUnit), SettingsFlow (Build), SpeechPipelineTrace (`ai.eliza.voice.*`) | compile-level | High |
| Duplicate asserts in `ResidentWorkflowCrash.crash()` line 284 | same two asserts as line 283 | High |
| `test/files-browser.test.mjs:261-262` text pin on StorageCategories; `test/accessibility-coverage.test.mjs:163-169` text pins on TalkBackOrder; `test/browser/mock-readiness.spec.ts:4-7` source extraction of StartupDocumentProbe | T1/T2 source-text tests | High (replace with shared assets/constants) |

## Cross-file actions
1. **Shared androidTest driver helpers.** Add `WebViewTestDriver.until/awaitPromise/clickButton/setInput`, `AppNavigation.open/setComposer/openSettings`, `TestShell.run/topResumed/awaitTopResumed`, `UiNodes`, `TestDigests.sha256Hex`. Then delete local copies in: Rotation, SettingsCrashLog, SettingsFlow, SettingsNative, SettingsRoles, SystemShade, TextScale, SelectedDocument, Shell, ScopedVoicePlayback, ShareFlowAssertions, ShareReceiverActivity, TalkBackOrder, ResidentTestFixture, TrustedPackagedWorker, SpeechPipelineTrace (and ~60 files outside this chunk). Pure test refactor; run full instrumentation.
2. **DocumentsUI picker extraction.** New `DocumentsUiPicker.java` from `SelectedDocumentInstrumentedTest:49-131`; update `BrowserFlowInstrumentedTest:144`, `CameraScanInstrumentedTest:144,179,223,229`, `NotesDocumentInstrumentedTest:86,117`, `PosterCalendarJourneyInstrumentedTest:54` (or delete the latter as never-run).
3. **Resident session consolidation.** Move `nativeCall`/`startAndEnroll`/admission prologue into `ResidentTestFixture`; edit `ResidentServiceInstrumentedTest.java:24-70` and `ResidentWorkflowCrashInstrumentedTest.java:28-40,109-150,289-295,335-340`; fold `TrustedPackagedWorker` helpers. Proof JSON keys must stay for `scripts/ci/resident-native.py` and `scripts/ci/resident_crash_diagnostic.py` (`test/resident-crash-diagnostic.test.py`).
4. **Test hook out of main.** `AlphaLocalAgentPlugin.instrumentationRecoveryEndpoint` (`AlphaLocalAgentPlugin.java:44-45,680-689`) is set by reflection from `ResidentWorkflowCrashInstrumentedTest:298,342` (and `AssistantInstrumentedTest`/`AssistantResidentReuseInstrumentedTest`, Quint `CredentialResidentTraces.java` per research). Move to the testMocks source set or a debug-only setter; update the reflective callers and `specs/quint/refinement/native/*` together.
5. **Video-copy recovery removal.** Delete `VideoCopyClosedFailureReviewInstrumentedTest.java`, `AlphaPhotosPlugin.java:30-31`, `NOT_RUN_BY_A_RUNNER.VideoCopyClosedFailureReview` (`scripts/android-instrumentation.ts:337`). Re-run `test/native-plugin-teardown.test.mjs`, `test/context-selection.test.mjs` (they read `AlphaPhotosPlugin.java` text).
6. **Never-run / test-machinery deletions with runner lists.** `SpeechPipelineTrace` (file + `NOT_RUN_BY_A_RUNNER` line 341), `UiDispatch` (file + registry line 257), `ScopedVoicePlayback` (file + registry line 228, with paired speech in `AlphaVoiceCloudPlugin` and renderer `paired-voice.ts`). `test/android-instrumentation-runner.test.mjs` enforces NOT_RUN entries exist as classes but does not flag stale registry entries.
7. **Readiness query pin.** Move the JS from `StartupDocumentProbe.java:49` to an androidTest asset; update `test/browser/mock-readiness.spec.ts:4-7` to read the asset and `scripts/ci/affected.ts:13` (`browserReadAndroid`) to the new path; `test/ci-affected.test.mjs` keeps that set complete.
8. **Accessibility rule constants.** Shared JSON (assistant group name, READING_GROUPS) read by `TalkBackOrder.java` and `test/browser/accessibility-audit.ts`; drop regex pins in `test/accessibility-coverage.test.mjs:163-169` (keep its other assertions).
9. **Storage category text pin.** Remove `test/files-browser.test.mjs:261-262`.
10. **Settings coverage merge.** Delete `SettingsRoles.calendarRowMatchesRuntimeGrant`; move its "Contacts is not presented" check into `SettingsNativeInstrumentedTest` (run by `scripts/test-native-permissions.ts:54`).
11. **Device snapshot entry point.** Add package-private `AlphaDevicePlugin.snapshotFacts(context)` (main `AlphaDevicePlugin.java:71,87-90`) and use it in `SettingsSystemFactsInstrumentedTest:45`.
12. **Calendar fixture.** `CalendarFixture` shared by ScopedCalendarDeletion and the five other `Calendar*InstrumentedTest` classes; optionally expose `NativeDeletionCoordinator`'s journal store for ScopedCalendarDeletion:42.

## Text/path pins
- `scripts/ci/resident-native.py:59` — class + method names and arg names for ResidentStreamTransport (`residentStreamFixture`, `residentStreamRunId`) and ResidentWorkflowCrash (`residentCrash`, `residentRunId`); `:85-100` reads `files/resident-recovery-complete.json` / `resident-recovery-identity.json`; `scripts/ci/resident_crash_diagnostic.py:87` reads `missingModelRequest`; `test/resident-crash-diagnostic.test.py`.
- `android/app/src/androidTest/assets/trusted-worker.mjs:377` comment names `ResidentWorkflowCrashInstrumentedTest.HeldModel`.
- `scripts/android-instrumentation.ts` registry entries: `Shell`, `StartupReadiness`, `TextScale` (also `DEFAULT_CLASSES`), `SettingsSystemFacts`, `Rotation`, `SettingsRoles`, `ScopedVoicePlayback`, `SelectedDocument`, `SettingsFlow`, `SystemShade`, `StorageLegacyAccess`, `StorageCategories`, `UiDispatch`, `SpeechNoNetwork`, `SpeechSentenceCancellation`, `ScopedCalendarDeletion`, `SettingsCrashLog` (campaign); `NOT_RUN_BY_A_RUNNER`: `SpeechPipelineTrace`, `VideoCopyClosedFailureReview`.
- `scripts/ci/emulator-suite.ts:35` `FUSED_SPEECH_CLASSES` (SpeechSentenceCancellation) — pinned by `test/ci-emulator-evidence.test.mjs:243`.
- `scripts/test-native-restart.ts:21,65,85,104,112` — TextScale `textScaleProcessRestartPhase`, SelectedDocument `documentProcessRestartPhase` & `sourceReferenceProcessRestartPhase`, SettingsCrashLog `realCrashSurvivesRestartAndShowsInSettings`, SettingsFlow `themeProcessRestartPhase`; phases/args pinned by `test/android-instrumentation-runner.test.mjs:560-562,612-614`.
- `scripts/test-native-permissions.ts:54-56` — SettingsNative + gate `settingsNative`; `:29,39` CameraFlow (ShareFlowAssertions caller).
- `scripts/owner/emulator-campaign-check.ts:40-41,47,57-58` — SettingsRoles, SettingsFlow, StorageCategories.
- `test/android-instrumentation-runner.test.mjs` — class names as fixtures (Shell, TextScale, Rotation, SettingsRoles, StartupReadiness, SettingsCrashLog, SelectedDocument, SettingsFlow) and `:215` registry must keep `SettingsRoles`, `StorageLegacyAccess`; `:185-213` NOT_RUN/registry consistency.
- `test/fixtures/isolated-native-campaign.mjs:18` — class names (TextScale, SettingsFlow, SettingsNative, SettingsCrashLog, SelectedDocument …).
- `test/browser/mock-readiness.spec.ts:4-7` + `scripts/ci/affected.ts:13` — StartupDocumentProbe path and `evaluateJavascript("…",value` text.
- `test/accessibility-coverage.test.mjs:163-169` — TalkBackOrder path and three text regexes.
- `test/files-browser.test.mjs:261-262` — StorageCategories path and loop text.
- `android/app/src/androidTest/AndroidManifest.xml:8-9` — ShareReceiverActivity class and label "Alpha share verification" (read by ShareFlowAssertions:71).
- Comments only: `test/browser/home-landscape.spec.ts:3`, `test/launcher-orientation.test.mjs:6`, `test/browser/settings-device-facts.spec.ts:6`, `LauncherHomeInstrumentedTest:32-33`, `NotificationsInstrumentedTest:19,29`, `AccessibilityLifecycleInstrumentedTest:36`.
- No file in this chunk is pinned by `specs/quint/native/manifest.json`, `test/support/feature-parity.mjs` or `LemmaScript-files.txt`.

## New patterns
- **Test class used as a helper library**: other tests do `new SelectedDocumentInstrumentedTest().selectDocument(...)` to borrow fixtures and a DocumentsUI driver. Treatment: move to a non-test helper class.
- **Unused-parameter forwarding helpers**: `eval(scenario, js)` / `evaluate(scenario, js)` take an activity scenario they ignore (SelectedDocument, Shell); adjacent to D4 but at call-site scale (~70 call sites).
- **Unread on-device evidence files**: tests write JSON/screenshots to app or external storage that no runner pulls (`speech-no-network-evidence/result.json`, `/sdcard/Download/alpha-accessibility-fixture-*.png`, `speech-pipeline-trace-*`). A variant of B5 specific to instrumentation.
- **Instrumentation tests of upstream pure functions** (`SystemFacts`, `SystemSettingsPages`, `SystemShade`, `CrashLog`, `DeferredDeletionJournal`, `StorageCatalog`, `SessionSpeech`) that need no device and duplicate upstream tests — a sub-case of T5 worth its own grep in other android chunks.
- **Dead imports** in dense one-line Java files (no formatter/linter catches them); fold into the D8 formatter step with an unused-import check.

## Owner questions
1. Paired speech: if `synthesizePaired`/`remote:` paired credentials are deleted (PRD: no hosted-agent pairing), `ScopedVoicePlaybackInstrumentedTest` goes too — do we need an equivalent stale-stop/late-play test for local Paradee playback?
2. `VideoCopyClosedFailureReviewInstrumentedTest` + `AlphaPhotosPlugin.preserveClosedVideoCopy`: is this manual recovery procedure still needed for any pilot device, or can both be deleted?
3. Tests that only exercise upstream/generated code (ResidentStreamTransport, SpeechSentenceCancellation, StorageCategories, parts of ScopedCalendarDeletion/SettingsSystemFacts/SystemShade/SettingsCrashLog): delete here once upstream runs them, or keep an Alpha-side emulator copy as release evidence?
4. `ResidentWorkflowCrash.safeIpcRefusal`'s ~80 copied upstream labels: export the label set from the generated host, or drop the `ipcRefusal` diagnostic?
5. `SpeechNoNetworkInstrumentedTest` (the no-egress privacy proof) is in no CI lane — add it to the fused-speech lane (it needs networking ON), or keep it manual?
6. `ScopedCalendarDeletion.localRecurrence…` loops 10 times — is the intermittent failure it guarded still open?
7. `TrustedPackagedWorker` hand-builds the Bun environment/flags; should upstream expose the resident launch environment so the fixture cannot drift?
