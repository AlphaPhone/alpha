# specs/quint/application/NotesTrashSession.qnt
- Lines: 113 | Kind: Quint model (live in manifest; no harness, symbol pins only) | Verdict: DELETE
- Covers: Legacy Notes Trash surface: single-flight maintenance, one destructive action at a time, full-Trash refusal leading to permanent delete. Duplicates: none. Callers/importers: manifest row (sources incl. deleted `prototype/notes-trash-adapter.ts`, runtime/notes-trash.ts, notes-trash-policy.ts; 12 symbol pins on the adapter); application README. grep finds no harness or test

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | A1 | `notes-trash-adapter.ts` is legacy-only (C1/A99, D1) and already deleted. | Delete model and row. | L |
| 2 | manifest | P6/T10 | quint-lib.ts:233 `readFileSync`s every manifest `sources` entry; this file is already deleted in the worktree, so every Quint command (`quint:check`, `quint:changed`, refinement) throws before any model runs until this row is removed; also its 12 `symbols` entries point into the deleted file. | Remove now. | H |
| 3 | 1-113 | B5 | No harness ever tied it to code; only symbol-name regex pins. | None. | L |
| 4 | runtime | A7 | Remaining legacy Trash users after deletion: `voice-adapter.ts:21,942-948` (`readNotesTrash`, `editNotesTrash`) and template `notes.trashConfirmOpen` (template.html:2660), `subview-accessibility.ts:51`. They belong to C1 cleanup. | Flag to the C1 implementer. | M |

## Proposed end state
Deleted. The 15-minute Android backstop worker (`AlphaNoteAudioPlugin$NotesTrashBackstopWorker`, G5 persisted name) is native and modeled elsewhere if at all.
