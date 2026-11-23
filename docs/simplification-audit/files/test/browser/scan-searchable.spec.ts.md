# test/browser/scan-searchable.spec.ts
- Lines: 32 | Kind: Playwright journey (`chromium`) on real local Tesseract OCR and pdfjs text extraction; entry by importing `scan-document.ts` (T6); 2 tests call `createScanPdf` directly; 7 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan section, the one real-OCR test); **DELETE** the unit tests
- Covers: a searchable PDF exports only the reviewed lines (no network). Invisible text keeps rendered pixels and stays on its page. Invalid positions and non-English text are rejected. Back cancels recognition and terminates the worker. Closing after export dispatch records an uncertain outcome and blocks another export. Reordered pages keep their own reviewed text. Unsupported text can be corrected without dispatching. Duplicates: `scan-text-draft.spec.ts` (reorder plus text layers), host test `test/scan-review-pdf-errors.test.mjs` (bundles `scan-searchable-review.ts` with stubs: a T2 transplant, delete in its chunk). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | T5 / T6 | "Invisible text preserves pixels" imports pdfjs from `/@fs/node_modules` into the page and renders two PDFs made by `createScanPdf`. "Invalid positions" calls `createScanPdf` directly. Both are unit tests of upstream `plugin-files` scan-pdf. | Delete. Upstream follow-up. Test 7 still covers the UI rejection of non-English text. | Medium: the pixel identity has no other test until upstream adds one. |
| 2 | 7-9, 27-32 | P1 / T8 | Tests 1, 6 and 7 each run real OCR (60 s waits, 90 s timeouts). That costs about 30-60 s of wall time. | Merge them into one real-OCR test: two pages, reorder, edit one line, clear one line, enter `漢字` (rejected, no download), correct it, download, then extract the text. Use `stubOcr` everywhere else. | Low |
| 3 | 16-22 | – | Back cancels recognition. The worker is stubbed by route, and `Worker` is subclassed to count `terminate()`. | Keep as a step. The worker subclass counts a browser primitive, which is acceptable. | none |
| 4 | 23-25 | T6 | It patches `BrowserNoteDocuments.prototype.exportPdf` to hold the export. | Use the documents plugin fake's `hold` mode. | Low |
| 5 | 8 | – | `remote` request collection asserts no network during OCR. This is a good privacy check. | Keep. | none |

## Proposed end state
In the Scan section, one real-OCR "searchable PDF" test covers recognize, reorder, edit, reject unsupported text and
download. It extracts the text and asserts that no network request was made. It is the only real Tesseract run in the
suite besides `local-ocr`. Two stubbed steps cover Back cancelling recognition and the uncertain export outcome.
