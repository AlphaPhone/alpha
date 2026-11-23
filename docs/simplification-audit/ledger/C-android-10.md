# C-android-10 ledger (androidTest `Resident*` … `VideoCopy*`)

Owned files: `docs/simplification-audit/chunks/android-10.files.txt`. Already deleted by stage A (A5 ledger, C15/U-T1):
`SpeechPipelineTraceInstrumentedTest.java` (A41), `UiDispatchInstrumentedTest.java` (A42); skipped here.
All paths below are under `android/app/src/androidTest/java/ai/alphacompute/alphaphone/`.

## Done
- `ResidentTestFixture.java`: `hash` → `AlphaUtil.sha256Hex(bytes)`, `fileHash` → `AlphaUtil.sha256Hex(InputStream)`,
  `boundedHash` keeps its bound assertion but uses `AlphaUtil.sha256()`/`hex()` (three `%02x` loops gone; B4 J1 / C3).
  Names kept: `ResidentServiceInstrumentedTest` calls all three. Added `readUtf8(File)` and `writePrivate(File,String)`
  (sync + chmod 0600), replacing the copies in the two files below (C3). Fixed the `within30s` message typo.
- `TrustedPackagedWorker.java`: deleted `readUtf8` and `sha` (→ `AlphaUtil.sha256Hex(String)`, same UTF-8 bytes,
  same lower-case hex); `write` keeps its "already exists" refusal and then calls `ResidentTestFixture.writePrivate`;
  dropped the second ABI check in `launch()` (the constructor already refuses an unsupported ABI and the ABI cannot
  change in-process) (B4). Unused `Files`/`MessageDigest` imports removed.
- `ResidentWorkflowCrashInstrumentedTest.java`: extracted the admission prologue pasted in both tests into
  `admit(label)` (C3); deleted the pass-through `stopped(child)` wrapper (calls `stopped(context,…)` from the fixture,
  D4), the `HeldModel()` overload (D4), the private `readUtf8`/`write` copies (C3), and the duplicate
  `processStart`/`st_uid` asserts in `crash()` (B4); `safeExecutionDiagnostic` is now private (only caller in file).
  Class/method names, instrumentation args and every proof JSON key are unchanged (`scripts/ci/resident-native.py`,
  `resident_crash_diagnostic.py`).
- `SelectedDocumentInstrumentedTest.java`: removed the unused `scenario` parameter from `eval`, `waitFor`, `click`,
  `openFiles`, `preview`, `plugin`, `openReference` (all private; 109 call sites) (D4 / new pattern
  "unused-parameter forwarding helpers"); `sha256` → `AlphaUtil.sha256Hex` (C3). Public helpers borrowed by other
  classes (`fixture`, `fixtureBytes`, `selectDocument`) unchanged.
