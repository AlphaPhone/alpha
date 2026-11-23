# Chunk android-06 — androidTest Camera…Hosted (27 files)

Per-file reports: `docs/simplification-audit/files/android/app/src/androidTest/java/ai/alphacompute/alphaphone/<File>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| CameraScanInstrumentedTest.java | SIMPLIFY | 268 | 215 |
| ChatContinuityInstrumentedTest.java | SIMPLIFY (move `alphaIsHome`) | 174 | 140 |
| ClockAgentReviewInstrumentedTest.java | SIMPLIFY | 78 | 70 |
| ClockHandoffInstrumentedTest.java | SIMPLIFY (drop upstream-validation test) | 46 | 32 |
| ClockHistoryFixture.java | SIMPLIFY | 48 | 40 |
| ClockRepeatDaysInstrumentedTest.java | DELETE (fold 1 assertion into ClockAgentReview) | 53 | 0 |
| CloudDelegationCallbackInstrumentedTest.java | SIMPLIFY | 62 | 55 |
| CloudDeploymentStorageInstrumentedTest.java | SIMPLIFY | 54 | 45 |
| CloudSignInAuthorizationInstrumentedTest.java | KEEP (upstream question) | 66 | 66 |
| CloudSignInCallbackInstrumentedTest.java | SIMPLIFY | 97 | 60 |
| CloudVoiceInstrumentedTest.java | SIMPLIFY | 73 | 50 |
| CombinedAgentInstrumentedTest.java | DELETE | 115 | 0 |
| CombinedAgentRestartInstrumentedTest.java | DELETE | 156 | 0 |
| ConnectionChooserInstrumentedTest.java | SIMPLIFY | 62 | 50 |
| ConnectionInstrumentedTest.java | SIMPLIFY | 287 | 200 |
| ConnectionRoutesInstrumentedTest.java | KEEP (absorb Connection duplicate) | 118 | 110 |
| ContactsCatalogInstrumentedTest.java | SIMPLIFY (pure half upstream) | 45 | 30 |
| ContactsFlowInstrumentedTest.java | DELETE | 67 | 0 |
| CrossAppNotificationsInstrumentedTest.java | SIMPLIFY | 86 | 75 |
| CrossAppNotificationsRestartInstrumentedTest.java | SIMPLIFY | 96 | 85 |
| DailyAppsInstrumentedTest.java | SIMPLIFY (split) | 327 | 230 |
| DeviceActionInstrumentedTest.java | DELETE | 128 | 0 |
| DispatchClaim.java | MERGE into TestUiDispatch.java | 11 | 0 |
| FlowInstrumentedTest.java | SIMPLIFY | 81 | 45 |
| HomeCalendarCardInstrumentedTest.java | KEEP (minor) | 102 | 85 |
| HostedBackgroundWorkerInstrumentedTest.java | SIMPLIFY (or DELETE with P15) | 80 | 45 |
| HostedProcessRestartInstrumentedTest.java | SIMPLIFY (or DELETE with P15) | 80 | 50 |
| **total** | | **2,860** | **~1,778** (+~150 in new shared helpers) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `until`/`waitFor`/`uiWait` (WebView poll) | helper | CameraScan:40, ChatContinuity:32, ClockAgentReview:29, ClockHandoff:22, CloudDelegationCallback:21, ConnectionChooser:14, Connection:30, ConnectionRoutes:29, ContactsFlow:23, DailyApps:42, DeviceAction:21, Flow:22, HomeCalendarCard:34, Combined*:20 | ~77 androidTest files define one | `WebViewTestDriver.until(js, ms, diag)` |
| `eval`/`js`/`evaluate` alias | helper | CameraScan:39, ChatContinuity:31, ClockAgentReview:28, ClockHandoff:21, CloudDelegationCallback:20, ConnectionRoutes:28, ContactsFlow:22, DailyApps:21, Flow:19, HomeCalendarCard:33 | 60 files | delete; `WebViewTestDriver.evaluate` |
| promise-capture bridge call (`window.__x=null;…then(v=>window.__x=…)`) | helper | ClockAgentReview:30-32, CloudDelegationCallback:22-27, CloudVoice:21-24, Connection:38-47, ConnectionRoutes:38-42, DailyApps:31-41 | more in other chunks | `WebViewTestDriver.call(expr) -> {ok,value,error}` |
| `click(label)`/`clickText`/`label` | helper | CameraScan:45-46, ChatContinuity:42, ClockHandoff:23, ConnectionChooser:22, ContactsFlow:26, Flow:29,44, Combined*:21, DeviceAction:26, CrossAppRestart:30 | many | `AppNavigation.clickLabel/clickText` |
| React value-setter (`Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call`) | helper | Flow:38-43 (best), CameraScan:95, ChatContinuity:115, ContactsFlow:29-32, DeviceAction:32,69, Combined*:32,66,104 | many | `AppNavigation.setValue(selector, value)` |
| SHA-256 hex | helper | Connection:25-29, ConnectionRoutes:50-51, Combined*:26, DeviceAction:43 | 32 androidTest files use MessageDigest; 10× in main (android P9) | `AlphaCredentialStore.slotHash` for slots; `TestDigests.sha256Hex` otherwise |
| AccessibilityNodeInfo BFS / native dialog click | helper | CameraScan:64-87, ClockAgentReview:40-42, DailyApps:51-71, CrossAppRestart:31-33 | RealClock, PdfViewer, SelectedDocument, PasswordBrowserFill, CalendarExternalEditor | `UiNodes.find/click` (or UiAutomator `By`) |
| AlarmClock interception `ActivityMonitor` | helper | ClockAgentReview:47,77; ClockHandoff:27-29; ClockRepeatDays:42 | RealClockInstrumentedTest | `ClockIntents.intercept` |
| loopback HTTP server | class/helper | CloudVoice:26-37, Connection:131-162 and 221-258, HostedBackgroundWorker:67-79, HostedProcessRestart:67-79 | 10 androidTest files `new ServerSocket(0` | `LoopbackHttp` (+ `HostedAgentFixture`) |
| Hosted `Fixture` | class | HostedBackgroundWorker:67, HostedProcessRestart:67 | each other (near-identical) | `HostedAgentFixture` |
| `alphaIsHome(Context)` | helper | ChatContinuity:99 | called by DailyApps:309, AccessibilityHomeRole, AccessibilityLifecycle, LauncherHome | `AppNavigation.alphaIsHome` |
| `pressKey(int)` | helper | ChatContinuity:47 | `WebViewTestDriver.pressBack`, `AccessibilityLifecycleInstrumentedTest.pressHome` | `WebViewTestDriver.pressKey` |
| `shell(cmd)` | helper | CameraScan:88 | `AccessibilityViewsInstrumentedTest.shell` (used by 2 others) | `DeviceShell.run` |
| `intent(uri)` (ACTION_VIEW to MainActivity) | helper | CloudDelegationCallback:17, CloudSignInCallback:24 | each other | `AppNavigation.viewIntent` |
| `field(type,name)` reflection | helper | CloudSignInAuthorization:21, Combined*:25 | each other | `TestReflection.field` |
| checkpoint save/load for multi-process phases | helper | CrossAppRestart:15-24, CombinedAgentRestart:123-124, HostedProcessRestart STATE slot | each other | `PhaseCheckpoint` |
| SharedPreferences restore by type | helper | CrossApp:82, CrossAppRestart:69 | each other | `NotificationAccessTestDriver.restorePrefs` |
| `fixtureIdentity()` | helper | CrossAppRestart:34-36 (inline in CrossApp:44-48) | each other | `NotificationAccessTestDriver` |
| WorkManager finish poll | helper | HostedBackgroundWorker:43-44, HostedProcessRestart:53-54 | each other | `WorkTestDriver.awaitFinished` |
| scenario lifecycle poll (`for(i<100&&scenario.getState()!=…)sleep`) | helper | ChatContinuity:152-159, DailyApps:316-321 | other launcher tests | `BoundedActivityScenario.awaitState` |
| `diagnostics()` / `child()` on BrowserFlowInstrumentedTest | helper | ConnectionChooser:20, DeviceAction:109 | — | `WebViewTestDriver.diagnostics/child` |
| `fixtureBytes`/`selectDocument` on SelectedDocumentInstrumentedTest | helper | CameraScan:144,179,223,229 | — | `DocumentPickerDriver` |
| `DispatchClaim` | class | DispatchClaim:4 | none | nested in `TestUiDispatch` |
| `'alpha.connection.selection.v1'` | const (literal) | ConnectionChooser:30,42,58; Combined*:89-111; DeviceAction:59; CrossAppRestart:57,70 | 12 renderer files (C6) | test-side `AppNavigation.CONNECTION_SELECTION_KEY` |
| `"cloud:production"` | const (literal) | CloudDeploymentStorage:25, CloudSignInCallback ×7, DailyApps:226, Combined*:90 | 32× main (android P6) | slot constant (P6) |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `CombinedAgentInstrumentedTest.java` (115) | `NOT_RUN_BY_A_RUNNER.CombinedAgent` ("no Android runner starts or pairs it"); no writer of `combined-agent-fixture.json` (git grep); PRD excludes agent pairing | High |
| `CombinedAgentRestartInstrumentedTest.java` (156) | `NOT_RUN_BY_A_RUNNER` "compiled, never executed"; lines 1-82 identical to CombinedAgent | High |
| `DeviceActionInstrumentedTest.java` (128) | `NOT_RUN_BY_A_RUNNER` "runner was removed in 49b1bf4c"; `device-action-pairing.json` has no writer; Java `hash()` unused | High |
| `ContactsFlowInstrumentedTest.java` (67) | `@Ignore` MVP-deferred; `NOT_RUN_BY_A_RUNNER.ContactsFlow` | High |
| `ClockRepeatDaysInstrumentedTest.java` (53) | two methods test vendored `ClockHandoff`/`ClockDays` only; one self-built intent intercept; covered by host `test/clock-repeat-days.test.mjs`; one product assertion moves to ClockAgentReview | Medium-high |
| `DispatchClaim.java` (merge) | single user `TestUiDispatch` (git grep) | High |
| `ClockHandoffInstrumentedTest#invalidIntentDoesNotBecomeAnotherAlarmRequest` | only calls upstream `ClockHandoff.intent` | High |
| `ConnectionInstrumentedTest#productionTransportRejectsRemoteCloudAndUnapprovedRoutesBeforeConnecting` | duplicate of ConnectionRoutes flag-off refusal; not named by any runner | High |
| `CloudSignInCallbackInstrumentedTest#signInSlotsAreNativeOnly` | pure policy check; covered through the real bridge by `Connection#reservedNativeSlotsRejectEveryPublicStorageOperation` | Medium-high |
| `CloudVoice` production hooks `AlphaVoiceCloudPlugin.instrumentationBaseUrl/instrumentationCredentialSlot` (main) | only user is CloudVoiceInstrumentedTest:48; move to testMocks | Medium (needs seam) |
| `ContactsCatalogInstrumentedTest#literalSearchIsOneSegment…` | pure test of vendored class | Medium (move upstream) |
| Unused imports: ClockHandoff `ArrayList`; CrossAppRestart `SystemClock`; DailyApps `KeyEvent`,`CountDownLatch`,`TimeUnit`; Flow `Assume`,`JSONTokener`,`CountDownLatch`,`TimeUnit`,`AtomicReference` | grep of each file body | High |
| `HostedBackgroundWorker` + `HostedProcessRestart` | exercise `remote:`-credential hosted delivery (PRD: no hosted-agent pairing) | Owner decision (P15) |

## Cross-file actions
1. **Delete never-run classes** — delete `CombinedAgentInstrumentedTest.java`, `CombinedAgentRestartInstrumentedTest.java`, `DeviceActionInstrumentedTest.java`, `ContactsFlowInstrumentedTest.java` and remove their keys from `scripts/android-instrumentation.ts` `NOT_RUN_BY_A_RUNNER` (lines 329-332) in the same change; `test/android-instrumentation-runner.test.mjs:203-205` fails otherwise. Keep `androidTest/assets/paired-whisper-fixture.m4a` while `PairedAsrInstrumentedTest`/`PairedAsrLiveInstrumentedTest` exist. Owner then decides on `scripts/start-combined-agent.ts` + `specs/quint/services/CombinedAgentLauncher.qnt` + `specs/quint/refinement/services/combined-agent-launcher*.mjs` + `scripts/quint-lib.ts:16`.
2. **ClockRepeatDays removal** — delete the file, remove `ClockRepeatDays: {}` (`scripts/android-instrumentation.ts:197`), add an `EXTRA_DAYS` assertion to `ClockAgentReviewInstrumentedTest` (method name unchanged; pinned by `scripts/ci/pending-recovery-ui.py:24` and `scripts/ci/test-pending-recovery-phases.py:90`).
3. **Connection route duplicate** — delete `ConnectionInstrumentedTest#productionTransport…`, add its two extra URLs to `ConnectionRoutesInstrumentedTest`'s refused list, and drop (or update) the source-text assertions in `test/android-instrumentation-runner.test.mjs:544-547`.
4. **DispatchClaim merge** — edit `TestUiDispatch.java` and delete `DispatchClaim.java` together.
5. **Shared driver helpers** — add `WebViewTestDriver.until/call/pressKey/diagnostics/child`, `AppNavigation.clickLabel/clickText/setValue/viewIntent/alphaIsHome`, `UiNodes`, `LoopbackHttp`, `ClockIntents`, `PhaseCheckpoint`, `WorkTestDriver`; then migrate all 27 files (and the ~77 other poll copies). `alphaIsHome` move touches ChatContinuity, DailyApps, AccessibilityHomeRole, AccessibilityLifecycle, LauncherHome. `diagnostics()`/`child()` move touches BrowserFlowInstrumentedTest, ConnectionChooser, DeviceAction (if not deleted). `fixtureBytes`/`selectDocument` move touches SelectedDocumentInstrumentedTest and CameraScan. Runner gate text pins (`"1".equals(InstrumentationRegistry.getArguments().getString("<gate>")`) must remain literally present in ClockHandoff (`clockHandoff`), CloudSignInCallback (`cloudSignInNative`), and the `isSystemUser()` text in both Hosted classes.
6. **CloudVoice test seam** — replace `AlphaVoiceCloudPlugin.instrumentationBaseUrl/instrumentationCredentialSlot` (main) with a testMocks-source-set seam and update `CloudVoiceInstrumentedTest`; confirm with `scripts/audit-production-bundle.ts`/`verify-apks`.
7. **Hosted fixtures** — extract `HostedAgentFixture` used by `HostedBackgroundWorkerInstrumentedTest` and `HostedProcessRestartInstrumentedTest`; rename `legacy-worker-client` in both (server route string inside the fixture). If P15 deletes remote/local-origin hosted delivery: delete both classes, their registry entries (`scripts/android-instrumentation.ts:163-167,199`), runner-test expectations (`test/android-instrumentation-runner.test.mjs:95,430-473`), and `scripts/owner/emulator-campaign-check.ts:43,59` references.
8. **CrossApp pair** — move `fixtureIdentity`/`restorePrefs` into `NotificationAccessTestDriver` and use from both CrossApp classes.
9. **DailyApps split** — move `rootBackStaysWhileHomeAndOtherwiseLeavesAlpha` to `LauncherHomeInstrumentedTest` (or a new BackDispatch class registered in `CLASS_REGISTRY`), and the reviewed-deletion helpers to a Reminder driver shared with the `Reminder*` classes.

## Text/path pins
- `scripts/android-instrumentation.ts`: registry entries CameraScan:216, ChatContinuity:233, ClockHandoff:196 (args), ClockRepeatDays:197, CloudDeploymentStorage:191, CloudSignInAuthorization:192, CloudSignInCallback:150 (args), CloudVoice:225, ConnectionChooser:222, ConnectionRoutes:232 (flagOffOnly), ContactsCatalog:175, DailyApps:193, Flow:268, HomeCalendarCard:300 (campaign), HostedProcessRestart:163-167 (phases), HostedBackgroundWorker:199; `NOT_RUN_BY_A_RUNNER` CombinedAgent:329, CombinedAgentRestart:330, ContactsFlow:331, DeviceAction:332.
- `test/android-instrumentation-runner.test.mjs`: 75-76, 215 (ConnectionChooser), 95 and 430-473 (Hosted*; reads source for `isSystemUser()`), 144-150 (gate text for every registry `args`), 169 (ClockHandoff args), 203-205 (NOT_RUN entries must be classes), 536-547 (reads ConnectionRoutes source: `!BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`, URL literals, `"Connection request failed"`, `"VALIDATE"`), 551 (ChatContinuity).
- `scripts/ci/pending-recovery-ui.py:24` + `scripts/ci/test-pending-recovery-phases.py:54,90,95,100`: ClockAgentReview, CloudDelegationCallback (two methods, gate `cloudDelegationNative`), Connection (three methods, gate `nativeSlotIsolation`); job `.github/workflows/resident-android.yml:606`.
- `scripts/test-native-permissions.ts:46-49` (CameraScan `directDocumentCameraRetakeDraftAndPdf`, gate `cameraDocument`) + `test/native-permission-runner.test.mjs`.
- `scripts/test-calendar-regression.ts:71-72`, `test/calendar-regression-runner.test.mjs:75,81`, `test/fixtures/isolated-native-campaign.mjs:18` (HomeCalendarCard method names, gate `homeCalendar`).
- `scripts/test-cross-app-notifications.ts:20,109,158` (CrossApp classes, `processPhase`, phase/arg names).
- `scripts/owner/emulator-campaign-check.ts:42,43,47,57,59` (Flow, ChatContinuity, CameraScan, HostedProcessRestart).
- `test/native-secure-slots.test.mjs:218` (comment reference to Connection#reservedNativeSlots…).
- No `specs/quint/**/manifest.json`, `test/support/feature-parity.mjs` or `LemmaScript-files.txt` entry names any of these 27 files (the `DispatchClaim` hits there are `DeletionDispatchClaim`/`nativeDispatchClaim`).

## New patterns
- **NEW-T: test classes used as helper libraries.** Other @Test classes are instantiated or called statically for helpers: `new SelectedDocumentInstrumentedTest().selectDocument/fixtureBytes` (5), `new BrowserFlowInstrumentedTest().diagnostics/child` (2), `ChatContinuityInstrumentedTest.alphaIsHome` (4), `AccessibilityViewsInstrumentedTest.fontScale/restoreFontScale/shell` (14), `WorkflowNoticeProcessDeathInstrumentedTest.awaitMain/killMainWithoutTasks/…` (9), `RendererRecoveryInstrumentedTest.*`, `RotationInstrumentedTest.*`. Treatment: move to non-test driver classes (`WebViewTestDriver`, `AppNavigation`, `DocumentPickerDriver`, `DeviceShell`); a test class should not be a dependency.
- **NEW-T: unused `scenario` parameter threading.** Helpers declared as `eval(BoundedActivityScenario<MainActivity> scenario, String js)` that ignore the parameter (DailyApps, Flow). Treatment: drop the parameter.
- **NEW-T: misleading "legacy" fixture naming** in tests that do not exercise a legacy format (Hosted* `legacy-worker-client`, CloudDeployment `synthetic-legacy`) — confuses the A1/P5 legacy-reader audit. Rename.

## Owner questions
1. Hosted digest delivery bound to a `remote:<origin>` credential (HostedBackgroundWorker, HostedProcessRestart): product feature (keep tests) or part of the PRD-excluded pairing (delete with P15)?
2. Contacts: PRD AP-08 keeps Contacts for the AOSP image while P-60 defers it. Delete `ContactsFlowInstrumentedTest` now (restore from git later), and should `ContactsCatalog` tests move upstream?
3. Tests that assert upstream internals by reflection (`CloudSignInAuthorization` -> `CloudSignInPlugin$Attempt` private fields; `CrossAppNotifications` -> `NotificationMirrorListenerService.events`): move to `vendor/eliza` tests via an upstream PR, or keep here?
4. `scripts/test-cross-app-notifications.ts` (+ both CrossApp classes + `android/notification-fixture`) has no CI or package script: keep the manual campaign?
5. After deleting CombinedAgent*, is `scripts/start-combined-agent.ts` and its Quint launcher model still needed?
6. `ConnectionInstrumentedTest#localDraftCompareExchange…` runs only under `--all`: register it so it runs, or accept host-level coverage of the store?
