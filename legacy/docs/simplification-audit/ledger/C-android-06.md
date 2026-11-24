# C-android-06: androidTest Camera…Hosted (chunk android-06)

Scope: the 27 files in `chunks/android-06.files.txt`. `DeviceActionInstrumentedTest.java` was already deleted by A5.
Every changed or deleted symbol was re-checked with `git grep` over `android/`, `scripts/`, `test/`, `specs/`,
`.github/` (method names, class names, gate strings, fixture strings).

## Done

- `CombinedAgentInstrumentedTest.java`, `CombinedAgentRestartInstrumentedTest.java`: deleted (U-T1, never run, A3/D5
  pairing; nothing writes `combined-agent-fixture.json`). Their `NOT_RUN_BY_A_RUNNER` rows removed from
  `scripts/android-instrumentation.ts`. The host launcher `scripts/start-combined-agent.ts` and its Quint model stay
  (Q-AND-16 open).
- `ClockRepeatDaysInstrumentedTest.java`: deleted (U-T1, T3/T4: two methods only exercised vendored
  `ClockHandoff`/`ClockDays`, one intercepted an intent the test built itself; host `test/clock-repeat-days.test.mjs`
  covers the contract). `ClockRepeatDays: {}` registry row removed.
- `ClockAgentReviewInstrumentedTest.java`: the `set` operation now carries `days:[2,6]` and the intercepted
  `ACTION_SET_ALARM` intent is asserted to carry `EXTRA_DAYS [2,6]` (the product-path assertion moved from
  ClockRepeatDays; method name unchanged, pinned by `pending-recovery-ui.py`). `SetActions` renamed `isClockAction`
  (private, D11).
- `ClockHandoffInstrumentedTest.java`: deleted `invalidIntentDoesNotBecomeAnotherAlarmRequest` (T3/T5: only called
  upstream `ClockHandoff.intent`); the label->action nested ternary became a `String[][]` pair table (D9). Gate text
  `clockHandoff` unchanged.