- `ShellInstrumentedTest.java`: removed the unused `scenario` parameter of `evaluate` (15 call sites) (D4).
- `SettingsRolesInstrumentedTest.java`: deleted `calendarRowMatchesRuntimeGrant` (U-T1, T4: duplicate of
  SettingsNative's row check; its `settingsCalendar` argument is passed by no runner); its "Contacts is not
  presented" assertion moved to `SettingsNativeInstrumentedTest`. Unused `Manifest`/`PackageManager` imports removed;
  class comment updated; dropped dates/round names from two measured-timing comments (A8).
- `SettingsNativeInstrumentedTest.java`: gained the "Contacts is not presented" assertion (same JS) on the Settings
  page, so the single App-permissions test still covers it (U-T1 item 10).
- `ShareFlowAssertions.java`: SHA-256 hex loop → `AlphaUtil.sha256Hex(expected)` (C3); trailing blank line.
- `SpeechNoNetworkInstrumentedTest.java`: deleted the `speech-no-network-evidence/result.json` evidence write and its
  `evidence` object (B5: no reader anywhere; every assertion message already embeds `speech.json()`); unused
  `FileWriter`/`Writer` imports removed.
- `TalkBackOrder.java`: `Result` keeps only `problems` (the `actionable`/`groups`/`seenAssistant` fields were read by
  no caller; now locals) (A7); `collect`, `accessibilityGeometry`, `visibleBounds`, `assistantGroup`,
  `assistantGroups`, `GROUPS`, `ASSISTANT_GROUP` made private (no other user); `diagnose` no longer writes an unread
  screenshot to `/sdcard/Download/alpha-accessibility-fixture-*.png` nor dumps the one-off Settings "Notifications"
  geometry (B5; nothing pulls either), so it lost its `surface` parameter.
- `TestUiDispatch.java`: deleted uncalled `started()` (A7).
- `SystemShadeInstrumentedTest.java`: dropped issue numbers from the class comment (A8).
- `StorageCategoriesInstrumentedTest.java`: `getBytes("UTF-8")` → `StandardCharsets.UTF_8` (the pinned loop line of
  `test/files-browser.test.mjs` is untouched).

## Deleted tests and formal artefacts
- None in this unit (the two never-run classes were deleted by A5). Test methods removed: 
  `SettingsRolesInstrumentedTest.calendarRowMatchesRuntimeGrant` (duplicate coverage; check moved to SettingsNative).

## Pins left broken
- None known. No file in this chunk is pinned by Quint, the native manifest or LemmaScript.
- Follow-up (not mine): `DispatchClaim.started()` (android-06/09 chunk owner) now has no caller.
- `test/browser/settings-device-facts.spec.ts:6` comment still says emulator readback lives in SettingsRoles (HOME
  role readback does; the App-permissions row is in SettingsNative). Comment only.

## Skipped
- **Open owner questions:** SettingsCrashLog `forcedUncaughtException…`, SettingsSystemFacts `switchMappingsNeverGuess`
  / `everySettingsPageHasASpecificFirstChoice`, SystemShade `everyOutcomeIs…` + fakes, ResidentStreamTransport,
  SpeechSentenceCancellation, StorageCategories, ScopedCalendarDeletion journal assertions (all Q-AND-20, open on
  the coverage gap); VideoCopyClosedFailureReview + `preserveClosedVideoCopy` (Q-AND-12); ScopedVoicePlayback
  (paired speech, D5/C4 owner); `instrumentationRecoveryEndpoint` reflection (Q-AND-7); `safeIpcRefusal` labels and
  the TrustedPackagedWorker launch environment (Q-AND-36); ScopedCalendarDeletion ×10 loop (owner Q6);
  SpeechNoNetwork CI lane (owner Q5).
- **Cross-file / needs files I do not own or a new shared file:** shared `WebViewTestDriver.until/awaitPromise/
  clickButton/setInput`, `AppNavigation.open/setComposer`, `TestShell`, `UiNodes`, `LoopbackHttp`, `CalendarFixture`,
  `RestartFixture`, `ResidentSession` (would edit `ResidentServiceInstrumentedTest`), `DocumentsUiPicker` split
  (file split, stage F), nesting `DispatchClaim`/`ReadinessEpoch` (other chunks own those files), readiness query and
  accessibility constants to assets (pinned by `mock-readiness.spec.ts`, `scripts/ci/affected.ts`),
  `NativeDeletionCoordinator` store accessor and `AlphaDevicePlugin.snapshotFacts` (main code).
- **Behaviour change or not provable by reading:** ResidentWorkflowCrash `findOwner` → known path (journal location
  is set by upstream worker code not readable here); SettingsRoles `sleep(1000)` before `assertOneLiveInstance`
  (the poll could pass before Android creates the second instance); Rotation `rotateAndCheck` reuse in the sign-in
  test (launcher branch asserts differently); SettingsFlow `click` → `press` (different match rule);
  ShareFlowAssertions `Action` → JUnit `ThrowingRunnable` (`throws Throwable` would break callers declared
  `throws Exception`); hard-coded `ai.alphacompute.alphaphone` → `BuildConfig.APPLICATION_ID` (variant ids not
  provable here); TalkBackOrder `groups()` swallow → throw (turns a degraded read into a failure);
  `Files.readString` (API 33, minSdk 29).
- **ShareReceiverActivity digest:** kept local on purpose: it runs in the test APK's own process/UID, where main-app
  classes such as `AlphaUtil` are not on the classpath.
- Local `js`/`until` aliases left in place pending the shared driver helpers.

## Verification
- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 13 edited Java files: exit 0
  (parse check only).
- Type-check with `android-36/android.jar` + `junit-4.13.2.jar` + shape-only stubs for generated/main classes
  (`ElizaAgentService`, `BuildConfig`, `AlphaCredentialStore`, `AlphaLocalAgentPlugin`, `WorkflowSurvivorInventory`,
  `WorkerCrashDiagnostic`, `DeviceRamTierPolicy`, `LocalAgentProviderAdmission`, `InstrumentationRegistry`):
  real `AlphaUtil.java` + `ResidentTestFixture`, `TrustedPackagedWorker`, `ResidentWorkflowCrashInstrumentedTest`,
  `ResidentServiceInstrumentedTest`, `ResidentModelResponseContract` compile (exit 0); separately
  `ShareFlowAssertions`, `TestUiDispatch`, `DispatchClaim` compile (exit 0). The other edited classes need Capacitor,
  UiAutomator and androidx test jars and were checked by reading every caller (`git grep`) only.
- `node --test test/android-instrumentation-runner.test.mjs test/files-browser.test.mjs`: 50/50 pass.
- `python3 test/resident-crash-diagnostic.test.py`: 6 tests OK.
- **Not run:** `./gradlew -p android :app:compileDebugJavaWithJavac --offline` (no Gradle project in `android/`; it is
  generated by the build pipeline), any APK build, emulator, instrumentation or device run.
