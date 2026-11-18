# C-android-09 ledger (androidTest Photos*, Private*, Prototype*, Real*, Reminder*, Remote*, Renderer*, Reset*, Resident*)

All paths are under `android/app/src/androidTest/java/ai/alphacompute/alphaphone/` unless stated.
Already gone before this unit (A5): `PosterCalendarJourneyInstrumentedTest.java`, `ResidentModelResponseContractTest.java`.

## Done
- `RemoteAgentInstrumentedTest.java`: deleted (D5, U-T1). Never run (`localRemote` has no runner) and the
  "Local development agent" / "Connect local agent" UI it drives is gone from `apps/app/src/runtime/connection-ui.tsx`.
  Removed `NOT_RUN_BY_A_RUNNER.RemoteAgent` from `scripts/android-instrumentation.ts` (G4).
- `PhotosTestFixture.java`: deleted the `__photoTouchTrace` listener install and the two `ALPHA_PHOTO_TOUCH_*`
  stdout dumps (B5, no reader); deleted `hash(byte[])` (C3, helpers.md SHA row).
- `PhotosMultiShareInstrumentedTest.java`: recipient hashes use `AlphaUtil.sha256Hex` (C3).
- `PhotosTrashInstrumentedTest.java`: `bytes` static-imported from `PhotosTestFixture` (local copy deleted); the first
  test's inline owned-JPEG insert replaced by the file's own `fixture(resolver)` (C3); the owned-row Bundle query written
  twice became `ownedRowExists(context,uri)` (C3).
- `PrivateResidentSocketInstrumentedTest.java`: `denied` made private (A7; only in-file caller).
- `PrototypeFlowInstrumentedTest.java`: dropped the unused `BoundedActivityScenario s` parameter from
  `eval/waitFor/click/home/ready/open/fill` and all 67 call sites (D10).
- `RealClockInstrumentedTest.java`: deleted the evidence recorder (`record`, `output` dir, `events.jsonl`, PNGs,
  `notification-ancestry.json`; B5, no reader in scripts/test/.github) and its now-unused imports.
- `ReminderAgentInstrumentedTest.java`: deleted `receiptSurvivesActualProcessReplacement` (NEW-T: gate
  `reminderAgentPhase` has no runner, not under Q-AND-21); 4 try/fail/catch blocks became `assertThrows` (D8); alarm
  probes use `AlphaReminders.CONFIGURATION.remindAction/alarmUriPrefix` (C6).
- `ReminderTimingInstrumentedTest.java`: 9 try/fail/catch blocks became `assertThrows` (D8); `alarm()` uses
  `AlphaReminders.CONFIGURATION` (C6). Method names unchanged (pinned by `pending-recovery-ui.py`).
- `ReminderLifecycleInstrumentedTest.java`: Javadoc "Patch 0040:" history removed (A8); 3 try/fail/catch to
  `assertThrows` (D8); fixture pref names from `AlphaReminders.CONFIGURATION.envelopeName/legacyName` (C6).
- `ReminderCapacityInstrumentedTest.java`: cleanup pref names from `AlphaReminders.CONFIGURATION` (C6).
- `ReminderDeletionStorageInstrumentedTest.java`: single-caller `slotHash` replaced by `AlphaUtil.sha256Hex` (C3).
- `ReminderNoticeQuestionInstrumentedTest.java`: `ask()` sends `ReminderNotificationActions.intent(posted,ASK)` instead
  of `actions[2]`, and the duplicate index/title assertion in `post()` is gone (C3); "#416" issue number dropped.
- `ReminderRecoveryInstrumentedTest.java`: deleted the `verify-reboot` branch that only failed (A7; no runner sends it,
  an unknown phase still fails); `OPEN_REMINDER` literal → `AlphaReminders.CONFIGURATION.openAction` (C6).
- `ReminderRecurrenceRecoveryInstrumentedTest.java`: `OPEN_REMINDER` literal → `CONFIGURATION.openAction` (C6).
- `ReminderTapProcessDeathInstrumentedTest.java`: deleted the `addResults("reminderTapProcessDeath",…)` evidence
  bundle (B5; `pending-recovery-ui.py` parses only `workflowApprovalProcessDeath`).
- `ResidentAlwaysPresentInstrumentedTest.java`: date and issue numbers dropped from the P-43 Javadoc;
  `"cloud:production"` → `Slots.CLOUD_PRODUCTION` (B4 map).
