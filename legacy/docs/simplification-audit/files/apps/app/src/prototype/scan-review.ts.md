# apps/app/src/prototype/scan-review.ts
- Lines: 63 | Role: Single-image scan text review: local OCR into an editable field, Copy, Save to Notes (one attempt), photo PDF export, optional Keep photo, links and event-draft disclosures, and a "Multi-page" hand-off to `openScanDocument`. | Verdict: SIMPLIFY
- Importers: `camera-adapter.ts` (`openScanReview`, `ScanKeepError`, `type ScanSource`). In-page import by `test/fixtures/camera-calendar-review.mjs:14`.
- Text/path pins: `specs/quint/refinement/services/scan-review-dialogs.mjs:13,34-35` inserts code before the literal `'  return dispose;'` and mutates `'if(attempted||!field.value.trim())return;'` — keep both strings exactly; `specs/quint/services/manifest.json:4594,4622-4730` symbols `systemPickerActive, visibilitychange, openScanReview, ScanKeepError, pdfAttempted, attempted, keeping, closeDocument`; `specs/quint/application/manifest.json:3340`; `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs:13`; `specs/quint/refinement/legacy/camera-session.mjs:14`; `scan-source-conformance.mjs` (`ScanSource`); browser specs `scan-keep`, `scan-text-draft`, `scan-review-keyboard`, `scan-pdf`; `test/support/feature-parity.mjs:417`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42, 56 | A7 | `pdfDisclosure` paragraph is created `hidden=true`, appended to content and never shown or filled (grep `pdfDisclosure`: only these two lines). | Delete. | None. |
| 2 | 11-13 | A8 | Two stacked JSDoc comments; the first ("A scan is draft text until … Notes commit.") documents nothing (it is followed by another comment and a type). | Move it onto `openScanReview` or delete. | None. |
| 3 | 30 | D11 | `{const document=button('Multi-page');…}` shadows the global `document` inside the block. | Rename to `multiPage`. | None. |
| 4 | 45 | D10 | Back is ignored while `document.querySelector('dialog[aria-label="Review scan document"]')` exists — behaviour keyed on visible label text. | Ask the shared scan dialog shell whether a child scan dialog is open (`data-scan-child`), see scan-document report. | Low. |
| 5 | 19-27, 44-48, 56-58 | C4 | Hand-written dialog lifecycle (previous focus, listeners, `.os` append, `showModal`, content region with `aria-label='Review details'`). | Shared `openScanDialog`; keep `systemPickerActive` and `visibilitychange` in this file (manifest) and the literal `  return dispose;`. | Medium (pins). |
| 6 | 23 | C3 / D12 | "On device" chip built with inline style; identical chip in `scan-searchable-review.ts:13`. | `.scan-on-device` class + one `onDeviceChip()` builder. | None. |
| 7 | 31-36 | D8 | Keep-photo flow is one dense statement chain across 6 lines. | Extract `keepPhoto()` function; keep `keeping` name (manifest). | None. |
| 8 | 18 | D9 | Six positional parameters (`image, save, reviewEvent?, source='captured', keep?, pageCamera?`); callers pass `undefined` placeholders. | Options object `{image, save, reviewEvent, source, keep, pageCamera}`; update `camera-adapter.ts` call sites and `test/fixtures/camera-calendar-review.mjs`. | Low. |
| 9 | 37, 41 | D12 | Inline preview style with `var(--s2,#eee)` hex fallback. | CSS class. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ScanSource` | type | 14 | `scan-source-conformance.mjs` | here |
| `ScanKeepError` | class | 17 | thrown by `camera-adapter.ts` | here |
| `button` (appends to actions) | helper | 27 | 6 other `button` helpers | shared `scanButton` |
| On-device chip | const (inline) | 23 | `scan-searchable-review.ts:13` | shared builder + CSS |

## Proposed end state
~58 lines on the shared scan dialog shell with an options-object signature; no dead `pdfDisclosure`; chip and preview styled by CSS; keep-photo extracted. Quint mutation anchors (`  return dispose;`, `if(attempted||!field.value.trim())return;`) preserved.

## Verification
`npm run test:browser -- scan-keep scan-text-draft scan-review-keyboard scan-pdf scan-links scan-event`; `node --test test/camera-scan-keep.test.mjs test/camera-preview-recovery.test.mjs`; Quint `scan-review-dialogs` and `canonical-calendar-draft-handoff` replays.
