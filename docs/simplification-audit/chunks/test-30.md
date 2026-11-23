# Chunk test-30: Java host-JVM fixtures (Resident* … UpdateDownloadTest)

19 files, all in `test/fixtures/`, all present. Each is a `main()`-style Java test or helper compiled by one
`test/*.test.mjs` with `javac` (or by a Quint refinement harness). Per-file reports are in
`files/test/fixtures/<name>.md`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| ResidentAttachDiagnosticTest.java | transplant (pasted into a slice of `AlphaLocalAgentPlugin`) | DELETE | carry 2 cases to a `Diagnostics` helper test if the class is extracted |
| ResidentAttachmentTest.java | unit of upstream class | DELETE | duplicate of upstream `ResidentLifecycleTest.java` |
| ResidentCredentialShutdownRetryTest.java | unit | DELETE | covered by `resident-coordinator.mjs` Quint replay |
| ResidentDeliveryTest.java | integration (9 real classes) | MERGE | with ResidentResultTransportTest into `ResidentResultDeliveryTest` (Gradle JVM `workflows-digest`) |
| ResidentRequestDeadlineTest.java | transplant template (marker `// Production request methods.`) | DELETE | 8 deadline cases to carry once request budget is its own class |
| ResidentResultTransportTest.java | integration | MERGE | same target as ResidentDeliveryTest; slot-policy rows move to the credential test |
| ResidentScheduleRearmTest.java | unit | DELETE | covered by `specs/quint/native/conformance.mjs` |
| ReviewedCopiesTest.java | unit with real files/threads | DELETE | covered by `ReviewedCopiesTraces.java`; carry 4 unsafe-name rows |
| ScopedCalendarSnapshotTest.java | integration (upstream guard + real SQL) | KEEP, SIMPLIFY | port map `Provider` to `SqliteCalendarProvider`; Quint harness depends on it; upstream follow-up |
| SerialStorageTasksTest.java | unit | DELETE | lane exercised by `credential-coordinator.mjs` |
| SmsActionJournalResultTest.java | unit (only coverage of an authorization rule) | KEEP | later MERGE into Gradle `phone` suite |
| SmsSendJournalTest.java | contract/integration | KEEP, SIMPLIFY | drop "pre-upstream journal" block (A8, upstream covers it) |
| SourceRenewalNoticesTest.java | unit | DELETE | covered by `source-renewal.mjs` / `SourceRenewalTraces.java` |
| SpeechLeadTrimTest.java | unit, verbatim upstream copy | DELETE | identical to upstream test |
| SpeechOutputWarmupTest.java | unit, upstream copy | DELETE | identical but one comment |
| SqliteCalendarProvider.java | support | KEEP | 9 importers incl. two Quint harnesses; survives all deletions |
| StorageBrowserTest.java | integration (real FS + symlinks) | KEEP | only coverage of Files escape safety; upstream follow-up |
| StorageWatchSlotTest.java | unit of upstream class | DELETE | duplicate of upstream `storage-watch.test.mjs` |
| UpdateDownloadTest.java | consumer of a text slice of `AlphaDevicePlugin` | DELETE | after carrying admission cases into `AppUpdateInstallerTest` (test-02 plan) |

Counts: KEEP 5 (two with SIMPLIFY), MERGE 2, DELETE 12 (two need cases carried first: UpdateDownloadTest and ReviewedCopiesTest).

## Coverage lost if the DELETEs happen without replacement
Honest list; each needs a carried case or an owner decision.
- **Resident attach log privacy** (ResidentAttachDiagnosticTest): nothing else checks that the attach failure
  line never reads exception text. Needs extraction of the nested class or acceptance of the gap.
- **Local-agent request deadline** (ResidentRequestDeadlineTest): timeout parsing, budget spent in queue and
  enrollment, 120 s cap and default. No Quint model covers this path. Needs a small extracted budget class.
- **Update download admission bounds** (UpdateDownloadTest): size outside 1..2 GiB refused before reading,
  digest case/length/null, empty APK. `UpdateStagingHarness` and `UpdateFlowTest` do not cover these.
