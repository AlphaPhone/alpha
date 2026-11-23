# specs/quint/application/PreviousNotesAvailability.qnt
- Lines: 75 | Kind: Quint model (live; vm-slicing harness) | Verdict: DELETE
- Covers: Read-only "Previous notes" presence probe per owner and visible visit; legacy retirement clears before canonical. Duplicates: none. Callers/importers: manifest row (agent-adapter.ts, deleted prototype/legacy-notes-access.ts); harness specs/quint/refinement/application/previous-notes-availability.mjs (slices agent-adapter.ts with indexOf anchors, strips types, vm) via test/quint-previous-notes-availability.test.mjs; index.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A1 | "Previous notes" is C1 (D1 delete); listed explicitly in delete-candidates C1 "Quint" bullet. | Delete model, row, harness, wrapper, index.mjs entry. | L |
| 2 | manifest | P6 | quint-lib.ts:233 `readFileSync`s every manifest `sources` entry; this file is already deleted in the worktree, so every Quint command (`quint:check`, `quint:changed`, refinement) throws before any model runs until this row is removed (`legacy-notes-access.ts`). | Remove now. | H |
| 3 | harness:9-15 | T2 | Text-sliced transplant of agent-adapter.ts. | Gone with it. | L |

## Proposed end state
Deleted.
