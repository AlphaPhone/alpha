# test/quint-note-web-source-dialog.test.mjs
- Lines: 18 | Kind: Quint replay wrapper (`replayNoteWebSourceDialog`, JSDOM) + two source-rewrite canaries | Verdict: DELETE (with the model and driver)
- Covers: the web source review for legacy notes (`prototype/note-web-source-adapter.ts`) follows NoteWebSourceDialog (306 traces). Duplicates: none. Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-18 | A1, D1 | C1 deletes `note-web-source-adapter.ts`. | Delete with the driver, `NoteWebSourceDialog.qnt` and its manifest row. | None |

## Proposed end state
Deleted with C1.
