# test/quint-note-source-dialog.test.mjs
- Lines: 19 | Kind: Quint replay wrapper (`replayNoteSourceDialog`, JSDOM) + two source-rewrite canaries | Verdict: DELETE (with the model and driver)
- Covers: the "Previous notes" source review (`prototype/note-source-adapter.ts`) follows NoteSourceDialog (307 traces). Duplicates: none. Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-19 | A1, D1 | delete-candidates C1 deletes `note-source-adapter.ts` with the legacy Previous-notes engine. | Delete this file, `specs/quint/refinement/application/note-source-dialog.mjs`, `NoteSourceDialog.qnt` and its manifest row in the same change as C1. | None |
| 2 | 12-19 | T5, T10 | Two canaries rewrite minified source text. | Gone. | None |

## Proposed end state
Deleted with C1.
