# specs/quint/application/NotesDocumentTransfer.qnt
- Lines: 86 | Kind: Quint model (live; ITF trace-replay harness) | Verdict: KEEP (trim import half)
- Covers: Notes import/export through the system document picker: single operation, late results dropped after leaving Notes, receipts shown only in their own visit and only when visible. Duplicates: none. Callers/importers: manifest row (source `apps/app/src/prototype/notes-document-adapter.ts`, symbols incl. `importText`, `testMocksEnabled`); harness specs/quint/refinement/application/notes-document-transfer.mjs (loadProductModule with stubs for build-flags/platform-plugins; import-based); wrapper test/quint-notes-document-transfer.test.mjs; application README

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-50 | A1/D3 | Import is a test-mocks-only surface (`notes-document-adapter.ts:22-28`, `if(!testMocksEnabled)return`); delete-candidates B215/C9 deletes it under D3 (no import/export workflow). `choose("import")`, `reads`, `imported`, `ImportNeedsCompletedRead`, `ImportedWitness`, `resultAfterLeavingNotesIsDroppedTest`, `unsavedImportShowsNoReceiptTest` model only that path. | Drop `kind` (export only), `reads`, `imported`, the import invariant/witness and the two import runs; rewrite `resultAfterLeavingNotesIsDroppedTest` for export (receipt dropped). Remove `importText`/`testMocksEnabled` symbol pins and the `../build-flags` stub in the harness. | M: export (Share > Export text) is production-reachable; keep it modeled |
| 2 | manifest | T10 | Symbol pins (`whenVisible`, `perform`, `receipt`, …) are closure-local names matched by regex in quint-lib; renaming a local breaks Quint. | Pin the file only (cross-file T10 action). | L |
| 3 | harness | - | Harness already bundles the real module; no port needed. | Keep. | L |

## Proposed end state
Model describes export only: one operation at a time, late result dropped after leaving Notes, receipt shown when visible in its own visit.
Harness keeps loadProductModule replay; drop import stubs/required actions.
If cross-file-actions merges notes-document-adapter into a Notes owner module, update the manifest source path in the same commit.
