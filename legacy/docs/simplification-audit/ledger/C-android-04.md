# C-android-04: androidTest Accessibility*, ActionJournal … BrowserPageQuestion

Scope: the 23 files in `chunks/android-04.files.txt`. `AccessibilityBounds.java` and
`ActivityInstanceSelectionInstrumentedTest.java` were already deleted by A5 (skipped). `BoundedActivityScenario.java`
was already cleaned by A5 (B117); nothing further applied. Every changed name was re-checked with `git grep` across
`android/`, `apps/`, `scripts/`, `test/`, `specs/` (including the testMocks source set and string uses).

## Done
- `AppNavigation.java`: added `requiredSignIn()` (the P-43 predicate, previously re-derived in AccessibilityInstrumentedTest
  and AccessibilityLifecycle) and made `assumeNoRequiredSignIn` use it (same result on every build); added `SETTLED`
  (the `__alphaTestNavigation` complete predicate), `open(view)` (request + wait selected), `enterMockMode()` /
  `exitMockMode()` (the identical sequence in BrowserContinuity and BrowserDialogLifecycle). C3/C6.
- `AccessibilityHomeRoleInstrumentedTest.java`: deleted the `assumeViews` wrapper (B4: `assumeNoRequiredSignIn` already
  returns on test-mocks builds) and the local `TEST_NAVIGATION_SETTLED` (now `AppNavigation.SETTLED`). The
  `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text the runner test requires stays in the P-43 comment at the call.
- `AccessibilityInstrumentedTest.java`: deleted the private `automation()`/`shell()` copy (uses
  `AccessibilityViewsInstrumentedTest.shell`, which reads the Configurator flags this test sets to the same
  `AUTOMATION_FLAGS` before every shell call), the local `open` and `requiredSignIn` (now `AppNavigation`), the
  `AndroidShade.useAutomationFlags` set/reset pair, issue numbers (#416, #417) and the "Round 7" history comment; unused
  imports removed. C3, D3, A8.
- `AccessibilityLifecycleInstrumentedTest.java`: deleted `assumeViews`, local `open` and `requiredSignIn(Context)`
  (now `AppNavigation.open` / `requiredSignIn`), unused `ParcelFileDescriptor`/`InputStream` imports. C3, B4.
- `AccessibilityViewsInstrumentedTest.java`: deleted `assumeViews`; dropped the issue number from the javadoc. B4, A8.
- `AndroidShade.java`: `ui()` now reads `Configurator.getInstance().getUiAutomationFlags()`; deleted the static mutable
  `automationFlags` / `useAutomationFlags` (D3). Checked in the shipped `uiautomator-2.3.0` jar: `Configurator`'s
  default flags are 0, and no other class sets them, so Notifications, NotificationChannels and SystemShade get the same
  connection as before. `waitOpen`/`waitClosed` share one private `waitShade` poll; `SYSTEM_UI`, `ROW_ID`, `text`,
  `ownRow`, `holdsRows` are now private (0 external references); issue numbers removed. C3, A7.
- `ActionJournalInstrumentedTest.java`: local SHA-256 hex replaced by `AlphaUtil.sha256Hex(String)` (identical:
  UTF-8, lower-case hex; B4 map / helpers.md §4); the two copies of the slot-folder path and slot-file cleanup are one
  `slotFolder()` / `deleteSlots(...)`. C3.
- `BrowserFlowInstrumentedTest.java`: six identical `boolean x=false;for(150){child(...)…}` polls are one private
  `untilChild` (same 150 x 100 ms); the five identical "wait for a view, open Browser, decline startup access" lines are
  one private `openBrowser()`; `AppNavigation.SETTLED` replaces the literal; the misplaced javadoc of
  `submittedSearchUsesRealProviderAndRejectsExecutableAddress` moved onto that method, without the "rounds 7 and 8"
  history. Gate text, `if(!live)return;` order and the `browserFlowSearch` status key unchanged. C3, D9, A8.
- `BrowserContinuityInstrumentedTest.java`: mock-mode enter/exit via `AppNavigation`; the inline ephemeral-profile loop
  now calls the existing `ephemeralOnly`; `AppNavigation.SETTLED`. C3.
- `BrowserDialogLifecycleInstrumentedTest.java`: mock-mode enter/exit via `AppNavigation`; `AppNavigation.SETTLED`. C3.
- `BrowserPageQuestionInstrumentedTest.java`: `AppNavigation.SETTLED` (2 sites); dropped the "(owner, 2026-11-03)" date
  from a comment. Helpers shared with JourneyJ05 keep their package visibility. A8.
- `BrowserInstalledResolverInstrumentedTest.java`: deleted the `installedGenericHttpsBrowsers` instrumentation result
  (B5: no reader anywhere; `scripts/instrumentation-result.ts` does not parse it) and the `Bundle` import.
- `AllViewAgentContextInstrumentedTest.java`: deleted (A20, never run: gated on `agentContext=true` and a fixture
  `agent-context-pairing.json` that nothing writes; drives dev-only pairing, D5). Its
  `NOT_RUN_BY_A_RUNNER.AllViewAgentContext` row removed from `scripts/android-instrumentation.ts` (brief: registry
  update in the same change).

## Deleted tests and formal artefacts
- `android/app/src/androidTest/java/ai/alphacompute/alphaphone/AllViewAgentContextInstrumentedTest.java`: never-run
  instrumentation class (feature/harness retired, D5), with its NOT_RUN registry row.
- No host test, Quint model, manifest entry or Lemma file pins the changed text (checked:
  `test/android-instrumentation-runner.test.mjs`, `test/ci-emulator-evidence.test.mjs`,
  `test/browser-reading-capability.test.mjs`, `test/aosp-image-capability.test.mjs`,
  `test/instrumentation-outcome-status.test.mjs`, `test/owner-emulator-campaign-check.test.mjs`;
  `test/accessibility-coverage.test.mjs` no longer exists).

## Pins left broken
- None known. The runner test's `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text requirement for HomeRole, Lifecycle and
  Views is still met (P-43 comment at the assumption call); stage E may drop that T1 check.

