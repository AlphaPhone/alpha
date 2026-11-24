# Chunk android-09 — androidTest Photos*, Poster*, Private*, Prototype*, Public*, Readiness*, RealClock, Reminder*, Remote*, Renderer*, Reset*, Resident*

All paths below are under `android/app/src/androidTest/java/ai/alphacompute/alphaphone/` unless stated.
Per-file reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<File>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| PhotosMultiShareInstrumentedTest.java | SIMPLIFY | 60 | 45 |
| PhotosTestFixture.java | SIMPLIFY | 32 | 24 |
| PhotosTrashInstrumentedTest.java | SIMPLIFY | 196 | 120 |
| PosterCalendarJourneyInstrumentedTest.java | DELETE | 204 | 0 |
| PrivateResidentSocketInstrumentedTest.java | KEEP | 94 | 88 |
| PrototypeFlowInstrumentedTest.java | SIMPLIFY (rename optional) | 147 | 120 |
| PublicCloudTransportProbeInstrumentedTest.java | DELETE | 159 | 0 |
| ReadinessEpoch.java | MERGE into StartupDocumentProbe.java | 18 | 0 (+~12 there) |
| RealClockInstrumentedTest.java | SIMPLIFY | 111 | 95 |
| ReminderAgentInstrumentedTest.java | SIMPLIFY | 116 | 62 |
| ReminderCapacityInstrumentedTest.java | KEEP (absorbs one assertion) | 76 | 72 |
| ReminderDeletionJournalInstrumentedTest.java | DELETE (move upstream) | 10 | 0 |
| ReminderDeletionStorageInstrumentedTest.java | SIMPLIFY (rename optional) | 92 | 70 |
| ReminderHeadsUpInstrumentedTest.java | KEEP | 60 | 55 |
| ReminderLifecycleInstrumentedTest.java | SIMPLIFY | 120 | 95 (70 if channel test goes) |
| ReminderNoticeQuestionInstrumentedTest.java | SIMPLIFY | 102 | 95 (70 without agent method) |
| ReminderNotificationActions.java | MERGE into ReminderUiTestDriver (→ ReminderTestSupport) | 20 | 0 |
| ReminderOneOffInstrumentedTest.java | SIMPLIFY | 59 | 50 |
| ReminderRecoveryInstrumentedTest.java | SIMPLIFY | 58 | 52 |
| ReminderRecurrenceInstrumentedTest.java | SIMPLIFY | 78 | 70 |
| ReminderRecurrenceRecoveryInstrumentedTest.java | SIMPLIFY | 74 | 66 |
| ReminderStaleInstrumentedTest.java | SIMPLIFY | 26 | 22 |
| ReminderTapLifecycleInstrumentedTest.java | KEEP | 68 | 62 |
| ReminderTapProcessDeathInstrumentedTest.java | SIMPLIFY | 95 | 85 |
| ReminderTimingInstrumentedTest.java | SIMPLIFY | 151 | 135 |
| ReminderUiTestDriver.java | SIMPLIFY (rename ReminderTestSupport, grows) | 30 | 70 |
| ReminderUpgradeInstrumentedTest.java | SIMPLIFY (P5) | 86 | 70 |
| RemoteAgentInstrumentedTest.java | DELETE | 54 | 0 |
| RendererRecoveryInstrumentedTest.java | KEEP (helpers to a driver) | 126 | 120 |
| ResetExternalFixtureInstrumentedTest.java | DELETE (owner decision) | 154 | 0 |
| ResetPolicyInstrumentedTest.java | SIMPLIFY | 50 | 42 |
| ResidentAlwaysPresentInstrumentedTest.java | SIMPLIFY (P5) | 79 | 65 |
| ResidentEgressRedactionInstrumentedTest.java | SIMPLIFY | 112 | 100 |
| ResidentModelResponseContract.java | MERGE into ResidentTestFixture.java | 27 | 0 (+~17 there) |
| ResidentModelResponseContractTest.java | DELETE | 33 | 0 |
| ResidentServiceInstrumentedTest.java | SIMPLIFY | 122 | 110 |
| **Total** | | **3,099** | **~2,090** (≈1,000 removable) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `js` / `eval` / `host` | helper | PhotosMultiShare:24, PhotosTrash:22, ReminderStale:10, RealClock:32, PrototypeFlow:21, PosterCalendarJourney:56, ReminderNoticeQuestion:33 | ~38 `String js(` + ~25 `String eval(` in androidTest | call `WebViewTestDriver.evaluate` directly |
| `until` / `ready` / `waitJs` / `waitFor` | helper | PhotosMultiShare:25, PhotosTestFixture:17, PhotosTrash:23, ReminderStale:11, ReminderUiTestDriver:12, ReminderOneOff:25, ReminderRecurrence:37, ReminderRecovery:18, ReminderRecurrenceRecovery:21, RemoteAgent:17, ResidentAlwaysPresent:28, RealClock:33, PrototypeFlow:24, ReminderDeletionStorage:30 | ~42 files | new `WebViewTestDriver.until(script,ms,label)` |
| `click(label)` | helper | PhotosMultiShare:26, PhotosTrash:24, ReminderRecovery:19, ReminderRecurrenceRecovery:26 (identical), RealClock:34, PrototypeFlow:30, RemoteAgent:22 | many | `WebViewTestDriver.clickLabel` |
| React value setter (`getOwnPropertyDescriptor(...,'value').set.call`) | helper | PhotosTrash:125, PrototypeFlow:46, RealClock:84, ReminderNoticeQuestion:36, RemoteAgent:28, PosterCalendarJourney:67 | 6+ | `WebViewTestDriver.setValue` |
| native plugin call + poll `window.__x` | helper | PhotosTrash:35 (`nativeCall`), ReminderTiming:45 (`pluginBridge`), ReminderDeletionStorage:38-47 (`begin/result/invoke`) | 3 | `WebViewTestDriver.nativeCall(plugin,method,args)` |
| AccessibilityNodeInfo BFS / find / click-up-parents | helper | PhotosMultiShare:39-40, RealClock:35-39, PrototypeFlow:102-117, ReminderTapProcessDeath:26-39 | 4 | new `AccessibilityTestDriver` |
| SHA-256 hex | helper | PhotosTestFixture:31, ReminderDeletionStorage:25, ResetExternalFixture:26, ResidentEgressRedaction:43 | ResidentTestFixture:18, ActionJournal:21, ConnectionInstrumentedTest:27, CombinedAgent*, DeviceAction, InboxDraft (10+) | `TestDigests.sha256Hex` (or `ResidentTestFixture.hash`) |
| owned JPEG MediaStore fixture | helper | PhotosTestFixture:29, PhotosTrash:42-47 and 67-71 | 3 copies | `PhotosTestFixture.fixture` |
| `bytes(resolver,uri)` | helper | PhotosTestFixture:30, PhotosTrash:34 | 2 | `PhotosTestFixture.bytes` |
| primary/cleanup `addSuppressed` aggregation | helper | PhotosMultiShare:54-57, PhotosTrash:76-85, PrivateResidentSocket:82-92, PrototypeFlow:95-98, RealClock:104-107 | 5+ | `TestCleanup` |
| `notification(id)` | helper | ReminderLifecycle:31, ReminderNoticeQuestion:32, ReminderOneOff:19, ReminderRecurrence:23, ReminderTapProcessDeath:22 (`notice`) | 5 | `ReminderTestSupport` |
| `clean(id)` (cancel + envelope remove) | helper | ReminderLifecycle:33, ReminderOneOff:26, ReminderRecurrence:22, ReminderHeadsUp:58, ReminderRecovery:55, ReminderRecurrenceRecovery:38 | 6 | `ReminderTestSupport` |
| schedule-ahead / sleep / deliver ("postDue") | helper | ReminderNoticeQuestion:38-49, ReminderHeadsUp:51-52, ReminderTapLifecycle:16-24, ReminderTapProcessDeath:49-53, ReminderUpgrade:55-58 | 5 | `ReminderTestSupport.postDue` |
| alarm PendingIntent probe | helper | ReminderAgent:76,94, ReminderTiming:37, ReminderUpgrade:26, ReminderLifecycle:68 | 4 (3 with literals) | `ReminderTestSupport.alarm` from `AlphaReminders.CONFIGURATION` |
| prefs-prefix isolating ContextWrapper | helper | ReminderAgent:41, ReminderCapacity:26-28, ReminderLifecycle:47 | 3 | `ReminderTestSupport.isolated` |
| recurrence `rule(...)` JSON | helper | ReminderRecurrence:21; inline ReminderLifecycle:95, ReminderRecurrenceRecovery:30, ReminderTiming:93,122, ReminderUpgrade:50 | 6 | `ReminderTestSupport.rule` |
| next whole minute | helper | ReminderLifecycle:92, ReminderRecurrence:44, ReminderRecurrenceRecovery:28-29 | 3 | `ReminderTestSupport.nextWholeMinute` |
| reminder status poll | helper | ReminderOneOff:20 (`state`), ReminderRecurrence:24 (`state`), ReminderRecovery:20 (`awaitStatus`) | 3 | `ReminderTestSupport.awaitStatus` |
| OPEN_REMINDER intent | helper | ReminderRecovery:21, ReminderRecurrenceRecovery:22-23 | 2 + ReminderUpgrade:27 literal | `ReminderTestSupport.open` |
| `DONE/SNOOZE/ASK`, `action`, `intent` | const/helper | ReminderNotificationActions:10-19 | ReminderNoticeQuestion:47,50 (`actions[2]`) | `ReminderTestSupport` |
| `assertJsonEquals` | helper | ReminderTiming:50 | none | keep |
| resident HTTP `call`/`nativeCall` | helper | ResidentEgressRedaction:44, ResidentService:24 | ResidentTestFixture.nativeGet:26 | `ResidentTestFixture.call` |
| resident readiness loop | helper | ResidentEgressRedaction:81-84, ResidentService:34-48 | 2 | `ResidentTestFixture.awaitReady` |
| trajectory reader | helper | ResidentEgressRedaction:56-71, ResidentService:72-82 | 2 | `ResidentTestFixture` |
| `ResidentModelResponseContract.valid` | class | ResidentModelResponseContract:8 | none | `ResidentTestFixture.validModelCall` |
| `ReadinessEpoch` | class | ReadinessEpoch:4 | product `NativeReadEpoch.java` (same idea) | nested in `StartupDocumentProbe` |
| renderer-kill helpers (`live`, `killHostRenderer`, `awaitRecovered`, `finishRecreated`, `mainActivityStages`) | helper | RendererRecovery:33-125 | `WebViewTestDriver.withActivity:22-27` (stage scan); used by LauncherHome | `RendererTestDriver` + `WebViewTestDriver.liveActivity` |
| process-death primitives (`Identity`, `awaitMain`, `killMainWithoutTasks`, `sendOriginalTap`) | helper | imported by ReminderTapProcessDeath:12-15 from WorkflowNoticeProcessDeathInstrumentedTest | 1 | `ProcessDeathDriver` |
| `"alpha.connection.selection.v1"` / `"cloud:production"` / `"local-agent-provider:v1"` / `"qwen-3.8-27b"` | const | ResetPolicy:22, ResidentAlwaysPresent:27,45, RemoteAgent:41, ResetExternalFixture:145, ResidentEgressRedaction:77, ResidentService:88,97 | catalogue C6 | product constants (`LocalAgentProviderAdmission.PROVIDER_SLOT`) / one test constant |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `PosterCalendarJourneyInstrumentedTest.java` (204) + `NOT_RUN_BY_A_RUNNER.PosterCalendarJourney` | Drives removed "Scan mode" (decision C1); gate `posterJourney` 0 hits in scripts/test/.github; listed never-run in `scripts/android-instrumentation.ts:325` | high |
| `RemoteAgentInstrumentedTest.java` (54) + registry exclusion | PRD forbids hosted-agent pairing; `localRemote` gate has no runner; "runner was removed in 49b1bf4c" | high |
| `PublicCloudTransportProbeInstrumentedTest.java` (159) + registry exclusion | test-mocks-only CLI-session diagnostic route; gates `publicCloudProbe`/`ownedCloudRead` 0 hits; human step | high |
| `ResidentModelResponseContractTest.java` (33) + registry exclusion | tests a test helper; runs only under `--all` | high |
| `ResetExternalFixtureInstrumentedTest.java` (154) + registry exclusion | no runner for `resetFixture*` args (0 hits); reset is "Unfinished (#409)" per `AndroidManifest.xml:130` | medium (owner) |
| `ReminderDeletionJournalInstrumentedTest.java` (10) + `ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java` (89) + registry entry | pure forwards into upstream package-private internals | medium (move upstream first) |
| `ReminderAgentInstrumentedTest.receiptSurvivesActualProcessReplacement` (lines 20-38) | gate `reminderAgentPhase` 0 hits anywhere | high |
| `ReminderAgentInstrumentedTest.legacyMigrationRetainsRawRecordsAndOccurrenceIdentity` (39-53) | A1: seeds `alpha-local-reminders-v1`, impossible under renamed package | medium (P5) |
| `ReminderOneOffInstrumentedTest` legacy row block (29, 51-56) | A1 "migration-state evidence" | medium (P5) |
| `ReminderUpgradeInstrumentedTest` legacy seed (`LEGACY`, `upgrade_legacy`, `malformed_neighbor`) | A1 | medium (P5) |
| `ReminderLifecycleInstrumentedTest.fullStoreRefusesWithStorageFullBeforeAnyWrite` (45-59) | duplicate of ReminderCapacity (move its saveTodo refusal there) | high |
| `ReminderLifecycleInstrumentedTest.dueRemindersUseASeparateHighImportanceChannel` (36-43) | ReminderHeadsUp:57 asserts the same; "legacy" channel compat | medium |
| `ReminderRecoveryInstrumentedTest` `verify-reboot` branch (52-53) | only `fail()`s; `reminder-recovery-fixture.ts` never sends that phase (sends denied/retry/prepare-reboot/after-reboot-actions) | high |
| `PhotosTrashInstrumentedTest.twoActivityAlbumWritesPersistAndLateReceiptCannotCloseNewManager` + `assistant`/`blockedAlbumWorkers` (154-194) | launches `AlphaAssistActivity`, declared `android:enabled="false"` (`AndroidManifest.xml:124`); no androidTest enables it | medium (or rewrite single-Activity) |
| `ReminderNoticeQuestionInstrumentedTest.questionReviewsTheExactNoticeAndRefusesACancelledOne` (77-101) | gate `noticeQuestion=1` has no runner ("#676 campaign" missing) | medium (owner) |
| `RealClockInstrumentedTest.record()` evidence files (events.jsonl, PNGs, notification-ancestry.json) | no reader in scripts/test/.github | high |
| `PhotosTestFixture` touch trace + `ALPHA_PHOTO_TOUCH_*` println (21-22, 26) | no reader | high |
| `ReminderTapProcessDeathInstrumentedTest:92` evidence bundle | fields not read by any `scripts/ci/*.py` | high |
| Unused imports: PhotosMultiShare (Cursor, Bitmap, MediaStore), PrototypeFlow (CountDownLatch, TimeUnit, AtomicReference), ReminderDeletionStorage (8 imports) | compile-verified by reading | high |
| `ReadinessEpoch.java` as a top-level file | single user `StartupDocumentProbe` | high (merge) |

