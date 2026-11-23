# apps/app/src/browser/selected-document-viewer.ts
- Lines: 16 | Role: sandboxed iframe viewer dialog for a selected file | Verdict: SIMPLIFY
- Importers: 1 (files.ts, passed to upstream createBrowserFiles). Text/path pins: specs/quint/application/manifest.json; refinement selected-document-viewer.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C3 (P4) | Theme copy loop (twin of mail-attachments.ts:45). | Dialog kit. | None. |
| 2 | 12-15 | C4 | Lifecycle listeners + body mount. | openOwnedDialog. | Medium (Quint model). |
| 3 | 4-16 | C5 | Same viewer as BrowserMailAttachments.openReviewed (title, sandboxed iframe, Done). | Share one `openViewerDialog({name,url,footer})`. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
~8 lines delegating to a shared viewer dialog. Estimated lines after: 8 (current 16).

## Verification
selected-document-accessibility.spec.ts, files-dialog-large-text.spec.ts, selected-document-viewer Quint harness.
