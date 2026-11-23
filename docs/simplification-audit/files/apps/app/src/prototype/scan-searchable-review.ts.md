# apps/app/src/prototype/scan-searchable-review.ts
- Lines: 30 | Role: Review dialog for a searchable PDF: OCR each page (or reuse saved text layers), let the owner edit each recognised line, then Keep text (returns layers) or export the PDF with the text layer. | Verdict: SIMPLIFY
- Importers: 1 — `scan-document.ts:5` (`reviewSearchableScan`). Bundled by `test/scan-review-pdf-errors.test.mjs:59`.
- Text/path pins: `specs/quint/refinement/services/scan-review-dialogs.mjs:13,36` inserts an inspector before the literal `'  void(async()=>{for'` (keep it); `specs/quint/services/manifest.json:908,4596,4638-4742` symbols `systemPickerActive, reviewSearchableScan, requested, busy`; `specs/quint/refinement/services/scan.mjs`, `scan-source-conformance.mjs`; `scan-document.ts:106` finds it by aria-label `"Review searchable PDF"`; `test/browser/scan-searchable.spec.ts`, `scan-review-keyboard.spec.ts`; `test/support/feature-parity.mjs:418`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19 | C5 | Export error handling re-implements `scanPdfFailure` (`ScanPdfExportError` → 'Export unconfirmed', else message/'PDF failed', retry unlocked) and duplicates the "re-enable controls" block twice in the same line (`busy=false;requested=false;keep.disabled=false;download.disabled=false;fields.forEach(f=>f.disabled=false)`). | `const unlock=()=>{…}` + `scanPdfFailure(error)`. Keep `requested`/`busy` names (manifest). | Low; `scan-review-pdf-errors.test.mjs`. |
| 2 | 12-21 | C4 | Hand-written dialog lifecycle, header with icon close, content region `aria-label='Review details'`, `.os` append. | Shared `openScanDialog`; keep `systemPickerActive` visibility rule here. | Medium (pins). |
| 3 | 15, 21 | C3 | Local `button` + `setAttribute('aria-label',…);textContent=…` pairs. | Shared `scanButton`. | Low. |
| 4 | 13 | C3 / D12 | "On device" chip inline style, identical to `scan-review.ts:23`. | Shared chip builder/CSS. | None. |
| 5 | 9 | C1 | Local `ReviewResult` type duplicates the `{status,message}` export result shape used in `scan-pdf.ts:39` and `scan-document.ts`. | Export `ScanExportResult` from `scan-pdf.ts`; `ReviewResult = ScanExportResult & {textLayers?}`. | None. |
| 6 | 20 | — | `copyScanTextLayers(layers,images.length) as ScanTextLine[][]` — cast because the helper returns `(…|null)[]`. | Type the helper's non-null overload in `browser/scan-draft.ts`. | None. |
| 7 | 7 | D4 | Type import goes through the 1-line shim `./scan-text-layer`. | Import from plugin-files directly (see scan-text-layer report). | None. |
| 8 | 21-28 | D8 | Lines 19-21 are ~1,000-char statement chains. | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ReviewResult` | type | 9 | `{status;message}` in `scan-pdf.ts:39` | `scan-pdf.ts` `ScanExportResult` |
| `button` | helper | 15 | 6 copies | shared `scanButton` |
| `finish` lifecycle | helper | 17 | all scan dialogs | `openScanDialog` |

## Proposed end state
~27 formatted logical lines: shared dialog shell, shared failure mapping, one `unlock()`; Quint anchor `  void(async()=>{for` kept.

## Verification
`node --test test/scan-review-pdf-errors.test.mjs`; `npm run test:browser -- scan-searchable scan-review-keyboard`; Quint `scan-review-dialogs` and services scan replays.
