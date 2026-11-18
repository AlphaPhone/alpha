# test/note-source-references.test.mjs
- Lines: 42 | Kind: source-text (regex over `NoteSourceReferences.java`, `SelectedDocumentAccess.java`, `AlphaMailAttachmentsPlugin.java`, `prototype/notes-trash-adapter.ts`, `prototype/note-source-adapter.ts`) | Verdict: DELETE
- Covers: a note's linked document keeps its Android read grant while referenced, uses the shared reference store and installed preference names, and references are reconciled after Trash maintenance. Duplicates: device restart campaign `source-reference` kind (`native-restart-runner.test.mjs`, `SelectedDocumentInstrumentedTest`); shared rules tested upstream. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-41 | T1 | The file says so itself ("These are source checks ... Not Android evidence"). | Delete. | Low |
| 2 | 14-15, 22 | - | Pins persisted preference names (G5). | Persisted names are protected by review and the device campaign; no text pin. | Low |

## Proposed end state
File deleted.
