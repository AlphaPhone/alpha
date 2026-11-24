# specs/quint/application/SelectedDocumentViewer.qnt
- Lines: 63 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP
- Covers: Sandboxed preview of a selected document: each opening closes exactly once (controls, Back oldest-first, hide, device change) and removes its listeners. Duplicates: none. Callers/importers: `selected-document-viewer.mjs` (`checkSelectedDocumentViewer`) <- `test/quint-selected-document-viewer.test.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Import-based (`loadBundled('apps/app/src/browser/selected-document-viewer.ts')`) with DOM; counts real listeners. | None. | - |
| 2 | manifest | - | A103 lists `selected-document-viewer.css` for merging; no effect on the model. | None. | - |

## Proposed end state
- Keep unchanged.
