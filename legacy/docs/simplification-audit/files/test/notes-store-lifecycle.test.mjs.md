# test/notes-store-lifecycle.test.mjs
- Lines: 57 | Kind: integration (real upstream Notes store/service via `loadNotesSource` + `notesFixture`) | Verdict: MERGE into `test/integration/notes-store.test.mjs`
- Covers: two services on one store serialise writes and stop independently (file and encrypted); CAS success with failed readback leaves durable data and no success reply; stale encrypted view rejected; stop drains an admitted write and refuses a queued one. Duplicates: partly `notes-logical-revision.test.mjs:73-89` (stale encrypted view), `specs/quint/refinement/services/notes-store/index.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | P3 | Own `loadNotesSource()` bundle. | Share. | None |
| 2 | 33-44 | T4 | Stale encrypted view rejection duplicates `notes-logical-revision.test.mjs:79-80`. | Keep one. | None |
| 3 | 40-41 | - | Duplicate assertion `other.snapshot().revision === 0` twice. | Drop one. | None |
| 4 | 51 | T8 | Busy-wait loop on `setImmediate` until the write call appears (unbounded). | Bound it (the Quint index has an `until` helper with 2000 iterations; reuse). | Low |
| 5 | 8-31, 46-57 | - | Serialised writes, uncertain readback, stop drain. | Carry. | - |

## Proposed end state
Deleted as a file; three cases (shared serialised writes, CAS success with failed readback, stop drains and refuses later writes) move to `test/integration/notes-store.test.mjs`.
