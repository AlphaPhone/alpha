# specs/quint/application/PreviousNotesSourceOpening.qnt
- Lines: 166 | Kind: Quint model (live; vm-slicing fixture) | Verdict: DELETE
- Covers: Explicit selection of the retained legacy notes source: retired opens never report success, owner-scoped, editable rows need a current store. Duplicates: none. Callers/importers: manifest row (agent-adapter.ts, deleted legacy-notes-access.ts); harness specs/quint/refinement/application/previous-notes-source-opening.mjs + test/fixtures/previous-notes-source-opening.mjs (slices agent-adapter.ts from `'  function canonicalNotesKey('` to `'  function context(shell: Shell)'`, strips types, vm) via test/previous-notes-source-opening.test.mjs; index.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A1 | Legacy "Previous notes" source switch (C1, D1); fixture is listed in C1 "Tests and specs". | Delete model, row, harness, fixture, wrapper, index.mjs entry. | L |
| 2 | manifest | P6 | quint-lib.ts:233 `readFileSync`s every manifest `sources` entry; this file is already deleted in the worktree, so every Quint command (`quint:check`, `quint:changed`, refinement) throws before any model runs until this row is removed. | Remove now. | H |
| 3 | fixture | T2 | Transplant; also imports `deferred`, `tick` from refinement support.mjs. | Gone. | L |

## Proposed end state
Deleted.
