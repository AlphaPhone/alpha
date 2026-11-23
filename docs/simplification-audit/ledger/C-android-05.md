# C-android-05: Browser*/Calendar*/Camera* instrumentation, in-file cleanup

Scope: the 25 files in `chunks/android-05.files.txt`. `BrowserUnsupportedReadingInstrumentedTest.java` was already
deleted by A5 (skipped). No B1–B4 migration-map site and no `types.md`/`helpers.md` row that can be applied in-file
names these files (the shared androidTest drivers of U-L13 do not exist yet).

## Done
- `BrowserReadingInstrumentedTest.java`: deleted the five one-line forwarders `js/waitFor/invoke/result/call`; callers
  use `reading.*` directly (D4).
- `BrowserSensitiveReadingInstrumentedTest.java`: deleted the forwarders `js/waitFor/result/call` and the `child`
  alias (D4); the key-spelling array written twice is one `KEY_SPELLINGS` constant (C6 local); deleted the trailing
  `installBody(MARKUP)` + `reading.cancelThenApproveOnce(server,binding)`, which is the whole of
  `BrowserReadingInstrumentedTest.explicitImmutable…` in the same `ci-reading-test-mocks` lane (T4, chunk action 4).
- `BrowserReadingLiveInstrumentedTest.java`: dropped the unused `scenario` parameter of `dialog()` (4 call sites) and
  the unused `MainActivity a=resumedActivity()` local in the Stop step (A7).
- `BrowserSigninsInstrumentedTest.java`: the identical handoff wait loop in `tappedTelLink…` and
  `targetBlankAppLink…` is one `awaitHandoff()` built on the existing `mainIn(Stage.PAUSED,Stage.STOPPED)` (C3 local).
- `CalendarAgentCrudInstrumentedTest.java`: the three identical `AlphaCalendar.<method>(…).then(…)` window-slot calls
  (`saveOptions`, `readOptions`, `insertHandoff`) use one `invoke(method,args)` (C3 local); removed the changelog
  references "elizaOS/eliza#35913" and "Patch 0041" from comments (A8).
- `CalendarCreationRecoveryInstrumentedTest.java`: the "reset journal entry to unknown" sequence written 3× is
  `forgetReceipt(journal,id)` (C3 local).
- `CalendarCrudInstrumentedTest.java`, `CalendarFlowInstrumentedTest.java`: deleted the `tapVisibleEvent` one-line
  forwarder; callers call `CalendarUiTestDriver.tapVisibleEvent` (D4).
- `CalendarDeletionRestartInstrumentedTest.java`: deleted the `addResults(calendarRestartRun/Phase/Pid)` line; no
  script or test reads those keys (`git grep calendarRestart`: only that line) (B5/A7).
- `CalendarRangeInstrumentedTest.java`: class comment states the range (120 days back, 430 ahead) instead of "beyond
  the former fixed window" (A8).
- `CalendarSyncProviderInstrumentedTest.java`: deleted the process note "This source is not evidence that it has been
  installed/run." (A8).
- `CameraFlowInstrumentedTest.java`: dropped the never-used `BoundedActivityScenario s` parameter from
  `eval/until/click/clickText/askAlpha/closeScan/navigate/nativePreview` and all call sites (A7).
- `CameraLatencyInstrumentedTest.java`: removed the reference to a nonexistent "view refresh PLAN section 1" (A8);
  moved `DIAGNOSTIC_MS`/`lastState` into the field block.

## Deleted tests and formal artefacts
None. No source-text test pins the edited text (checked `git grep -l -F <basename> -- test specs scripts` for every
edited file; `specs/quint/refinement/native/*.mjs` only name an unrelated `CalendarAvailabilityJournalResult` class).

## Pins left broken
None known.

## Skipped
- All U-L13 shared-driver extractions (`BrowserTestDriver`, `NativeUiDriver`/`AccessibilityFixture`,
  `CalendarProviderFixture`, `TestReflection`, `DeviceShell`, `CameraTestViews`, `WebViewTestDriver.until/setValue/
  invoke`, `CalendarUiTestDriver.open/chooseDate/awaitFocus`, shared `sha256Hex`, `attemptCleanup` promotion): need new
  files and edits in files owned by other units; a later structural unit.
- P15 paired speech (BrowserReadingFixture `Server`/`wav`/`writeSpeechToken`, BrowserReadingLive deletion, paired parts
  of BrowserReading/BrowserSensitiveReading): Q-HOST-6 Open (which speech path the reading tests use instead); D5 keeps
  the harness the e2e suite drives.
