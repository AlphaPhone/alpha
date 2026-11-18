# C-android-07: androidTest `HostedResultNotice` … `NotesSecureFixture`

Scope: the 36 files of `chunks/android-07.files.txt`. Four were already deleted by A5 (KeptCaptureLegacyPath,
LiveAgent, LocalServerSocketRelease, NoteAudioMetadataEncrypted); A5 also already removed
`NoteRecordingSave.transcriptPrefixIsBoundedAndKeepsSurrogatePairs` and cut `NotesDocumentInstrumentedTest` down to the
refusal check. Paths below are under `android/app/src/androidTest/java/ai/alphacompute/alphaphone/`.

## Done
- `HostedResultsLifecycleInstrumentedTest.java`: deleted (T3 stub `PluginCall`, no bridge); `CLASS_REGISTRY.HostedResultsLifecycle`
  removed from `scripts/android-instrumentation.ts` (no other reference in apps/android/scripts/test/specs).
- `InboxOperationJournalInstrumentedTest.java`: deleted; its method `encryptedOperationIsAtomicAndSurvivesRecreation` moved
  into `LargeInboxAttachmentInstrumentedTest` (T4 merge, cross-file action 6, without the class rename, which is stage F).
  The moved method uses that class's `call` (async body, so each expression gained `return …;`) and its gate argument
  `largeInboxAttachmentNative`; the `inboxOperationNative` gate and `CLASS_REGISTRY.InboxOperationJournal` are removed (no
  script or test passed or named it).
- `LargeInboxAttachmentInstrumentedTest.java`: local `sha` (`%02x` loop) replaced by `AlphaUtil.sha256Hex` (identical lower-case
  hex of UTF-8 bytes); `MessageDigest` import dropped; class comment covers both methods (C3).
- `HostedResultNoticeInstrumentedTest.java`: tombstone comment deleted (A8); `HostedResultNotices.hash(...)` (3 calls) replaced by
  `AlphaUtil.sha256Hex(...)` (same output; B4 J1 says `hash` is to be deleted, so this file no longer depends on it);
  `"hosted-digests:v1:"` literal replaced by `Slots.HOSTED_DIGESTS_PREFIX` (B4 J8, same value).
- `InboxDraftInstrumentedTest.java`: `js()` now delegates to `WebViewTestDriver.evaluate(InboxFixtureActivity.class, code)`
  (exact-class selection, bounded dispatch) instead of its own latch/evaluate copy (C3/D4); inline SHA-256 loop replaced by
  `AlphaUtil.sha256Hex(slot())`; `CountDownLatch`/`TimeUnit` imports dropped; history parenthetical removed from a comment (A8).
- `InboxFixtureConnection.java`: `rejectedWrites` is `volatile` (written on Capacitor threads, read on the test thread).
- `NoteOriginInstrumentedTest.java`: local default-locale `hex` replaced by `AlphaUtil.sha256Hex`; stale "WP1 allowlist fix" Javadoc
  sentence and "(WP1 allowlist)" assertion text removed (A8; the slot is admitted). The `"note-origins:v1:device"` literal
  stays (pinned, see below).
- `LauncherAppsInstrumentedTest.java`: deleted `packageOnlyRefusalsUseUpstreamCodes` and
  `aComponentOrProfileThatIsNotTextIsMalformedNotAbsent` (T5: pure checks of upstream `SystemLauncherApps` constants and
  `malformedText`); `PackageManager` import dropped. Registry note ("two methods skip…") is still accurate.
- `LauncherHomeInstrumentedTest.java`: the 3-line "live mode, request Home, wait Home ready" prelude repeated six times is one
  private `openHome()` (C3). The seventh copy, with a different failure message, is left as is.
- `NoMockProductInstrumentedTest.java`: calls `WebViewTestDriver.evaluate` directly instead of the Notes pass-through
  `NotesSecureFixture.evaluate` (none of its expressions binds `__notesEnvelope`) (D4/D11).
- `NotesDocumentInstrumentedTest.java`: single-caller `productRefusal()` inlined into the test; non-envelope evaluations call
  `WebViewTestDriver.evaluate`; the timeout diagnostic drops fields of the deleted import/export flow
  (`importDisabled`, `shareDisabled` which had a stray `)` and so never evaluated, `cancellationNotice`, `observed*`).
- `NoteAudioInstrumentedTest.java`: `call`/`ready` use `WebViewTestDriver.evaluate` (their expressions never bind the Notes
  envelope; `until` and the envelope reads keep `NotesSecureFixture.evaluate`); `expiredOwnedDeletionCannotRestoreBeforeMigration`
  renamed `expiredOwnedDeletionCannotBeRestored` and its comment now names the startup Trash sweep (A8/NEW-b; no script
  names the method); stray blank lines removed.
- `LocalSpeechInstrumentedTest.java`: the installed `VoiceAssets.Bundle models` is used for all three `openInference()` calls instead
  of re-running `VoiceAssets.install(app)` each time (B4; `Bundle` is reusable, `install` returns a fresh view of the same
  installation). Side effect: the `loadMs` evidence value no longer includes a second install.
- `LocalSpeechBridgeInstrumentedTest.java`: manual 8 KiB copy loop replaced by `in.transferTo(out)` (API 33, like the
  `readAllBytes` already used across androidTest; instrumentation targets API 35/36 images).
- `MapsRegionalInstrumentedTest.java`: whitespace-only line removed.

