# test/browser/scan-pdf.spec.ts
- Lines: 45 | Kind: Playwright spec (`chromium`); entry by importing `scan-review.ts` (T6); 2 tests call `createScanPdf` directly; 5 tests | Verdict: **MERGE** the UI tests into `journeys/camera-photos.spec.ts` (Scan section); **DELETE** the `createScanPdf` unit tests
- Covers: "Download photo PDF" from the scanned-text review gives a real A4 landscape PDF with one image XObject and no OCR text. The status says the download was requested and the button disables. Conversion respects cancellation and rejects non-images. Scan actions stay visible in dark 360×740 and light 1440×500. A portrait image gives a portrait page with no fonts. Duplicates: `scan-document.spec.ts` checks PDF orientation per page through the UI (`[true,false]`), which covers the portrait case. Callers/importers: none. It imports `helpers/ocr-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-25, 41-45 | T5 / T6 / T4 | Cancellation/invalid input and portrait geometry call upstream `createScanPdf` (the local `prototype/scan-pdf.ts` wraps upstream `plugin-files` scan-pdf). Portrait geometry is covered through the UI by `scan-document`. | Delete. Upstream follow-up for the cancellation and invalid-input rules. | Low |
| 2 | 6-17 | – | Download, parse with pdf-lib, check the single XObject and no text. A strong end-to-end check. | Carry (with the harness scan entry). | none |
| 3 | 27-39 | T7 | The two layout tests differ only by theme and size. | One parametrised layout step (or fold into the large-text step from `scan-review-keyboard`). | none |
| 4 | 16, 36 | B5 | Screenshots with no consumer. | Delete. | none |

## Proposed end state
A "photo PDF" step in the Scan section: download, parse, landscape A4, one image, no text, then the button disabled. One
layout step checks that the actions stay inside the dialog at a compact size. The PDF library rules belong upstream.