- `ResidentEgressRedactionInstrumentedTest.java`: local `sha256` → `AlphaUtil.sha256Hex` (C3);
  `"local-agent-provider:v1"` → `LocalAgentProviderAdmission.PROVIDER_SLOT` (C6); unused imports removed.
- `ResidentServiceInstrumentedTest.java`: deleted the `stopped(child)` pass-through (D4; callers use the
  static-imported `ResidentTestFixture.stopped(context,child)`); provider slot literal → `PROVIDER_SLOT` (C6).

## Deleted tests and formal artefacts
- `RemoteAgentInstrumentedTest.java` (never-run instrumentation class for a deleted feature, D5) and its
  `NOT_RUN_BY_A_RUNNER` entry. No Quint/Lemma pins.

## Pins left broken
- None. Class names, gate argument names, `@Test` method names read by `pending-recovery-ui.py`,
  `test-pending-recovery-phases.py`, `resident-native.py`, `reminder-recovery-fixture.ts`, `test-installed-upgrade.ts`
  and the registry are unchanged. Proof files `resident-*-complete.json` are still written.

## Skipped
- Open questions: `PublicCloudTransportProbe` (Q-AND-34), `ResetExternalFixture` (Q-AND-33),
  `ReminderNoticeQuestion` agent method (Q-AND-21), `ReminderDeletionJournal` / `civilScheduleSkips…` upstream move
  (Q-AND-20, D14), PhotosTrash two-Activity `AlphaAssistActivity` race (D7 / Q-P78-1).
- P5 legacy reminder/selection data (needs upstream `legacyName` change, D14, as A5 recorded): ReminderAgent
  `legacyMigration…`, ReminderOneOff legacy row, ReminderUpgrade `LEGACY` seed, ReminderLifecycle compatibility channel,
  ReminderTiming timing-less receipts, ResidentAlwaysPresent `{kind:'offline',localApps:true}` seed (renderer
  migrate-on-read still present in `connection-ui.tsx:815`).
- Merges/moves into files this unit does not own or that need a file move (stage F / U-L13): `ReadinessEpoch` →
  `StartupDocumentProbe`, `ResidentModelResponseContract` → `ResidentTestFixture`, `ReminderTestSupport` (rename of
  `ReminderUiTestDriver` + `ReminderNotificationActions`), shared `WebViewTestDriver.until/clickLabel/setValue/nativeCall`,
  `AccessibilityTestDriver`, `TestCleanup`, `RendererTestDriver`, `ProcessDeathDriver`, resident `call/awaitReady`
  consolidation, optional class renames (PrototypeFlow, ReminderDeletionStorage).
- `ReminderLifecycle.fullStoreRefuses…` dedupe into ReminderCapacity: the two use different isolation
  (`ReminderLifecycleTestAccess.Isolated` vs `ReminderTestAccess.isolate`); not provable without a device run.
- `ReminderDeletionStorage` `assertTrue(BuildConfig.DEBUG)`: kept (guards the build type; not provably redundant here).
- `ResidentEgressRedaction` broad `catch(Exception)` narrowing, `ReminderTapLifecycle` swallowed `UnknownTap`,
  `ResidentAlwaysPresent` network-down assertion, `ReminderStale` reflection/sleep: change test behaviour; left.
- `ResidentService` ELF header check, `ReminderUpgrade` literal action/URI names (intentional installed-name pins),
  `"b".repeat(64)` / `"c".repeat(64)` bindings, `ReminderTapProcessDeath` `APP` constant: left as is.
- `PhotosTrash.fixture()` vs `PhotosTestFixture.fixture`: kept the local one because it deletes the row on a failed
  write; `removeAlbums` dedupe not done (predicate needs checked JSON access).

## Verification
- `node --test test/android-instrumentation-runner.test.mjs`: 26 pass, 0 fail.
- `python3 scripts/ci/test-pending-recovery-phases.py`: PASS. `python3 scripts/ci/test-recovery-ui-guard.py`: PASS.
- `javac -proc:none` on each edited Java file (no Android classpath): no syntax errors; only unresolved-symbol errors
  from the missing Android/app classpath, as expected.
- Callers checked by `git grep` for every removed or changed member (`hash`, `slotHash`, `stopped`, `denied`, the
  deleted test method and evidence keys, `RemoteAgent`). `AlphaUtil`, `Slots`, `LocalAgentProviderAdmission.PROVIDER_SLOT`
  and `AlphaReminders.CONFIGURATION` fields are package-visible/public in the same package.
- Not run: Gradle `compileDebugAndroidTestJavaWithJavac` (no generated Gradle project here; 35 GiB free but the brief
  forbids assembles), any emulator run.