- `ConnectionInstrumentedTest.java`: deleted `productionTransportRejectsRemoteCloudAndUnapprovedRoutesBeforeConnecting`
  (T4 duplicate of ConnectionRoutes, no runner names it); local `slotHash` replaced by `AlphaUtil.sha256Hex` (C3,
  identical UTF-8 lowercase hex); stale comment naming the deleted `test/native-secure-slots.test.mjs` fixed (A8,
  flagged in A2's ledger). The three pinned methods are unchanged.
- `ConnectionRoutesInstrumentedTest.java`: added the deleted test's distinct routes to the refused list
  (`https://api.eliza.app/api/agents`, `/api/v1/eliza/unreviewed-service`, GET `/api/v1/eliza/google/disconnect`;
  each refused at VALIDATE by upstream `CloudConnectionPolicy.managedService`, checked by reading it); the slot-file
  digest uses `AlphaUtil.sha256Hex(byte[])` (C3). URL literals pinned by `android-instrumentation-runner.test.mjs:544-547`
  are unchanged.
- `CloudSignInCallbackInstrumentedTest.java`: deleted `signInSlotsAreNativeOnly` (T3; the `cloud-signin` namespace is
  refused through the real bridge by `Connection#reservedNativeSlotsRejectEveryPublicStorageOperation`); deleted the
  `holdFor` alias (D4); the two identical pending-record cases share one private `assertPendingRecordKept(uri)` (C5);
  `"cloud:production"` -> `Slots.CLOUD_PRODUCTION` (C6, B4 map). Gate text `cloudSignInNative` unchanged.
- `CloudDeploymentStorageInstrumentedTest.java`: fixture value `synthetic-legacy` -> `synthetic-unnamespaced` (NEW-T
  misleading legacy naming); slot literal -> `Slots.CLOUD_PRODUCTION`.
- `DailyAppsInstrumentedTest.java`: dropped the unused `scenario` parameter from `evaluate/ready/result/begin/uiWait`
  (NEW-T, B4); removed the unused `AtomicReference` import; `"cloud:production"` -> `Slots.CLOUD_PRODUCTION`.
- `FlowInstrumentedTest.java`: dropped the unused `scenario` parameter from every helper; deleted the uncalled private
  `click` helper (A7).
- `ChatContinuityInstrumentedTest.java`: removed the dated emulator-campaign history from the `alphaIsHome` Javadoc
  (A8; the reason stays); `showKeyboard`, `assertComposer`, `assertNotPosted` made private (no other user).
  `alphaIsHome` stays package-visible (4 other classes call it).
- `ConnectionChooserInstrumentedTest.java`: method renamed `closingSavesNoChoiceAndMockPreservesSavedNotes` (D11; no
  runner, script or test names the method).
- `CrossAppNotificationsInstrumentedTest.java`: wildcard `android.app.*`/`android.content.*` -> `android.content.Context`
  (the only type used from them). `CrossAppNotificationsRestartInstrumentedTest.java`: removed both wildcard imports
  (no type used) and the unused `SystemClock` import (A7).
- `HomeCalendarCardInstrumentedTest.java`: the first test reads its gate through the existing `gate()` helper (D10;
  campaign registry entry, no gate-text pin).
- `HostedBackgroundWorkerInstrumentedTest.java`, `HostedProcessRestartInstrumentedTest.java`:
  `HostedResultNotices.hash` -> `AlphaUtil.sha256Hex` (B4 map: identical; `hash` is slated for deletion);
  `"hosted-digests:v1:"` -> `Slots.HOSTED_DIGESTS_PREFIX`; fixture `legacy-worker-client` -> `fixture-worker-client`
  in both files including the loopback route, assertion message "Stored ciphertext must not be rewritten" (NEW-T).
  `isSystemUser()` text kept (runner pin).

## Deleted tests and formal artefacts

- `android/.../CombinedAgentInstrumentedTest.java`, `CombinedAgentRestartInstrumentedTest.java`: never run (feature A3/D5).
- `android/.../ClockRepeatDaysInstrumentedTest.java`: redundant / vendored-class unit test (assertion moved).
- Methods: `ClockHandoff#invalidIntentDoesNotBecomeAnotherAlarmRequest`,
  `Connection#productionTransportRejectsRemoteCloudAndUnapprovedRoutesBeforeConnecting`,
  `CloudSignInCallback#signInSlotsAreNativeOnly`.
- No Quint/Lemma artefact covers these files.

## Pins left broken

- None known. Registry rows updated with the deletions; `android-instrumentation-runner.test.mjs` source reads
  (ConnectionRoutes URL literals, `"VALIDATE"`, gate strings, `isSystemUser()`) still match.

## Skipped

- **Shared driver helpers** (chunk action 5: `WebViewTestDriver.until/call/pressKey`, `AppNavigation.clickLabel/setValue/
  viewIntent/alphaIsHome`, `UiNodes`, `LoopbackHttp`, `ClockIntents`, `PhaseCheckpoint`, `WorkTestDriver`,
  `HostedAgentFixture`, `DocumentPickerDriver`, `NotificationAccessTestDriver.restorePrefs/fixtureIdentity`): they need
  new files and edits to classes owned by other implementers (`WebViewTestDriver`, `AppNavigation`,
  `SelectedDocumentInstrumentedTest`, `BrowserFlowInstrumentedTest`, `AccessibilityViewsInstrumentedTest`, the 4
  `alphaIsHome` callers). Left for a structural pass. The private `eval/js/evaluate` one-line aliases stay with them.
- **`DispatchClaim` -> `TestUiDispatch` merge:** `TestUiDispatch.java` is not owned by this unit.
- **ContactsFlow deletion:** Q-AND-22 open.
- **HostedBackgroundWorker / HostedProcessRestart deletion:** Q-HOST-1/P15; the product HostedDelivery modes still exist
  (A5 left C4 Android half), so the tests stay.
- **CloudVoice test seam** (`instrumentationBaseUrl/instrumentationCredentialSlot` to testMocks): Q-AND-7 open, main-source change.
- **CloudSignInAuthorization, CrossAppNotifications reflection, ContactsCatalog pure method upstream:** Q-AND-20 / D14.
- **CrossApp campaign keep/drop:** Q-AND-35 open.
- **`Connection#localDraftCompareExchange…` registration:** Q-AND-21 open.
- **DailyApps split** (Back-dispatch test to LauncherHome, deletion helpers to a Reminder driver): file move/split, stage F.
- **CameraScan/ClockAgentReview/CloudDelegation formatting splits, CloudDelegation 250 ms drain wait:** D8 formatting
  or a timing change that cannot be run here.
- **`ClockAgentReview` journal slot literal, `ClockHistoryFixture` `clock-handoff:v1:device`, ConnectionChooser
  `'alpha.connection.selection.v1'`, CloudDeploymentStorage store file/alias literals:** no exported constant exists;
  creating one means editing main/owner files.
- **CloudSignInCallback `expiredPendingRecordIsNeverUsed`** kept separate (extra recreate step).

## Verification

- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 15 edited Java files: exit 0.
  Parse check only, not a compile.
- Unused-import and unused-private-member scan (script over each owned file): none left.
- `node --test test/android-instrumentation-runner.test.mjs test/clock-repeat-days.test.mjs
  test/clock-native-contract.test.mjs test/owner-emulator-campaign-check.test.mjs`: 37 tests, 37 pass, 0 fail.
- `python3 scripts/ci/test-pending-recovery-phases.py`: exit 0.
- `test/calendar-regression-runner.test.mjs` and `test/native-permission-runner.test.mjs` were cancelled at my 900 s
  timeout ("Promise resolution is still pending") while many other suites were running on this machine; no
  assertion failed, but they are **not proven green** here. They name only class/method/gate strings that this unit
  did not change (HomeCalendarCard method names and `homeCalendar`, CameraScan method and `cameraDocument`).
- **Not run:** `./gradlew ... compileDebugJavaWithJavac` (no Gradle project in `android/`; generated by the build
  pipeline), so the androidTest source set was not compiled. Symbols used are checked by reading: `AlphaUtil.sha256Hex
  (String|byte[])`, `Slots.CLOUD_PRODUCTION`, `Slots.HOSTED_DIGESTS_PREFIX` are package-private statics in the same
  package (androidTest already uses package-private main classes such as `RendererCredentialSlots`). No APK, emulator,
  instrumentation run or device run; the new `EXTRA_DAYS` assertion and the three added ConnectionRoutes cases are
  unexecuted.
