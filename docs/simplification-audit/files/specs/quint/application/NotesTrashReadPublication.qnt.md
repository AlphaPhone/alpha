# specs/quint/application/NotesTrashReadPublication.qnt
- Lines: 65 | Kind: Quint model (live; vm-transplant harness) | Verdict: DELETE
- Covers: Publication of a legacy ("Previous notes") Trash read into the shell: only the latest read for the current legacy epoch publishes. Duplicates: none. Callers/importers: manifest row (sources incl. deleted `prototype/notes-trash-adapter.ts`, agent-adapter.ts, main.tsx); harness specs/quint/refinement/application/notes-trash-read-publication.mjs + test/fixtures/notes-trash-read.mjs (reads notes-trash-adapter.ts, transforms with esbuild, `runInNewContext` with port map); wrapper test/notes-trash-read.test.mjs

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | A1 | Header says "Previous Notes Trash"; `signal` only reads in `mode == "legacy"`. The adapter is in C1/A99 (D1) and already deleted. | Delete model, row, harness, fixture notes-trash-read.mjs, wrapper. | L |
| 2 | manifest | P6 | quint-lib.ts:233 `readFileSync`s every manifest `sources` entry; this file is already deleted in the worktree, so every Quint command (`quint:check`, `quint:changed`, refinement) throws before any model runs until this row is removed. | Remove row now. | H |
| 3 | fixture | T2 | test/fixtures/notes-trash-read.mjs is a source transplant (esbuild transform + vm with stubbed `../runtime/notes-trash`). | Delete with it; no other importer (grep: only the harness). | L |

## Proposed end state
Deleted. Canonical Notes has no Trash surface (`canonical-notes-ui.ts` sets `notesTrash:undefined`), so nothing replaces it.
