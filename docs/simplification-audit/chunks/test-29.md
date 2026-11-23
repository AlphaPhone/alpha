# Chunk test-29: Files host tests, release enrollment, recovery screen, and 31 Java fixtures

44 files assigned. 2 no longer exist (`test/feature-parity.test.mjs`, `test/fixtures/AccessibilityBoundsTest.java`),
both already removed under D15 and A45. "Gradle <area>" means the planned JVM test source set
`android/app/src/test/java/ai/alphacompute/alphaphone/`, with one shared Android stub set, grouped by area
(research `tests-host.md` P6).

## Files

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/enroll-release-keys.test.mjs | tooling | KEEP / MERGE | `test/tooling/release-signing.test.ts` (drop literal key list; one shared ceremony) |
| test/error-boundary-home-escape.test.mjs | integration (real bundled module, jsdom, Capacitor stub) + 1 T1 | KEEP / MERGE | `test/integration/shell-settings.test.ts`; delete line 93 |
| test/feature-parity.test.mjs | (gone) | DELETE (done) | — |
| test/files-agent-patch.test.mjs | source-text + upstream unit (T1, T5) | DELETE | upstream follow-up |
| test/files-browser-atomic-placement.test.mjs | upstream integration in Chromium (T5) | DELETE | upstream follow-up |
| test/files-browser.test.mjs | upstream unit + source-text + upstream JVM (T1, T3, T5) | DELETE | `journeys/files.spec.ts` cases; upstream follow-up |
| test/files-index.test.mjs | transplant (T2), dead exports | DELETE | FilesRecentIndex Quint (port to import) |
| test/files-legacy-storage.test.mjs | source-text + unit + tooling | MERGE lines 44-63, DELETE rest | `test/tooling/apk-verify-audit.test.ts` |
| test/files-picker-lifecycle.test.mjs | transplant of upstream adapter (T2, T5) | DELETE | `journeys/files.spec.ts` late-picker case; upstream follow-up |
| test/files-reviewed-proposal.test.mjs | unit with boundary stubs | MERGE | `test/integration/device-actions.test.ts` |
| test/files-storage-refusal.test.mjs | Java method transplant (T2) + T1 | DELETE | optional Gradle storage test after extracting the helper |
| test/final-ui-lifecycle.test.mjs | transplant (11 marker slices) + T1 | DELETE | `journeys/chat.spec.ts`, `journeys/voice.spec.ts`, `journeys/settings.spec.ts` cases |
| test/first-send-draft-migration.test.mjs | Quint wrapper (T4) + transplant (T2) | DELETE | Quint runner; PORT the refinement to import |
| fixtures/AccessibilityBoundsTest.java | (gone) | DELETE (done) | — |
| fixtures/CalendarAvailabilityReaderTest.java | JVM integration (+ sqlite3) | KEEP / MOVE | Gradle calendar (reader-only rows upstream) |
| fixtures/CalendarListWindowTest.java | upstream reader + regex-copied config (T2, T5) | DELETE | — |
| fixtures/CalendarSyncConsentTest.java | single-class unit, security gate | MERGE | Gradle calendar |
| fixtures/CalendarSyncMutationTest.java | JVM integration | KEEP / MOVE | Gradle calendar (`CalendarSyncTest`) |
| fixtures/CalendarSyncReceiptRecoveryTest.java | single-class unit, recovery rules | MERGE | Gradle calendar |
| fixtures/CalendarSyncSnapshotTest.java | JVM integration + shared provider | KEEP / MOVE | Gradle calendar; Quint harness path follows |
| fixtures/ClockContractTest.java | upstream unit (T5) | DELETE | upstream follow-up |
| fixtures/CloudSpeechPolicyTest.java | single-class unit, host allow-list | MERGE | Gradle voice |
| fixtures/CloudSpeechTimingsTest.java | upstream unit (T5) | DELETE | upstream follow-up |
| fixtures/CloudSpeechWireTest.java | upstream unit (T5) | DELETE | upstream follow-up |
| fixtures/CloudVoiceLimitTest.java | single-class unit, replay rule | MERGE | Gradle voice |
| fixtures/ConnectionRoutesTest.java | JVM integration, transport allow-list | KEEP / MOVE | Gradle connection-cloud (retarget after U-A6) |
| fixtures/FilesStorageRefusalTest.java | Java transplant template (T2) | DELETE | — |
| fixtures/FirstWriteSpeechOutputTest.java | upstream unit (T5) | DELETE | upstream follow-up |
| fixtures/GmailBackgroundLockContentionTest.java | multi-thread JVM integration | KEEP / MOVE | Gradle credentials/inbox |
| fixtures/GoogleAgentAccessFileTest.java | single-class unit, cross-process file | MERGE | Gradle inbox-google or importer integration |
| fixtures/HostedNoticeWithdrawTest.java | JVM integration (dup setup) | MERGE | into Gradle `HostedResultNoticesTest` |
| fixtures/HostedResultNoticesTest.java | JVM integration | KEEP / MOVE | Gradle notices |
| fixtures/KeyboardDictationPolicyTest.java | single-class unit, privacy rule | MERGE | Gradle voice |
| fixtures/NativeDigestSourcesTest.java | JVM integration | KEEP / MOVE | Gradle workflows-digest |
| fixtures/NativeNotificationSessionTest.java | JVM integration | KEEP / MOVE | Gradle resident |
| fixtures/NativeReadEpochTest.java | unit of dead class (A7) | DELETE | with A61; fix Quint MediaLifecycle pins |
| fixtures/NativeVoiceBindingTest.java | single-class unit, owner fence | MERGE | Gradle resident/voice |
| fixtures/NavigationOpenRequestTest.java | single-class unit (D7) | DELETE | with nesting into MainActivity |
| fixtures/NoteRecorderJournalTest.java | JVM integration, process death | KEEP / MOVE | Gradle notes |
| fixtures/NotesCapacityFixtureTest.java | test of an androidTest helper (T5) | DELETE | A138 |
| fixtures/NotesDeletionLeaseTest.java | single-class unit, irreversible deletion | MERGE | Gradle notes |
| fixtures/PairedSpeechContractTest.java | unit of retired paired speech (D5) | DELETE | A69 |
| fixtures/PluginWorkersTest.java | single-class unit | MERGE | Gradle runtime |
| fixtures/RendererRecoveryBudgetTest.java | single-class state machine | MERGE | Gradle shell |

