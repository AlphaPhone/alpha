# scripts/browser-pdf-assets.ts
- Lines: 15 | Kind: Vite plugin (serve/emit pdf.js cmaps, fonts, wasm, licence) | Verdict: KEEP + MOVE to `vite-plugins/`
- Covers: PDF viewing works offline in web and APK builds because pdf.js assets ship locally under `pdfjs-assets/`. Duplicates: same serve-or-emit shape as `scripts/local-ocr-assets.ts` (C5, could share a `staticAssetsPlugin(map)` helper). Callers/importers: `vite.config.ts`; `scripts/ci/export-browser-proof.ts` (mention). No test; behaviour is exercised by any Files/PDF Playwright journey that opens a PDF.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | D8 | Middleware is one minified line. | Format (D9 Prettier pass). | None. |
| 2 | whole | C5 | Same pattern as `local-ocr-assets.ts`. | One `staticAssetsPlugin(name, Map<url,file>)` in `vite-plugins/`, two call sites. | Low. |
| 3 | whole | D11 | Vite plugin in `scripts/`. | Move to `vite-plugins/`. | None. |

## Proposed end state
A 10-line call of a shared static-assets plugin in `vite-plugins/`. Ensure the `journeys/files.spec.ts` journey opens
a PDF with a CMap font so the asset path stays covered.
