# apps/app/src/prototype/scan-document.ts
- Lines: 131 | Role: Multi-page scan document dialog over the shared `createScanDocument` state machine (upstream plugin-native-camera): add/capture/replace/retake/correct/reorder/remove pages, device draft save/load/delete with compare-and-set, PDF and searchable-PDF export; also `pickNativeScanImage` (Android picker → Blob). | Verdict: SIMPLIFY; MOVE to `views/camera/scan/`
- Importers: `scan-review.ts:2` (`openScanDocument`), `camera-adapter.ts` (`openScanDocument`, `pickNativeScanImage`). Bundled by `test/scan-document-drafts.test.mjs:14`, `specs/quint/refinement/services/scan.mjs:20,29`, `specs/quint/services/scan-source-conformance.mjs:8`.
- Text/path pins: `specs/quint/services/manifest.json:905,4595,4630-4634` (symbols `systemPickerActive`, `duringSystemPicker`); `scripts/prepare-client-features.ts` and `test/client-feature-preparation.test.mjs` (the `.eliza/client-features/plugins/plugin-native-camera/src/scan-document.ts` import path); `test/support/feature-parity.mjs:411`; browser specs `scan-document`, `scan-draft`, `scan-text-draft`, `scan-searchable`, `scan-page-camera`, `scan-correction`, `scan-edges`, `media-polish`, `scan-review-keyboard`; tests assert copy `Saved draft` group, `Keep draft?`, `already exists`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-131 | D8 / D9 | One 97-line closure, many statements per line (63, 92-94, 110). | Format; split into `buildPageList`, `buildDraftControls`, `buildCloseFlow`. | None. |
| 2 | 106 | D10 | Back handler decides by aria-label text: `document.querySelector('dialog[aria-label="Capture document page"],dialog[aria-label="Correct document page"],dialog[aria-label="Review searchable PDF"],dialog.alpha-operation-review[open]')`; `scan-review.ts:45` does the same with `"Review scan document"`. Renaming user-visible labels silently breaks Back. | Mark nested scan dialogs with a `data-scan-child` attribute (set by the shared scan dialog shell) and query that. | Low; `scan-review-keyboard.spec.ts` covers Back. |
| 3 | 35-38, 95, 116-125 | C4 | Hand-written dialog lifecycle (previous focus, header with close icon, `scan-dialog-content` region with `role=region aria-label='Review details'`, listeners for `alpha-back`/`pagehide`/`visibilitychange`, append to `.os`). | Use the shared `openScanDialog` (see scan-correction-review report). | Medium; Quint manifest lists `systemPickerActive` here — keep the visibility rule using it. |
| 4 | 38, 112-115, 94 | C3 | Local `button` helper, then 12 `setAttribute('aria-label',X);textContent=Y` pairs to give short visible text with long names. | `scanButton(short,action,{label:long,icon})`. | Low; accessible names must stay byte-identical (specs query by name). |
| 5 | 92 | C3 / D12 | Amber "Draft" dot built inline: `style.cssText='display:inline-block;width:8px;height:8px;border-radius:4px;background:#f5a524;margin-right:6px;vertical-align:middle'` — same in `scan-event-review.ts:7,13`; CSS twin `phone.css:33-35` `.settings-dot[data-dot="warn"]` uses `var(--alpha-status-warn)`. Hex escapes the palette test. | Use a shared `.alpha-status-dot[data-dot=warn]` class. | Low (colour token instead of #f5a524 — confirm same value). |
| 6 | 31 | B1 | `void DailyApps.forgetSelected(…).catch(()=>{})` — grant release failure ignored. | Keep (release is best-effort, specified) but add a comment; same pattern in `scan-pdf.ts:40`, `selection-adapter.ts`. | None. |
| 7 | 51, 67, 72, 83, 85, 110 | C3 | `error instanceof Error?error.message:fallback` (3× + `failed()` wrapper); export failure mapping at 110 re-implements `scanPdfFailure` from `scan-pdf.ts` (`ScanPdfExportError`→'Export unconfirmed'). | Use `scanPdfFailure(error).message` at 110 and a shared `errorText`. | Low; check `scan-review-pdf-errors.test.mjs`. |
| 8 | 18 | — | `const IMAGE_TYPES:readonly string[]=SCAN_IMAGE_TYPES;` widening alias for `.includes(string)`. | Keep (type-only reason) or inline `(SCAN_IMAGE_TYPES as readonly string[])`. | None. |
| 9 | 13 | D13 | Deep relative import `../../../../.eliza/client-features/plugins/plugin-native-camera/src/scan-document.ts`. | `@eliza/…` alias when D13 lands; update `prepare-client-features` pin. | Low. |
| 10 | 129 | B1 | `catch{/* An unreadable draft stays reachable through Draft options. */}` — specified fallback with reason. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `button` | helper | 38 | 6 copies (see scan-correction-review) | shared scan dialog module |
| `url`/`release` (object-URL cache) | helper | 40-42 | per-dialog `URL.createObjectURL`/`revokeObjectURL` bookkeeping in `scan-searchable-review.ts:14,17`, `scan-review.ts:41`, `scan-correction-review.ts:10,15` | `objectUrls()` helper in shared scan module |
| `failed` | helper | 67 | `errorText` pattern | shared |
| amber dot | const (inline style) | 92 | `scan-event-review.ts:7,13`, `phone.css:33` | `.alpha-status-dot` |
| `pickNativeScanImage` | helper | 22-32 | `camera-adapter.ts` photo import path | here |

## Proposed end state
~115 lines formatted into small builders on the shared scan dialog shell: page list, draft controls/notice, close-with-keep prompt, export buttons. Nested-dialog detection by data attribute, not label text. No change to draft compare-and-set, autosave or export semantics.

## Verification
`node --test test/scan-document-drafts.test.mjs test/scan-document-draft-ownership.test.mjs test/camera-scan-keep.test.mjs test/client-feature-preparation.test.mjs`; `npm run test:browser -- scan-document scan-draft scan-text-draft scan-searchable scan-page-camera scan-correction scan-review-keyboard media-polish`; Quint `specs/quint/refinement/services/scan.mjs` and `scan-source-conformance.mjs`.
