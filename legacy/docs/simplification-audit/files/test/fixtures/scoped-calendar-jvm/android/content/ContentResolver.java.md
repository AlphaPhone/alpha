# test/fixtures/scoped-calendar-jvm/android/content/ContentResolver.java
- Lines: 2 | Kind: fixture (host-JVM stand-in for an Android framework class) | Verdict: KEEP (moves with its JVM tests)
- Covers: abstract `query` and `applyBatch` so the Calendar sync Java compiles and tests can subclass a recording resolver. Duplicates: none. Callers/importers: the same five as `ContentProviderOperation.java` (calendar-sync-mutation, scoped-calendar-snapshot, calendar-sync-snapshot-jvm.mjs, two Quint native harnesses).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | — | Minimal, correct. It survives for the same reason as its sibling (DECISIONS D18). | Move with the Calendar JVM tests. | none |

## Proposed end state
Unchanged, relocated with the scoped-calendar JVM fixtures.