Counts: KEEP 11 (enroll-release-keys, error-boundary-home-escape and 9 JVM integration fixtures, all moved or merged
into a suite), MERGE 13 (files-legacy-storage, files-reviewed-proposal, 11 Java fixtures), DELETE 20 (2 already gone).

## Behaviours that lose all coverage if the DELETEs happen

- **Files Trash/restore under IndexedDB refusal** (`files-browser-atomic-placement`): the only real-IndexedDB race
  proof. It covers upstream code, so it needs an upstream test. Journeys cover only the happy path.
- **Browser Files volume rules** (`files-browser.test.mjs`: free-space estimate validation, 30-day expiry, confirmed
  Empty deletes only the items shown, path escape refusal): partly covered by `files-bulk.spec.ts`. The
  expiry and "late item stays in Trash" cases need a `journeys/files.spec.ts` case with a fixed clock, or an upstream test.
- **Late native picker results after leaving Files** (`files-picker-lifecycle`): no other coverage. Needs a journey
  case with a held test-mocks `storageSelect`, or an upstream adapter test.
- **Files native refusal routing: cleanup before the answer, closed worker** (`files-storage-refusal`): no other
  coverage until the helper is extracted and tested in Gradle.
- **Composer focus on native Back with an unchanged viewport, and the voice IME handoff** (`final-ui-lifecycle`):
  needs the journey cases listed in that report. Settings focus restore stays with the settings-page-focus Quint
  model. The reply announcer stays with `chat-reply-announcement.spec.ts`.
- **First-send draft migration**: stays covered by the Quint refinement, but only once that harness is ported off
  text slicing. Otherwise the next `agent-adapter.ts` split breaks it.
- **Calendar list truncation with Alpha's configuration** (`CalendarListWindowTest`): device-only afterwards
  (`CalendarTruncationInstrumentedTest`).
