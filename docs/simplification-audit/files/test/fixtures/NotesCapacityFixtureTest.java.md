# test/fixtures/NotesCapacityFixtureTest.java
- Lines: 34 | Kind: Java fixture, test of an androidTest helper (`android/app/src/androidTest/.../NotesCapacityFixture.java`) | Verdict: DELETE (with `test/notes-capacity-fixture.test.mjs`; delete-candidates A138)
- Covers: the instrumentation's near-capacity Notes seed hits the expected byte count and its snapshot round-trips. Duplicates: the instrumentation that uses the fixture exercises it for real. Callers/importers: `test/notes-capacity-fixture.test.mjs:12` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | A test of test machinery. | Delete; `NotesCapacityFixture.java` stays for the instrumentation. | Low |
| 2 | 7 | A1 | Seeds an envelope with `archive.v1/v2/daily` (legacy Notes archive shape). If D1 removes those fields from the current format, the androidTest fixture must follow. | Check with the Notes legacy deletion (A2 unit). | Low |

## Proposed end state
Deleted.
