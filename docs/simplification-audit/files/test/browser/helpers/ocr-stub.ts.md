# test/browser/helpers/ocr-stub.ts
- Lines: 16 | Kind: Playwright route fixture (replaces the Tesseract worker script) | Verdict: **KEEP** (move to `harness/plugins/ocr.ts`)
- Covers: answers OCR worker jobs instantly with fixed text so scan-review specs do not depend on recognition. Duplicates: none. Callers/importers: `local-ocr.spec.ts`, `scan-keep.spec.ts`, `scan-pdf.spec.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-15 | — | Fault/answer injection at a real boundary (`page.route` on the worker URL). Good. | Move unchanged. Note `local-ocr.spec.ts` uses it while claiming to test real recognition elsewhere; check that spec keeps one unstubbed case. | none |

## Proposed end state
`harness/plugins/ocr.ts` exporting `stubOcr(page, text)`; used by `journeys/files.spec.ts` (scan steps).
