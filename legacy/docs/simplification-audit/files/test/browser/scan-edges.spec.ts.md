# test/browser/scan-edges.spec.ts
- Lines: 8 (one test per line) | Kind: Playwright spec (`chromium`); entry by importing `scan-document.ts` (T6); 2 tests call upstream `detectScanEdges` directly; 8 tests | Verdict: **MERGE** UI cases into `journeys/camera-photos.spec.ts` (Scan section); **DELETE** algorithm unit cases
- Covers: automatic page-edge detection. It finds quadrilateral corners within 2.5 % on light and dark pages without changing image bytes, declines blank, circle and two-page images (manual corners stay available), requires preview and adoption of suggested edges (cancel keeps the original bytes), releases the decoded bitmap when closed during detection, and saves a corrected image of the expected size. Detection yields to cancellation. `detectScanEdges` is upstream (`plugin-files/src/documents/scan-edges.ts`; the local file is a one-line re-export), and upstream has no test for it. Duplicates: `scan-correction.spec.ts` (preview/adopt/cancel). Callers/importers: none. It imports `scan-review-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T5 / T6 | The corner-accuracy test calls `detectScanEdges` in the page. | Delete. Upstream follow-up. The UI "Edges found" case with corner values > 20 % remains. | Medium: the accuracy has no other test until upstream adds one. |
| 2 | 8 | T6 | The second half of the last test patches `window.setTimeout` to abort detection. | Delete that half. Keep "applied detection saves an image of about 530×440". | Low |
| 3 | 7 | T6 / B5 | "Closing during detection releases the decoded bitmap" patches `createImageBitmap.close`. | Delete. Keep "cancel during detection returns to the document" as one assertion in the edge step. | none |
| 4 | 5-6 | – | Declined images leave manual corners, and suggested edges need preview and adoption, with original bytes retained on cancel. | Carry. Reduce declines to one parametrised step over `blank` and `two`. | none |
| 5 | whole | D8 | One test per minified line, and setup is a 400-character line. | Format. | none |

## Proposed end state
One "detect edges" test in the Scan section: decline on a blank page, detect on a document page, preview and adopt, save
and check the size. Then cancel on a second detection, which keeps the bytes. Algorithm accuracy and cancellation belong
upstream.
