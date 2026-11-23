# specs/quint/refinement/native/ScopedCalendarReviewProvider.java
- Lines: 29 | Kind: harness support (a `ContentResolver` stub in package `ai.eliza.plugins.calendar` that serves rows from the vendor fixture `ScopedCalendarSnapshotTest.Provider` and fails on any write) | Verdict: KEEP
- Covers: nothing alone; it is the read-only Calendar provider for `ScopedCalendarReviewTraces`. Callers/importers: `ScopedCalendarReviewTraces.java` (constants `BEGIN`, `END`, `TITLE`, `BODY`, `LOCATION`, `changeEvent`, `changeSource`), `scoped-calendar-review.mjs` (compiled list). Survives with its only user.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-25 | — | `applyBatch` throws `AssertionError`: enforces "review never writes". Good, keep. | none | none |
| 2 | 1 | — | Lives in the vendor package so it can reach the package-private vendor fixture; cannot be folded into the traces file. | none | none |

## Proposed end state
Unchanged.
