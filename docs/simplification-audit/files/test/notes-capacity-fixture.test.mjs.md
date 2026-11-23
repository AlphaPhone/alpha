# test/notes-capacity-fixture.test.mjs
- Lines: 15 | Kind: test of test machinery (compiles the androidTest helper `NotesCapacityFixture.java` with `test/fixtures/NotesCapacityFixtureTest.java` on the host JVM, `-Xmx512m`) | Verdict: DELETE
- Covers: the instrumentation fixture really fills the 32 MiB Notes collection and a small edit exceeds it. Duplicates: the instrumentation test that uses the fixture proves it on device. Callers/importers: `npm test` glob; sole importer of `NotesCapacityFixtureTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | Tests a test fixture, not product code; allocates ~32 MiB JSON on each run. | Delete with `test/fixtures/NotesCapacityFixtureTest.java`. | Low |

## Proposed end state
File and its Java fixture deleted.
