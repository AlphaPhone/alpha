# test/notes-replay-identity.test.mjs
- Lines: 64 | Kind: integration (real upstream `NotesStore`/`NotesService`/`interact` + generated `createNotesClient` via `loadNotesSource`; encrypted backend from the Quint fixture) | Verdict: MERGE into `test/integration/notes-store.test.mjs`
- Covers: a replayed create returns the visible canonical identity without a write; delete/restore in both orders keeps raw duplicates, exact identities and client-decodable replies. Duplicates: `test/notes-logical-revision.test.mjs:29-31` (create replay), `specs/quint/refinement/services/notes-store/index.mjs` (canonical Notes refinement exercises create/delete/restore). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25, 44 | P3 | `loadNotesSource()` called once per test (two bundles of the core runtime in one file). | Share one load in the merged file. | None |
| 2 | 11-22 | C3 | Own fixture (mkdtemp stateDir that is never used by the encrypted backend, own service construction) duplicates `notesFixture`. | Use `notesFixture`. `stateDir` is dead. | Low |
| 3 | 24-41 | T4 | Create-replay case overlaps `notes-logical-revision.test.mjs:29-31`. | Keep one. | None |
| 4 | 43-64 | - | Restore order × duplicates: unique. | Carry. | - |

## Proposed end state
Deleted as a file. The restore-order case (and one create-replay assertion) live in `test/integration/notes-store.test.mjs` on the shared `notesFixture`.
