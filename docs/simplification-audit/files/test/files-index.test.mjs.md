# test/files-index.test.mjs
- Lines: 50 | Kind: transplant (type-strips `apps/app/src/prototype/files-index.ts` and imports it as a `data:` module) | Verdict: DELETE
- Covers: the Recent files index (newest first, eviction returns released grants, tree-row replacement, revocation, stored-row validation) plus sort and search helpers. Duplicates: Quint `specs/quint/refinement/application/files-recent-index.mjs` (FilesRecentIndex model, same record/evict/revoke behaviour); `test/scan-document-drafts.test.mjs`, `test/selection-ask-readiness.test.mjs` also load the module. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T2 | `stripTypeScriptTypes(readFileSync(...))` into a `data:` URL instead of importing the module; breaks on any import added to `files-index.ts`. | Delete. | Low |
| 2 | 5-11, 44-50 | A7 | `compareFilesEntries`, `sortLabel`, `matchesFileQuery` are dead exports (delete-candidates B197: `files-index.ts` 73-110 helpers). The test is their only caller. | Delete with the helpers. | Low |
| 3 | 22-37 | A7 | The `'tree'` kind (`treeId`, `revokeTree`) is also listed for deletion in B197. | Delete with it. | Low |
| 4 | 12-21, 38-43 | T4 | Record/evict and stored-row validation are what the FilesRecentIndex Quint refinement replays. | Rely on the model; port its harness to import the module (it currently loads the same source). | Low |

## Proposed end state
File deleted together with the dead `files-index.ts` helpers and the `'tree'` kind. The live record/evict/revoke
behaviour stays covered by the FilesRecentIndex Quint refinement (ported to a real import) and by the scan and
selection journeys that create Recent rows.
