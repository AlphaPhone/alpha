# test/quint-notes-document-transfer.test.mjs
- Lines: 18 | Kind: Quint replay wrapper (`replayNotesDocumentTransfer`, `specs/quint/refinement/application/notes-document-transfer.mjs`) + two source-rewrite canaries | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: Notes import and export (`prototype/notes-document-adapter.ts`) follow NotesDocumentTransfer (300 traces): receipts only in the current visit, one operation at a time. Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | — | A3, D3 | Import is test-mocks only (`notes-document-adapter.ts:22`), and C9/B215 deletes it. The model's `choose` covers both import and export. | Shrink the model and driver to export only with C9. | High (fails when C9 lands) |
| 3 | 11-18 | T5, T10 | Two canaries rewrite minified text (`if(token===epoch&&api.isActive())…`, `if(busy){api.toast('Busy');return;}`). | Delete. | Medium |

## Proposed end state
Deleted; an export-only NotesDocumentTransfer registered in the application index.
