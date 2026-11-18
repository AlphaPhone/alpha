# test/notes-logical-revision.test.mjs
- Lines: 102 | Kind: integration (bundles the real upstream `NotesStore`/`NotesService`/`interact` from `vendor/eliza/plugins/plugin-notes` plus the generated client `createNotesClient` through `specs/quint/refinement/services/notes-store/module.mjs`, runs them on a temp encrypted/file backend) | Verdict: MERGE into `test/integration/notes-store.test.mjs`
- Covers: the agent-side Notes store keeps an edited note's identity and order by logical revision even when wall time ties or runs backward, fails closed on invalid revision metadata, and keeps durable + cached state unchanged when a projection or validation fails. Duplicates: `test/notes-store-lifecycle.test.mjs` and `test/notes-replay-identity.test.mjs` (same loader and fixture, same store), partly `specs/quint/refinement/services/notes-store/index.mjs` (`runCanonicalNotesRefinement`, which already drives create/update/restart through the same fixture). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T4, P3 | Each of the three Notes-store test files calls `loadNotesSource()` itself: one esbuild bundle of the core runtime + plugin-notes per file, plus `coreStatePatch` hashing. | One file, one `loadNotesSource()` at top level. | None |
| 2 | 37-54 | A1 / T5 | "legacy schema 1/2/3" case asserts upstream's back-compat upgrade of schema 1 and 2 documents. This product starts with empty private data (DECISIONS D1); schema 1/2 reading is upstream's concern. | Drop the case; keep schema 3 only. Upstream follow-up if wanted. | Low |
| 3 | 12-35 | - | Tied/backward clock identity, no-change bump, create replay, restart: real modules, real bytes. | Carry (one parameterised case). | - |
| 4 | 56-71 | - | Projection failure / `NOTES_VALIDATION_FAILED` leave durable and cached state unchanged. | Carry. | - |
| 5 | 73-89 | - | Stale encrypted view refused with `NOTES_EDIT_CONFLICT`; raw copy reopens identically. | Carry the conflict half; the raw-copy half is near-duplicate of the restart assertion. | Low |
| 6 | 91-102 | B3 (test side) | Four invalid revision maps each open a fresh fixture. | Carry as one table-driven case. | - |
| 7 | all | D8 | Minified one-line statements. | Write the merged file formatted. | - |

## Proposed end state
Deleted as a file. `test/integration/notes-store.test.mjs` holds the Notes-store integration cases from this file, `notes-store-lifecycle` and `notes-replay-identity`, sharing one `loadNotesSource()` and the `notesFixture` from `specs/quint/refinement/services/notes-store/fixture.mjs` (which stays because the live refinement uses it). Cases carried: identity under tied/backward clock, projection/validation failure leaves state unchanged, stale encrypted view conflict, invalid revision metadata fails closed. The schema 1/2 upgrade case is dropped. Owner question: this exercises upstream `plugin-notes` code; it may belong upstream (D14).
