# specs/quint/refinement/native/scoped-calendar-review.mjs
- Lines: 54 | Kind: Quint refinement harness (Java, whole product classes) | Verdict: KEEP (SIMPLIFY)
- Covers: model `NativeCalendarScopedReview` (live) — one-occurrence Calendar delete review: ticket coordinates, expiry, pause/destroy/lock races, uncertain enqueue. Runs actual `CalendarScopedDeletionReview.java` + `CalendarDeletionIdentity.java` + `ScopedCalendarReviewProvider.java`. Duplicates: `test/quint-native-calendar-scoped-review.test.mjs` (T4 vs aggregate). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15,46-54 | A7/T9 | `generateScopedCalendarReviewTraces` is exported and the file has a CLI (`--observe`) — nothing outside this file calls either (grep). | Inline into `checkNativeCalendarScopedReview`; delete the CLI block. | L |
| 2 | 25 | B5 | Asserts generated staged guard hashes equal the materialised ones — a check of the no-op patch staging (see platform report #1). | Delete with the staging. | L |
| 3 | 20 | B5 | Hashes `AlphaCalendarPlugin.java` though the platform replaces it with a fake. | Drop from `sources`. | L |
| 4 | 26 | – | 19 scenarios, one fresh JVM each after one javac. | Keep (campaign runner already compiles once). | – |

## Proposed end state
One exported `checkNativeCalendarScopedReview`, vendor sources compiled directly, receipt inputs = compiled files +
harness files. Lane: the two product classes, `ScopedCalendarReviewProvider.java`, `test/fixtures/scoped-calendar-jvm/**`,
`test/fixtures/{SqliteCalendarProvider,ScopedCalendarSnapshotTest}.java`, calendar upstream module.