## Cross-file actions
1. **Delete never-run classes**: PosterCalendarJourney, RemoteAgent, PublicCloudTransportProbe, ResidentModelResponseContractTest, ResetExternalFixture → also remove each key from `NOT_RUN_BY_A_RUNNER` in `scripts/android-instrumentation.ts` (325, 339, 338, 340, 327); `test/android-instrumentation-runner.test.mjs:204` fails on stale entries.
2. **Merge `ResidentModelResponseContract` into `ResidentTestFixture.java`**, update `ResidentServiceInstrumentedTest.java:79`; delete the contract test (action 1).
3. **Create `ReminderTestSupport`** (rename `ReminderUiTestDriver.java`, absorb `ReminderNotificationActions.java`) and switch ReminderAgent, ReminderCapacity, ReminderHeadsUp, ReminderLifecycle, ReminderNoticeQuestion, ReminderOneOff, ReminderRecovery, ReminderRecurrence, ReminderRecurrenceRecovery, ReminderStale, ReminderTapLifecycle, ReminderTapProcessDeath, ReminderTiming, ReminderUpgrade to it; constants from `AlphaReminders.CONFIGURATION` (`android/app/src/main/java/ai/alphacompute/alphaphone/AlphaReminders.java`).
4. **Reminder legacy store (P5)**: delete legacy tests in ReminderAgent, ReminderOneOff, ReminderUpgrade, ReminderLifecycle (channel), ReminderTiming (timing-less receipts) together with `WorkflowLegacyReminderUpgradeInstrumentedTest.java`, `scripts/test-installed-upgrade.ts` legacy seed (`:117` companion), `test/installed-upgrade-runner.test.mjs:61-77`, `specs/quint/refinement/native/ReminderDeliveryTraces.java:253`, and `AlphaReminders.java:12` second arg. Upstream `ReminderConfiguration` requires a non-null distinct `legacyName` (`.eliza/patched-native/.../ReminderConfiguration.java:20`), so removing the reader needs an upstream change and new pin.
5. **ReminderDeletionJournal to upstream**: upstream PR adding the four cases to `plugin-native-reminders` tests; then delete `ReminderDeletionJournalInstrumentedTest.java`, `androidTest/java/ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java`, and `CLASS_REGISTRY.ReminderDeletionJournal`. Same treatment possible for `ReminderRecurrence.civilScheduleSkips...` (pure upstream arithmetic, unregistered).
6. **Merge ReadinessEpoch** into `StartupDocumentProbe.java` (drop its duplicate `closed` flag).
7. **Shared WebView/accessibility drivers**: add `until/clickLabel/setValue/nativeCall/liveActivity` to `WebViewTestDriver.java` and a new `AccessibilityTestDriver`; touches every file in this chunk plus ~40 other androidTest files (chunk-wide C3/T7).
8. **Photos fixtures**: PhotosTrash uses `PhotosTestFixture.fixture/bytes`; PhotosBatch already does.
9. **Renderer helpers**: move static helpers of `RendererRecoveryInstrumentedTest` to `RendererTestDriver`; update `LauncherHomeInstrumentedTest`.
10. **Process-death primitives**: move from `WorkflowNoticeProcessDeathInstrumentedTest` to `ProcessDeathDriver`; update `ReminderTapProcessDeathInstrumentedTest`.
11. **Resident fixture consolidation**: `ResidentEgressRedaction` and `ResidentService` share `call/awaitReady/trajectories/hash` in `ResidentTestFixture.java`.
12. **Optional renames** (pins): `ReminderDeletionStorageInstrumentedTest` → update `scripts/ci/pending-recovery-ui.py:24`, `scripts/ci/fixtures/recovery-storage-e4d-pass.txt`, `scripts/ci/test-recovery-ui-guard.py:112`; `PrototypeFlow` → `CLASS_REGISTRY` key; `ReminderTiming` method `...LegacyReceiptsRemainBound` → `pending-recovery-ui.py`.
13. **ResidentAlwaysPresent legacy selection (P5)**: removing the `{kind:'offline',localApps:true}` seed goes with deleting the renderer migrate-on-read (apps/app runtime connection selection) and the registry note at `scripts/android-instrumentation.ts:182`.
14. **ResetPolicy migration-surface lines** shrink when `AlphaNoteDocumentsPlugin.importText/exportText` (`android/app/src/main/.../AlphaNoteDocumentsPlugin.java:26-27`) and `apps/app/src/prototype/notes-document-adapter.ts` import/export are removed (A3).
15. **PhotosTrash assistant race** goes with the dormant AlphaAssistActivity decision (P14), alongside `AssistantInstrumentedTest`/`AssistantResidentReuseInstrumentedTest`.

