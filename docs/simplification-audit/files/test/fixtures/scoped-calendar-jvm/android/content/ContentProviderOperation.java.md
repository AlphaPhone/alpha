# test/fixtures/scoped-calendar-jvm/android/content/ContentProviderOperation.java
- Lines: 6 | Kind: fixture (host-JVM stand-in for an Android framework class) | Verdict: KEEP (moves with its JVM tests)
- Covers: lets the real Calendar sync/snapshot Java compile on the host JVM and records each batch operation (type, uri, values, selection, expected count) so tests can assert the batch. Duplicates: none (the only `android.content` operation stub). Callers/importers: `test/calendar-sync-mutation.test.mjs`, `test/scoped-calendar-snapshot.test.mjs`, `test/fixtures/calendar-sync-snapshot-jvm.mjs`, `specs/quint/refinement/native/calendar-sync-enable-platform.mjs` (`testFixture` path constant), `specs/quint/refinement/native/scoped-calendar-review-platform.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | D8 | Whole class in three statement-soup lines. | Format when the Java formatter pass touches fixtures. | none |
| 2 | all | — | Survives: the Android half of Calendar sync stays (DECISIONS D18), and both of its research verdicts (`calendar-sync-mutation`, `scoped-calendar-snapshot`) are KEEP and move to a Gradle JVM test. Two live Quint native harnesses also compile against it. | Move to the Gradle `test` source set with those tests. Keep the directory if the Quint harnesses still compile against it by path. | low: the Quint harness pins the directory path as text (T10) |

## Proposed end state
Same 6 lines, formatted, under the Android JVM test fixtures next to the Calendar sync tests. The Quint native
harnesses take the fixture directory from one shared constant, not from a literal path.
