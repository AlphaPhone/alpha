# C-android-11: androidTest Video…Workflow* in-file cleanup

Owned files: `docs/simplification-audit/chunks/android-11.files.txt`. `VoiceFloatPathDiagnosticInstrumentedTest.java`
was already deleted by A5 (A43) and is skipped. All paths below are under
`android/app/src/androidTest/java/ai/alphacompute/alphaphone/`.

## Done

- `VideoInstrumentedTest.java`: deleted `playbackDiagnostics()` (reflection into upstream `PhotosPlugin.playback`, used
  only to enrich one failure message) and its `OwnedVideoPlayback` import (B118 / D7); the range-fetch failure message
  keeps `window.__videoRange`. The two identical `finally` MediaStore cleanups became one private `deleteCreated(before)` (C3).
- `VoiceNoteReadAloudInstrumentedTest.java`: dropped the tracker id "daily-11" from the class comment (A8).
- `VoicePermissionDeniedInstrumentedTest.java`: dropped the tracker id "journeys-12" from the class comment (A8).
- `VoicePermissionRevokeInstrumentedTest.java`: `MARKER` un-exported to `private` (only this file uses it; the path
  string is unchanged, the runner reads the same path).
- `WebViewTestDriver.java`: the live-Activity stage scan written twice (`withActivity`, `evaluate`) is now one private
  `liveActivity(Class)` (same stages, same exact-type/not-finishing/not-destroyed rule, same error messages) (C3).
  No public API added (the shared driver API, U-L13, is not in this stage).
- `WorkerCrashDiagnostic.java`: `safeUnavailable()` no longer catches an impossible `JSONException`
  (`new JSONObject(Map.of("available",false))`) (B4).
- `WorkflowApprovalNoticeInstrumentedTest.java`: deleted `returnedTapDiagnostic` and its failure-path call: it only
  wrote the instrumentation result `workflowReturnedTapDiagnostic_*`, which nothing parses (NEW-UNREAD-EVIDENCE / B5);
  the inline route at the first notice test now uses the file's `route("fixture-owner",run)` (identical keys and
  values); the four "poll `pendingWorkflowTap()` until …" loops are one private `awaitPendingTap(predicate,timeout,interval)`
  with each site's original timeout and interval (C3).
- `WorkflowApprovalNoticeProcessDeathInstrumentedTest.java`: deleted the two unused `delivery` locals (B118); `long end`
  declared where assigned; deleted the unread `workflowApprovalNoticeProcessDeath` result bundle (B5; only
  `workflowApprovalProcessDeath` is parsed, by `pending-recovery-ui.py:33`); `WorkflowNoticeOwnerFixture.OWNER_SLOT`
  → production `WorkflowNoticeTaps.OWNER_SLOT` (same value `workflow-notice-owner:v1`) (C6); trailing blank line.
- `WorkflowDraftNativeInstrumentedTest.java`, `WorkflowPhoneNativeInstrumentedTest.java`: private `sha()` replaced by
  `AlphaUtil.sha256Hex(String)` (B4 shared helper; same UTF-8 input and lower-case hex output), `MessageDigest` import
  removed (C3).
- `WorkflowPhoneNativeInstrumentedTest.java`: the sync-adapter Calendars URI built three times and the calendar delete
  written twice are now private `syncAdapterCalendars(account)` and `deleteCalendar(resolver,calendar,account)` with the
  same selection and the same `assertEquals(1, …)` (C3).
- `WorkflowNoticeOwnerFixture.java`: deleted `OWNER_SLOT` (duplicate of `WorkflowNoticeTaps.OWNER_SLOT`; its only other
  users were updated above) (B118 / C6); deleted the prepare-phase `dumpsys activity intents` copy into the unread
  instrumentation result `workflowOwnerPreparedIntentSender` and the two stray blank lines (B5).
- `WorkflowNoticeProcessDeathInstrumentedTest.java`: the hand-written `WorkflowNoticeDelivery.Storage` adapter over
  `AlphaCredentialStore` replaced by `WorkflowNoticeTapsFactory.create/delivery(context)` (identical adapter, as the
  approval method in the same file already used) (C4 / D4); deleted the unread `workflowNoticeProcessDeath` result
  bundle (B5). The parsed `workflowApprovalProcessDeath` bundle is kept.
- `WorkflowNoticeTapInstrumentedTest.java`: deleted the main-looper hold harness and the `coldReadinessQueued` field
  (B114 / T5: it exercised the `TestUiDispatch` timeout, "the obsolete 1 s cap", not product behaviour); the cold tap
  is still sent once and its capture asserted (`pending(firstToken)`, runId, retained). Trailing blank line.

## Deleted tests and formal artefacts

- None. No host test, Quint model, manifest or LemmaScript entry pins these files' text (checked with
  `git grep -l -F <basename> -- test specs scripts`); the runner pins (class names, method names, gate arguments,
  `WorkflowNoticeProcessRunner`, the `voice-revoke/recording.json` marker and its keys, the
  `workflow-owner-restore-fixture` preferences keys, `workflowApprovalProcessDeath`) are unchanged.

## Pins left broken

- None known.

