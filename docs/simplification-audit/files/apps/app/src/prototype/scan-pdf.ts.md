# apps/app/src/prototype/scan-pdf.ts
- Lines: 42 | Role: Scan PDF export: builds the PDF with the shared plugin-files encoder, sends it to the `AlphaNoteDocuments.exportPdf` bridge (web fallback `BrowserNoteDocuments`), records confirmed exports in Files Recent, maps failures to retry/no-retry, and counts open system pickers (`duringSystemPicker` / `systemPickerActive`). | Verdict: SIMPLIFY (small); split the picker counter out
- Importers: `scan-document.ts:10`, `scan-review.ts:6`, `scan-searchable-review.ts:5`, `camera-adapter.ts` (`systemPickerActive`), `files-index.ts` (comment). Loaded as a product module by `specs/quint/refinement/application/files-recent-index.mjs:26` and `specs/quint/refinement/services/system-picker-visibility.mjs:11` with stubs keyed on the import strings `'../../../../.eliza/client-features/plugins/plugin-files/src/documents/scan-pdf.ts'`, `'../platform-plugins'`, `'../runtime/browser-note-documents'`, `'./files-index'`, `'../daily'`.
- Text/path pins: `test/scan-review-pdf-errors.test.mjs:4-8` transplants the file and string-replaces those four import specifiers (T2); `test/quint-files-recent-index.test.mjs:12,16` and `test/quint-system-picker-visibility.test.mjs:16` rewrite `prototype/scan-pdf.ts` text for mutants; `specs/quint/application/manifest.json:7313-7357` symbols `exportScanPdf, filesIndex, forgetSelected`; `specs/quint/services/manifest.json:907,4592-4610` symbols `systemPickerActive, duringSystemPicker, systemPickers`; `specs/quint/services/scan-source-conformance.mjs:29` re-states `scanPdfRetryable`'s status list; `specs/quint/application/FilesRecentIndex.qnt`; `test/support/feature-parity.mjs:416`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-27 | A8 / D11 | Comment "Resolved provider outcomes that wrote nothing confirmed: the user may retry. 'unverified', 'exported' and 'requested' keep retry locked." sits on `let systemPickers=0;` but documents `scanPdfRetryable` (line 33). | Move the comment to line 33. | None. |
| 2 | 27-32 | D11 | System-picker visibility counter (`systemPickers`, `systemPickerActive`, `duringSystemPicker`) has nothing to do with PDFs; used by `scan-document.ts`, `camera-adapter.ts`, `scan-review.ts`, `scan-searchable-review.ts`. | Move to `runtime/system-picker.ts`; update the Quint services manifest symbol paths and `system-picker-visibility.mjs` (it loads this module to reach the counter). | Medium (pins). |
| 3 | 13-15 | A7 / D7 | `export function createScanPdf` — no product importer outside this file; only Quint drivers and browser specs reach it. | Make it module-private (inline into `exportScanPdf`) once the specs drive `exportScanPdf`; until then keep. | Low. |
| 4 | 20-24 + callers | C5 | `scanPdfFailure` is used by `scan-review.ts` only; `scan-searchable-review.ts:19` and `scan-document.ts:110` re-implement the same mapping inline (`error instanceof ScanPdfExportError?'Export unconfirmed':error instanceof Error?error.message:'PDF failed'`). | Use `scanPdfFailure` in both. | Low; `scan-review-pdf-errors.test.mjs` covers it. |
| 5 | 6 | C2 | `registerPlugin<{exportPdf(input:{title:string;dataBase64:string}):Promise<{status:string;message:string}>}>('AlphaNoteDocuments',…)` typed at the call site; `notes-document-adapter.ts:5` registers the same plugin with another partial type (`importText`) and its own web fallback. | One typed `plugins/note-documents.ts` module (`exportPdf` + `importText`, one web fallback) imported by both. | None (registerPlugin is cached by name). |
| 6 | 38 | — | Chunked `String.fromCharCode(...bytes.subarray(i,i+16384))` + `btoa` for base64 — correct for large arrays. | Keep (comment "chunked to stay under argument limits"). | — |
| 7 | 40 | B1 | `DailyApps.forgetSelected(…).catch(()=>{})` — best-effort grant release (specified). | Comment. | None. |
| 8 | 1 | D13 | Deep relative import into `.eliza/client-features`. | Alias when D13 lands; the transplant test and Quint stubs key on this exact string — update together. | Medium (pins). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ScanPdfExportError` | class | 16 | — | here |
| `scanPdfFailure` | helper | 20-24 | inline copies `scan-searchable-review.ts:19`, `scan-document.ts:110` | here (use everywhere) |
| `scanPdfRetryable` | helper | 33 | restated in `specs/quint/services/scan-source-conformance.mjs:29` | here |
| `systemPickers` / `systemPickerActive` / `duringSystemPicker` | const/helpers | 27-32 | — | `runtime/system-picker.ts` |
| `scanExportTitle` | helper | 10-12 | — | here |

## Proposed end state
~32 lines: title, export, failure/retry mapping (with correct comments). Picker counter (~6 lines) lives in `runtime/system-picker.ts` and every caller imports it from there.

## Verification
`node --test test/scan-review-pdf-errors.test.mjs test/quint-files-recent-index.test.mjs test/quint-system-picker-visibility.test.mjs test/files-index.test.mjs test/camera-preview-recovery.test.mjs`; `npm run test:browser -- scan-pdf scan-document scan-searchable`; Quint application/services manifests.