- `CalendarSyncProviderInstrumentedTest` deletion: Q-CAL-1 Android half not confirmed.
- `CalendarUpgradeInstrumentedTest` deletion and the `CalendarCreationStore` facade chain: needs
  `scripts/test-installed-upgrade.ts`, `test/installed-upgrade-runner.test.mjs`, the application Quint manifest and
  `feature-parity.mjs` (A5 left it for stage E); Q-LEG/owner Q5.
- `CalendarFlow.calendarFormPersists…` duplicate: needs runner method-count edits in `scripts/test-calendar-regression.ts`,
  `test/calendar-regression-runner.test.mjs`, `test/fixtures/isolated-native-campaign.mjs` (not owned).
- `CalendarExternalEditor` receipt: its reader `collectVariant` in `scripts/test-calendar-regression.ts` is not owned.
- `CameraFlow.cameraDeniedForever…`, `CalendarAgentCrud.insertHandoff…` (unrun methods): Q-AND-21 Open.
- `CalendarAvailability.timeZoneMatchesByRulesNotSpelling` + `CalendarZones` inline: main source, runner count and
  `test/calendar-availability-reader.test.mjs` not owned.
- Upstream-only checks (`BrowserSignins.externalLinkIntents…`, `BrowserPageReading.sensitiveUrl` asserts,
  reflective `reviewQuestion`, `CalendarEventOptions.parse` cases): Q-AND-20 / D14 upstream follow-up.
- `CameraLatency` "use `arguments`" (B4): the line `"1".equals(InstrumentationRegistry.getArguments().getString(...))`
  is the gate text `test/android-instrumentation-runner.test.mjs` `gateRead` requires literally; left as is.
- `CalendarCreationRecovery`/`CalendarCrud`/`CalendarTruncation` literals → `AlphaCalendarPlugin.CONFIGURATION`: the
  literals pin persisted identities (journal name, creation URI, account names, read cap); reading the constant would
  stop the test from pinning them (same reasoning as `BrowserStorageFormat`). Left.
- `CalendarDeletionReview` package literal → `getPackageName()`: the Gradle host (and any `applicationIdSuffix`) is
  generated by the pipeline and cannot be read here, so equality is not provable. Left.
- `CalendarFlow` DST transition helper: the two loops differ (`getDateTimeBefore` vs `getDateTimeAfter`, gap vs
  overlap); a shared helper needs two flags for ~4 lines. Left.
- `BrowserReadingNavigation` synthetic-page setup helper and nested-poll helper: the two setups differ in the client
  (latch vs none) inside lambdas; not provable without compiling. Left.
- `BrowserWebFeatures` swallowed fixture exceptions (#5/#6): changes test failure behaviour; `field` text is pinned by
  `test/browser-tab-host-identity.test.mjs:74-75`. Left.
- `BrowserReadingFixture.Cleanup` → JUnit `ThrowingRunnable` (types.md): `ThrowingRunnable.run` throws `Throwable`, so
  `attemptCleanup`'s `catch(Exception|AssertionError)` would change; `BrowserIsolatedReading` (not owned) uses it. Left.
- Statement-soup reformatting (D8): no Java formatter in this stage.

## Verification
- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 13 edited Java files: exit 0.
  This is a **parse check only**, not a compile.
- Callers: every changed member is private to its class (forwarders, `awaitHandoff`, `invoke`, `forgetReceipt`,
  `KEY_SPELLINGS`, CameraFlow helpers, BrowserReadingLive `dialog`); no reflection or string-keyed use of these names
  (`git grep`). Gate strings checked by `gateRead` are unchanged.
- Host tests, `node --test` one file at a time (280 s cap each): `android-instrumentation-runner` (includes the
  `gateRead` gate-text check over every class) exit 0; `ci-emulator-evidence` exit 0; `calendar-range-reader` exit 0;
  `browser-reading-capability` exit 0. `browser-tab-host-identity.test.mjs` no longer exists (deleted by A5).
  `native-permission-runner` hit the 280 s cap with a pending promise and no individual test result while other
  implementers' runs loaded the machine; it reads no Java source (it asserts the runner's case list, whose method
  names are unchanged), so it says nothing about these edits either way. Not proven green; rerun on an idle machine.
- **Not run:** `./gradlew -p android :app:compileDebugJavaWithJavac --offline` (no Gradle wrapper/settings in
  `android/`; the host project is generated by the build pipeline). No APK build, emulator, instrumentation or device
  run; the androidTest source set was not compiled.