## Skipped

- **U-L13 shared androidTest drivers** (`WebViewTestDriver.until/call/click/liveActivity` public API,
  `AppNavigation.go/setComposer`, `WorkflowNoticeTestSupport`, `WorkflowNoticeOwnerFixture.route/forgetOwner`,
  `SignedInScope`, `InboxFixtureSignIn.driveEmail`, `TestCleanup`, `TestCalendars`, `MapStorage`): a cross-chunk unit
  (G3: introduce once, then migrate ~80 classes owned by other implementers); not scheduled in stage B or C. All local
  `until`/`ready`/`call`/`click`/`eval`/`activity()` copies in this chunk stay.
- **`MainProcessControl` split** of `WorkflowNoticeProcessDeathInstrumentedTest:23-84`: a file split/move (stage F).
- **`WorkflowNoticePoster.TAG_PREFIX`** and the `"alpha-workflow-"` literals: needs an edit to a main file I do not own.
- **`"alpha-cloud-voice-"` capture prefix**: production has no constant (literal in the `AlphaVoiceCloudPlugin`
  constructor); adding one needs a main-file edit.
- **`"cloud:production"` / `"remote:"+origin` → `Slots.*`**: the B4 map lists no androidTest sites; `remote:` belongs
  to the paired-agent question (chunk Q5 / P15). Left as literals.
- **`APP` → `BuildConfig.APPLICATION_ID`**: not proven equal for every build variant here (no Gradle); kept.
- **Q-AND-18 (Open)**: merge of the two approval process-death tests and removal of the `workflow-approval-process-death`
  phase.
- **Q-AND-36 (Open)**: `WorkerCrashDiagnostic` tombstone parser / executor timeout (`capture`'s catch-all is the
  bounded-observation behaviour; kept).
- **Q-VOICE-7 (Open)**: `note-read-aloud.json` evidence write in `VoiceNoteReadAloudInstrumentedTest`.
- **Needs upstream (D14 / U-A9 / U-T2)**: `VoiceWorkerSettlementInstrumentedTest` (Q-VOICE-5) and
  `WorkflowLegacyReminderUpgradeInstrumentedTest` with its `legacy-digest` companion (A5 deferred the reminder legacy
  store to upstream); with it the `legacyAlarm` fixture key in `WorkflowPhoneNativeInstrumentedTest`.
- **`VideoInstrumentedTest` / `VoicePermissionDenied` dual-build fork (NEW-a)**, method rename
  `…PrototypeControlsDriveRealPlayback` (D11), range-probe asset move (D8), long-line splits (D8 formatter pass):
  structural or formatter work, not this stage.
- **`WorkflowApprovalNoticeInstrumentedTest`**: `active()` → `row()` would add uniqueness/id assertions (stricter test);
  owner JSON literal written as escaped JS left as is; `new HostedNoticePoster(context)` side effect kept.
- **`WorkflowNoticeOwnerFixture`**: the repeated `assumeTrue(ELIZA_DEV_ALLOW_TEST_MOCKS)` in `prepare` runs before its
  secondary-user assertion; dropping it would turn a skip into a failure on a flag-off build in the primary user. Kept.
  HTTP loop split (D9) left for the formatter/structural pass.
- **`WebViewTestDriver` imports for `UiAutomation`/`KeyEvent`** (D8 style only) and a `key()` helper: not applied.

## Verification

- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over all 13 edited Java files: exit 0.
  This is a **parse check only**, not a compile.
- Callers checked by `git grep` across `android/`, `scripts/`, `test/`, `specs/`, `.github/`: `playbackDiagnostics`,
  `WorkflowNoticeOwnerFixture.OWNER_SLOT`, `VoicePermissionRevokeInstrumentedTest.MARKER`, `coldReadinessQueued`, and
  the deleted result keys (`workflowApprovalNoticeProcessDeath`, `workflowNoticeProcessDeath`,
  `workflowOwnerPreparedIntentSender`, `workflowReturnedTapDiagnostic`) have no reader; the remaining hits of the first
  two keys are gate arguments, unchanged. The `WebViewTestDriver.evaluate(Class,String)` overload is kept
  (`AssistantInstrumentedTest`). Lambda captures introduced (`token`, `fresh`) are effectively final.
- Host runner tests: `node --test test/android-instrumentation-runner.test.mjs test/native-permission-runner.test.mjs
  test/native-campaign-evidence.test.mjs` under an outer `timeout 600`: fail 0, cancelled 2
  (`native-permission-runner`, `native-campaign-evidence` did not finish in 600 s on this loaded machine; they test the
  runner scripts, which this unit did not change). `android-instrumentation-runner` (gate-text checks) did not fail.
  `python3 scripts/ci/test-pending-recovery-phases.py`: all cases PASS, exit 0. A rerun was stopped; not proven green
  for the two cancelled files.
- **Not run:** `./gradlew -p android :app:compileDebugJavaWithJavac --offline` cannot run (`android/` has no Gradle
  wrapper or settings; the host project is generated by the build pipeline). The androidTest source set was **not
  compiled**. No APK build, emulator, instrumentation, AOSP image or device run.