## Deleted tests and formal artefacts
- `HostedResultsLifecycleInstrumentedTest.java`: stub unit test (T3) + registry row.
- `InboxOperationJournalInstrumentedTest.java`: duplicate coverage (T4), merged into `LargeInboxAttachmentInstrumentedTest` + registry row.
- `LauncherAppsInstrumentedTest` two methods: tests of upstream (T5).

## Pins left broken
- None. `scripts/ci/speech-candidate.ts` records `canonicalTestSha256` of `LocalSpeechInstrumentedTest.java` as run evidence (a
  hash, not an assertion); the gate string pinned by `test/ci-emulator-evidence.test.mjs:244` is unchanged.

## Skipped
- **Shared androidTest helpers** (`WebViewTestDriver.call/until/plugin/pressKey/resumedPackage/countLaunches`, `TestDigests`,
  `TestAudio`, `NoteAudioFiles`, `Ui.setValue`, `Keys.SELECTION`, `Cleanup.run`, `MapsTestDriver`, `BoundedActivityScenario.call`):
  none exists and those files belong to other owners (G3: introduce once, then migrate). Every `call`/`until`/`wav`/`plugin`/
  cleanup-loop copy in this chunk stays for that follow-up.
- **InboxFixtureScope → InboxFixtureConnection merge and `InboxFixtureSignIn.signIn()`**: needs edits in
  `VoicePermissionDeniedInstrumentedTest` (another owner) and moving the fields would initialise `OWNER` before `runId` is set
  unless `OWNER` is also made lazy; left for the androidTest helper change. `rejectedWrites` stays an `int` (an
  `AtomicInteger` would change the readers in VoicePermissionDenied).
- **Class rename** `LargeInboxAttachment` → `InboxSecureSlotsInstrumentedTest`: file rename, stage F.
- **Open questions:** HostedResultNotice `run()` and its two campaigns (D5 / android-07 Q1), JourneyJ05 (Q-AND-17),
  LocalAgentProviderInstrumentedTest and the `AlphaLocalAgentPlugin` delegates (Q-AND-25), Maps regional methods and the
  never-passed `mapsLatitude` method `MapsInstrumentedTest.explicitRecenterUsesInjectedNativeLocationAndStopsWatch` (Q-AND-21
  "wire or delete"), LocalSpeech/LocalVoiceRecordingLimit evidence writes (Q-VOICE-7), LocalSpeechBridge reflection and
  NativeVoiceLatency (Q-VOICE-5, upstream), NoteRecordingSave → NoteAudio merge (Q-AND-19), NotesDocument export expectation
  (Q-NOTES-8; NEW-a: `exportText` is expected to answer `unsupported` although it is not test-mocks gated, needs an emulator run).
- **NoteAudio `optInRetiredDeletionCannotArriveAfterReloadAndRestore`**: its `audio-fence` phase sits inside
  `scripts/ci/pending-recovery-ui.py` PHASES, which `test-pending-recovery-phases.py` faults by index (same reason A5 gave); stage E.
- **NoMockProduct `legacyMockSelectionRequiresSignIn`**: the renderer still retires a stored `{kind:'mock'}`
  (`connection-ui.tsx:817`, `main.tsx:103`), so the test still covers live code.
- **NoteOrigin `SLOT` → `Slots.NOTE_ORIGINS`**: `test/android-instrumentation-runner.test.mjs:639` regex-matches the literal; stage E.
- **NotesSecureFixture.evaluate rename** (`evaluateWithNotes`, 18 callers in other files): cross-owner.
- **`test/notes-capacity-fixture.test.mjs` + `test/fixtures/NotesCapacityFixtureTest.java`** (T5): not broken by this unit's change, so
  left for stage E per the brief.
- **LocalVoiceRecordingLimit unused `scenario`**: likely required for foreground mic capture on Android 14; not provable here.
- **D8 line splitting / Javadoc rewrapping** (NoteRecordingSave, MailAttachment, IsolatedPdf, ImageCapabilities): formatting only (D9).
- **NativeVoiceLatency field reorder**: `test/native-voice-latency.test.mjs:148-149` pins a source line verbatim.
- **"cloud:production" in InboxFixtureSignIn/InboxDraft**: InboxDraft uses it inside renderer JS strings and the renderer
  secure slot name; `InboxFixtureSignIn` could use `Slots.CLOUD_PRODUCTION` but B4 lists only main sites; left unchanged.

## Verification
- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 13 edited androidTest files: exit 0
  (parse only).
- Partial type check: `javac -proc:none -implicit:none` of the 13 edited files against `android-36/android.jar`, junit 4.13.2,
  hamcrest 1.3, androidx annotation and classes.jar of cached androidx test/work/core/appcompat/webkit/lifecycle/activity AARs,
  with sourcepath = app main + androidTest + Capacitor + `.eliza/patched-native` + vendor plugin sources. All errors reported in
  the edited files are environmental (`BuildConfig` is generated; `MainActivity`/`InboxFixtureActivity` do not resolve as
  `Activity` because the fragment/appcompat chain is incomplete, so `BoundedActivityScenario.launch` and casts fail); no error
  mentions `AlphaUtil`, `Slots`, `openHome`, `models`, `transferTo` or the merged method. This is not a Gradle compile.
- `node --test test/android-instrumentation-runner.test.mjs test/ci-emulator-evidence.test.mjs test/native-voice-latency.test.mjs`:
  53 tests, 53 pass.
- Not run: `./gradlew … compileDebugAndroidTestJavaWithJavac` (no Gradle project in `android/`), any APK build, emulator or
  instrumentation run. No device evidence.