## Skipped
- **Open / D7:** Assistant* deletion or NOT_RUN listing and the `*ForTest` hooks (Q-P78-1, A54, B3, Q-AND-7);
  JourneyJ05 deletion and making BrowserPageQuestion helpers private (Q-AND-17); BrowserIsolatedReading `remote:` slot
  (Q-HOST-6 / P15); moving `publicResolvedFiltersExcludeAppLinksAndConstrainedHandlers` and other upstream-rule tests
  upstream, and an upstream test accessor (Q-AND-20, D14).
- **New shared files (stage F / cross-owner):** `AccessibilityFixture`, `BrowserTestDriver`, `BrowserHostProbe`,
  `LoopbackHttpFixture`, `AccessibilityNodes`, `NativeCallRecorder`, `CredentialSlotFiles`, `WebViewTestDriver.until/call`
  (WebViewTestDriver is another implementer's file). The reflection into upstream `BrowserTabHostPlugin` stays where it is.
- **Behaviour/timing changes not provable without an emulator:** removing `child()`'s "Not now" click; replacing fixed
  sleeps (AccessibilityInstrumentedTest 500 ms, Lifecycle 400 ms, Views 600 ms, BrowserFlow 1000 ms, AndroidShade
  `pullOnHome`); dumpsys foreground regex vs UiAutomation window package; per-user `fontScale` in
  AccessibilityInstrumentedTest (changes which user's setting is written); Views' synthetic `launcher-home` event;
  `Handler` polls → `BoundedActivityScenario.main` in BrowserFlow; BrowserDownload `networkState` diagnostic and its
  swallowed fixture-server errors; editing the upstream download store prefs.
- **Formatting only (D8, D9 later pass):** un-indented blocks in BoundedActivityScenario, AccessibilityViews,
  BrowserCookiePolicy, BrowserPageQuestion; dense one-line assertions.
- `test/aosp-image-capability.test.mjs:156` (T1 on AppInfo text): not broken by this unit; left for stage E.
- AppInfo `call`/`shell`/`foregroundPackage`, Download/ExternalHandoff/CookiePolicy helpers: their only
  simplification is the shared driver files above.

## Verification
- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 12 edited Java files: exit 0.
  This is a **parse check only**, not a compile.
- `node --test` over `test/android-instrumentation-runner.test.mjs test/ci-emulator-evidence.test.mjs
  test/browser-reading-capability.test.mjs test/aosp-image-capability.test.mjs test/instrumentation-outcome-status.test.mjs
  test/owner-emulator-campaign-check.test.mjs`: 68 tests, 68 pass, 0 fail.
- Callers of every changed or removed member checked with `git grep` (AndroidShade members, `useAutomationFlags`,
  `AccessibilityViewsInstrumentedTest.shell`, `AllViewAgentContext`, `installedGenericHttpsBrowsers`, the new
  `AppNavigation` members). `uiautomator-2.3.0` `Configurator` default flags read with `javap` from the Gradle cache.
- **Not run:** `./gradlew -p android :app:compileDebugJavaWithJavac --offline` (no Gradle project in `android/`; the
  build pipeline generates it), so the androidTest source set was **not compiled**. No APK build, emulator,
  instrumentation run, AOSP image or device run.