- **Unsafe attachment handoff names** (ReviewedCopiesTest lines 46-50): not in the trace harness.
- Smaller: the `IGNORE` broadcast rows of ResidentScheduleRearmTest, and SerialStorageTasks retirement, which
  the replays cover only indirectly; and the settle-after-change loop of SourceRenewalNoticesTest, which should be
  checked against `SourceRenewalTraces` before deletion.

## Shared helpers worth keeping
- `SqliteCalendarProvider.java`: a real-SQL Calendar provider. It should become the *only* provider stand-in. The
  hand-written map provider in `ScopedCalendarSnapshotTest` (and its use in
  `specs/quint/refinement/native/ScopedCalendarReviewProvider.java`) should be ported to it.
- `ResidentResultTransportTest.Channel` (resident IPC fake): after the merge it is the shared resident channel
  for the delivery test.
- Every fixture re-declares `check`/`require`/`rejects` (C3). The Gradle move should bring one assertion helper
  (or JUnit).

## Cross-file actions
1. Delete together with importer tests: `test/resident-attachment.test.mjs` (tests 1, 3, 4; test 2 spawns
   `scripts/test-resident-reuse.ts`, another chunk), `test/resident-credential-shutdown-retry.test.mjs` (all
   three tests; two are T2 transplants), `test/native-resident-request-deadline.test.mjs`,
   `test/digest-missed-run-now.test.mjs` tests 3-4, `test/serial-storage-tasks.test.mjs` (test 2 is T1),
   `test/source-renewal-notices.test.mjs`, `test/native-plugin-teardown.test.mjs:375`,
   `test/speech-output-warmup.test.mjs` lines 17-36 (source regexes and the two upstream copies),
   `test/files-browser.test.mjs:377-386` (watch slot + `AlphaFilesPlugin` regexes), `test/app-update.test.mjs` test 1.
2. `specs/quint/refinement/native/action-recovery-platform.mjs:85` declares a stub `SmsActionJournalResult`.
   It should compile the real class (T10), so the model replay checks the same rule as `SmsActionJournalResultTest`.
3. When C4 (paired / Cloud-runtime agents) lands, drop the `cloud-runtime:session` and `remote:…` rows from
   `ResidentResultTransportTest.java:46`. `RendererCredentialSlots.COMPARE_EXCHANGE` still lists
   `calendar-linked-sync:v1:…`, the client linked-sync slot D4 retires. That is a product-file follow-up for the
   Android chunk owner.
4. `test/files-browser.test.mjs` and `test/speech-output-warmup.test.mjs` run `materializeNativePatches` /
   `preparePatchedNative` although `android/upstream-native-sources.json` has zero patches. Compiling vendor
   sources directly saves that step (P3).
5. Upstream follow-ups (D14, not done here): move `StorageBrowserTest` to `plugin-native-filesystem/test`, and
   `ScopedCalendarSnapshotTest` (scoped deletion has no upstream test) to `plugin-native-calendar/test/jvm`.
   Add the MVP-16 pending-enrollment rows to upstream `ResidentLifecycleTest` if the owner wants them pinned.
6. The five KEEP/MERGE fixtures are candidates for the Gradle host-JVM test source set (`android/app/src/test`,
   which does not exist yet) that `research/tests-host.md` proposes. Until it exists, they stay under
   `test/fixtures/` and run through `jvm-tools.mjs` `runJvm`.

## Owner questions
- Should `ResidentAttachDiagnostic` and the local-agent request-budget arithmetic be extracted from
  `AlphaLocalAgentPlugin`, so the privacy and deadline cases can be real tests? If not, those two behaviours lose
  host coverage.
- `SmsActionJournalResultTest` is unit-shaped but it is the only test of the SMS evidence rule (forged id, SIM,
  body, optimistic delivery). Can it stay as the T3 exception?
- Is it acceptable that `StorageBrowserTest` and `ScopedCalendarSnapshotTest` keep testing unmodified upstream
  classes here until upstream adopts them?
