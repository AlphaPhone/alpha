# apps/app/src/runtime/browser-note-documents.ts
- Lines: 11 | Role: `BrowserNoteDocuments` WebPlugin — browser implementation of the `AlphaNoteDocuments` port (import text, export PDF/text) over upstream `createBrowserNoteDocuments` | Verdict: MOVE to `apps/app/src/browser/note-documents.ts`
- Importers: dynamic `import('../runtime/browser-note-documents')` in prototype/notes-document-adapter.ts:6 and prototype/scan-pdf.ts:7 (web fallback of a Capacitor plugin). Text/path pins: quint `files-recent-index.mjs`, `notes-document-transfer.mjs`, `scan-review-dialogs.mjs`, `system-picker-visibility.mjs`; `test/browser/scan-document.spec.ts`, `scan-searchable.spec.ts`; `test/scan-document-drafts.test.mjs`, `test/scan-review-pdf-errors.test.mjs`; feature-parity inventory. No manifest pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | Name differs by one letter from `browser-notes-document.ts` in the same folder; it is a browser web-plugin and belongs with the other web implementations in `browser/`. | Move/rename to `browser/note-documents.ts`; update the two dynamic imports and the quint/test paths. | Low. |
| 2 | 8-10 | D4 | Three pass-through methods to `this.port`. | Keep (WebPlugin subclass is required by `registerPlugin` web factory); acceptable. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `'Alpha scan'` PDF fallback name | const | 7 | none | keep |

## Proposed end state
Same 11 lines at `browser/note-documents.ts`.

## Verification
`test/browser/scan-document.spec.ts`, `scan-searchable.spec.ts`, quint notes-document-transfer / scan-review refinements (update paths).