- **ClockDays / CloudSpeechTimings / CloudSpeechWire / FirstWriteSpeechOutput / StorageBrowser**: these are upstream
  classes. They lose their host coverage in this repo until upstream adds tests (follow-ups).

## Shared helpers worth keeping

- `test/fixtures/SqliteCalendarProvider.java`: the one Calendar provider stand-in (real SQL). Use it as the base of
  the Gradle calendar suite and retire the in-memory `ContentResolver` in `CalendarSyncSnapshotTest`.
- `CalendarSyncSnapshotTest.Provider`/`read`/`row`: used by the mutation fixture and the Quint
  `calendar-sync-enable-platform` harness. They move as a unit.
- The `ThreadMXBean` wait-for-owner-and-monitor pattern in `GmailBackgroundLockContentionTest`: the model for
  lock-order tests (it does not sleep).
- `test/fixtures/jvm-tools.mjs` (`runJvm`, `nativeSource`, `fixture`, `jvmSkip`): needed only until the Gradle
  move. The Quint native harnesses use their own `java.mjs`.

## Cross-file actions

1. Create the Gradle JVM test source set before deleting any node wrapper of a KEEP/MERGE Java fixture. Move
   `CalendarSyncSnapshotTest` and the Quint `calendar-sync-enable-platform.mjs` path list in the same commit.
2. Delete `NativeReadEpoch.java` with its test (A61). Remove the pins in `specs/quint/native/manifest.json:442`
   and `specs/quint/refinement/native/index.mjs:116`, and the use in `ComponentTraces.java:94`, so the MediaLifecycle
   refinement keeps passing.
3. Port `specs/quint/refinement/application/first-send-draft-migration.mjs` to import an exported
   `settleFirstSendSlot`. Then `test/fixtures/first-send-draft-migration.mjs` can move under `specs/`.
4. Delete the dead `files-index.ts` helpers and the `'tree'` kind (B197) together with `files-index.test.mjs`.
5. Merge `HostedNoticeWithdrawTest` into `HostedResultNoticesTest` and switch both to two-argument `capture` (B36).
6. `ConnectionRoutesTest`: retarget at `ConnectionRoutes.POLICY`/`CloudConnectionPolicy` when U-A6 deletes the
   facade. Drop the flag-on `retiredPairing` case when D5 removes development pairing.
7. `files-browser.test.mjs` slices `template.html` up to the Wallet `sc-if`, so deleting Wallet (D2) breaks it. Delete
   the test before or with the Wallet change.
8. Upstream follow-ups (D14): plugin-files (agent contract agreement, Trash placement races, late picker results,
   volume rules), plugin-native-filesystem (`StorageBrowserTest`, `StorageWatchSlotTest`), plugin-native-system
   (`ClockDays` against `validateClockOperation`), plugin-local-inference speech bridge (`CloudSpeechTimings`,
   `CloudSpeechWire`, `FirstWriteSpeechOutput`), plugin-native-calendar (`SelectedCalendarReader` does not check
   `calendar_access_level`).
9. After `files-browser.test.mjs` goes, check whether `test/fixtures/StorageBrowserTest.java`,
   `StorageWatchSlotTest.java` and `android-stubs/android/webkit/MimeTypeMap.java` have any other importer. If not,
   delete them.

## Owner questions

1. Single-class Java unit tests that guard security or data-loss rules (Calendar sync consent, Cloud speech host
   allow-list, keyboard dictation sensitive-field refusal, notes deletion lease, renderer recovery budget, voice
   binding fence, receipt recovery): this review keeps them as table-driven methods in the Gradle JVM suites, which
   is an exception to "no unit tests". Accept, or delete them and rely on instrumentation?
2. Should the tests of upstream code that Alpha ships unmodified (Files browser volume, StorageBrowser, ClockDays,
   speech bridge classes) be deleted now and filed upstream, accepting a coverage gap until upstream lands them?
3. Does the Gradle JVM test source set (`android/app/src/test`) become the single home for host Java tests, replacing
   `runJvm`/javac from node:test and the per-family stub trees?
4. `NativeReadEpoch` has no product caller but is modelled by Quint MediaLifecycle. Delete it and drop the model's
   epoch obligation, or bind that obligation to the upstream media catalog?
