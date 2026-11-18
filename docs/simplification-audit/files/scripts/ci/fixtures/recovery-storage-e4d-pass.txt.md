# scripts/ci/fixtures/recovery-storage-e4d-pass.txt
- Lines: 23 (861 bytes; raw `am instrument -r` transcript of one passing test, `ReminderDeletionStorageInstrumentedTest#reminderDeletionSlotUsesEncryptedCompareExchange`) | Kind: test fixture (captured hosted-emulator output) | Verdict: KEEP, MOVE to `test/fixtures/android-recovery/instrumentation-pass-e4d.txt` with its only consumer
- Covers: a real AndroidJUnitRunner stream including an unprefixed class-name continuation line (line 6); it proves `terminal()` (`scripts/ci/recovery_ui_guard.py:88`) accepts exactly one passed method (LF and CRLF) and refuses 17 malformed/skip/identity/order/count/late-output/failure variants. Duplicates: partial: the test's synthetic `block()` transcript (:41-:44) covers 7 failure classes on a clean stream; the captured file is the only coverage of the multiline `stream=` case. Callers/importers: only `scripts/ci/test-recovery-ui-guard.py:111`. Repo grep for `recovery-storage` outside docs: that single hit.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T9 / location | Fixture of a script-adjacent Python test, which runs twice (npm test + `resident-android.yml:569`). | Move to `test/fixtures/android-recovery/`; run the test once. | Low. |
| 2 | name | naming | "recovery-storage" is misleading (it is a generic instrumentation pass transcript of a Reminders storage test, unrelated to recovery UI); `e4d` is a run id. | Rename `instrumentation-pass-api35.txt` (or `instrumentation-pass-e4d.txt` if the sibling report's name is kept). | None. |
| 3 | 1-23 | - | Fixture names a real instrumentation class/method, but the test only uses them as opaque identity strings; renaming or deleting `ReminderDeletionStorageInstrumentedTest` in Android does not affect it. | Keep verbatim; do not couple it to the Java class. | None. |
| 4 | consumer :41-:44 vs :111-:134 | T4 (minor) | The synthetic-transcript block and the captured-transcript block both test `terminal()` refusal classes; the captured list covers the synthetic one except `text+block(0)` (close to `captured+captured`) and `INSTRUMENTATION_FAILED` (captured uses `INSTRUMENTATION_ABORTED`). | When moving the test, drop the synthetic block (:40-:44) and add those two cases to the captured list. | Low. |

## Proposed end state
- Same bytes at `test/fixtures/android-recovery/instrumentation-pass-api35.txt`, read by the moved recovery-guard test.
- One set of `terminal()` refusal cases, built on this capture.