## Text/path pins
- `scripts/android-instrumentation.ts`: `CLASS_REGISTRY` keys PhotosMultiShare(275), PhotosTrash(276), ReminderDeletionJournal(277), PrototypeFlow(282), ReminderCapacity(283), ReminderHeadsUp(284), ReminderStale(285), ResidentEgressRedaction(289 campaign), ReminderTapProcessDeath(290 campaign), RealClock(168), ResidentAlwaysPresent(182), ReminderNoticeQuestion(194), ReminderLifecycle(195), RendererRecovery(231), ResetPolicy(152); `NOT_RUN_BY_A_RUNNER` PosterCalendarJourney(325), ResetExternalFixture(327), PublicCloudTransportProbe(338), RemoteAgent(339), ResidentModelResponseContractTest(340); `CAMPAIGN_RUNNERS` list.
- `test/android-instrumentation-runner.test.mjs:132-205`: scans every androidTest `@Test` class for registry/campaign/exclusion; stale exclusion entries fail.
- `scripts/ci/pending-recovery-ui.py:24` (CI `resident-android.yml:606`): ReminderTiming (2 methods, `reminderTiming`), ReminderDeletionStorage (`pendingActionStorageFixture`), ReminderAgent#selectedCrud... (`reminderAgent`), ReminderTapLifecycle, ReminderTapProcessDeath.
- `scripts/ci/test-pending-recovery-phases.py:7,72` (ReminderAgent selector string; reminderTapLifecycle/ProcessDeath options).
- `scripts/ci/fixtures/recovery-storage-e4d-pass.txt`, `scripts/ci/test-recovery-ui-guard.py:112` (ReminderDeletionStorage class name).
- `scripts/ci/resident-native.py:59` (CI `resident-android.yml:519`): PrivateResidentSocket method + `privatePeerFixture/privatePeerRunId`.
- `scripts/android-resident-instrumentation.ts:2,23-24`: ResidentService / ResidentEgressRedaction and proof files `resident-service-complete.json`, `resident-redaction-complete.json`; `scripts/owner/emulator-campaign-check.ts` (ResidentService).
- `scripts/test-reminder-one-off.ts:10`, `scripts/test-reminder-recurrence.ts:10`, `scripts/reminder-recovery-fixture.ts:33-34,45` (class/method names, gates, fixture prefs `alpha-reminder-recovery-test` / `alpha-recurring-recovery-test`, id regexes); wrappers `scripts/test-reminder-recovery.ts`, `scripts/test-reminder-recurrence-recovery.ts`.
- `test/fixtures/isolated-native-campaign.mjs:18` (ReminderOneOff, ReminderRecovery, ReminderRecurrence, ReminderRecurrenceRecovery).
- `scripts/test-installed-upgrade.ts:68,70,117`, `test/installed-upgrade-runner.test.mjs:61-64,77,120` (ReminderUpgrade class + `reminderUpgrade` phases).
- `test/native-deletion-admission.test.mjs:105` (PhotosTrash, comment only).
- `specs/quint/refinement/native/ReminderDeliveryTraces.java:253` (legacy reminder row behaviour, not this file's text).
- No `specs/quint/**/manifest.json`, `test/support/feature-parity.mjs` or `LemmaScript-files.txt` pins on these files.

## New patterns
- **NEW-T: tests whose gate argument no runner ever passes** (`posterJourney`, `reminderAgentPhase`, `noticeQuestion`, `publicCloudProbe`, `ownedCloudRead`, `localRemote`, `resetFixture*`). The runner's reachability check counts a class as reachable if any method is run, so dead gated methods inside a reachable class (ReminderAgent's process-phase method, ReminderNoticeQuestion's agent method) escape it. Treatment: check gates per method, not per class; delete methods whose gate has no runner. Close to T9.
- **NEW-T: tests that launch disabled manifest components** (PhotosTrash launching `AlphaAssistActivity`, `android:enabled="false"`): such tests cannot pass on the shipped APK. Tie to P14/A4.

## Owner questions
1. P5: confirm no `alpha-local-reminders-v1` data or "local apps without AI" selection exists under `ai.alphacompute.alphaphone`, so legacy reminder/selection tests (ReminderAgent, ReminderOneOff, ReminderUpgrade, ReminderLifecycle channel, ReminderTiming timing-less receipts, ResidentAlwaysPresent seed) and the upstream legacyName reader can go.
2. Reset Alpha data (#409): delete ResetExternalFixture now and write a runner-backed test when reset ships, or keep the unrunnable phased fixture?
3. ReminderNoticeQuestion agent-selected method: wire a "#676" campaign with a selected agent, or delete the method?
4. PhotosTrash two-Activity album race: delete with the dormant assistant (P-78), or rewrite with one MainActivity?
5. Move upstream-internals tests (ReminderDeletionJournal fixture, civil-time recurrence) to the upstream reminders plugin?
6. Is the public/owned Eliza Cloud transport probe still wanted anywhere (e.g. as a host-side script), or delete outright?
