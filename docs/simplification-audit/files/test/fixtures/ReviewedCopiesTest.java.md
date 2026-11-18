# test/fixtures/ReviewedCopiesTest.java
- Lines: 81 | Kind: unit with real temp files and threads (single Alpha class `ReviewedCopies`) | Verdict: DELETE
- Covers: mail-attachment copy scoping: unsafe names refused, first load removes an earlier process's leftovers, a peer load waits for the first sweep, peers keep each other's copies, revoke/clear only touch own copies, expiry at exactly `GRANT_MILLIS`. Duplicates: `specs/quint/refinement/native/ReviewedCopiesTraces.java` (225 lines) replays `specs/quint/native/ReviewedCopies.qnt` against the real class, including the blocked second sweep (`requireBlocked`, `listFiles` hold at lines 33-36, 147-149) and the `GRANT_MILLIS` boundary (lines 95-96). Callers/importers: only `test/native-plugin-teardown.test.mjs:375`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-37, 67-77 | T4 | Concurrency and expiry cases are the model replay's cases. | Delete. | Low |
| 2 | 46-50 | — | Unsafe handoff names (`""`, `nested/name.txt`, `nested\name.txt`, NUL) are not in the trace harness (no `IllegalArgumentException` path there). | Carry these four rows into `ReviewedCopiesTraces` as a fixed precheck, or into the Gradle `inbox-gmail-google` JVM suite. | Low-medium: path-traversal refusal. |
| 3 | 31-33 | T8 | Busy-wait for `Thread.State.BLOCKED` with a 5 s deadline. | Goes with the file. | — |

## Proposed end state
Deleted; the four unsafe-name rows move to the model replay harness. `native-plugin-teardown.test.mjs` loses its
last line.
