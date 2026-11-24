# test/browser/scan-document.spec.ts
- Lines: 38 | Kind: Playwright spec (`chromium`); opens the document builder by importing `scan-document.ts`/`scan-review.ts` (T6), monkeypatches `BrowserNoteDocuments.prototype.exportPdf` and `createImageBitmap`; 8 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan section)
- Covers: the multi-page scan document. Add, reorder, replace and remove pages, then download a PDF whose page order and orientation match (parsed with pdf-lib). An invalid added image keeps existing pages. A conversion failure is recoverable. A lost export response shows "Export unconfirmed" and blocks automatic retry. Closing releases previews, closing during conversion makes no export request, PDF page limits hold, and Back from the document returns to the scanned-text review. Duplicates: `scan-pdf.spec.ts` (PDF limits/geometry via `createScanPdf`), `scan-searchable.spec.ts` (reorder), `scan-draft.spec.ts` (download). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-7, 27-29 | T6 | The builder is opened by module import, not from Camera or a scan review. | Use the harness `scanImage` entry, and reach the document from scanned-text review → Multi-page (as 27-29 already does after its import). | Low |
| 2 | 24-26 | T5 / T6 | "PDF page limits" calls `createScanPdf` (upstream `plugin-files` scan-pdf) with 0 and 21 blobs. | Delete. Upstream follow-up. | Low |
| 3 | 31-38 | T6 | It patches `BrowserNoteDocuments.prototype.exportPdf`, a product class, to count or lose exports. | Answer through `harness/plugins/documents.ts` (`AlphaNoteDocuments.exportPdf`: ok / lost / held). Keep both cases (no export after close; lost response blocks retry). | Low |
| 4 | 15-17 | B5 / T6 | The revoke-count assertion on a patched `URL.revokeObjectURL` checks an internal. | Delete; keep "closing removes the file input and the dialog". | none |
| 5 | 8-14 | – | Add, reorder, replace and remove, then PDF order/orientation through pdf-lib. This is a strong end-to-end check. | Carry as the core document step. | none |

## Proposed end state
A "multi-page document" test in the Scan section. It covers add, reorder, replace and remove, an invalid image that keeps
the pages, a decode failure that recovers, and a download that is parsed. A second test covers the export outcomes
through the documents plugin fake (lost response gives Export unconfirmed and a disabled button; close during
conversion gives no export). Back to the text review is a step in the review test.
