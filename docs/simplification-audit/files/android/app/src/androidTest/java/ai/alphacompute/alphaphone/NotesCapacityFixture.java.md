# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotesCapacityFixture.java
- Lines: 52 | Role: builds a Notes collection padded to exactly `cap - HEADROOM` bytes and snapshots the original to a private file with a SHA-256 for exact restore. | Verdict: KEEP (delete its host test)
- Importers: `NotesStorageDurabilityInstrumentedTest.java:98-108`. Text/path pins: `test/notes-capacity-fixture.test.mjs:12-13` javac-compiles this file with `test/fixtures/NotesCapacityFixtureTest.java` and expects `PASS bounded Notes capacity fixture` (T5: host test of a test fixture).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | (test) | T5 | `test/notes-capacity-fixture.test.mjs` + `test/fixtures/NotesCapacityFixtureTest.java` test this androidTest fixture on the host JVM. | Delete both host files; the fixture is exercised by `NotesStorageDurabilityInstrumentedTest`. | Low |
| 2 | 12, 18, 21 | - | Depends on the current Notes slot envelope `{..., currentRaw: "<json with records>"}` (D1 says the current format stays byte-identical). | Keep in sync if the Notes envelope changes. | Low |
| 3 | 20, 23 | B3 | Self-checks of its own computed size (`throw new IllegalStateException("Fixture byte count changed")`). | Keep — guards an exact-capacity precondition. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Snapshot` | type | 27-45 | none | keep |
| `note(...)` | helper | 49-51 | Notes record JSON built inline in `NoteAudioInstrumentedTest:49` | keep |
| `RECORD_BYTES/HEADROOM/EDIT_BYTES` | const | 10 | none | keep |

## Proposed end state
Unchanged (52 lines); host test and its JVM fixture deleted.

## Verification
`npm run test:android:instrumentation -- --classes NotesStorageDurability`; `npm run verify` after removing the host test.
