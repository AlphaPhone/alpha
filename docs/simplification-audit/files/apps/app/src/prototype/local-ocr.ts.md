# apps/app/src/prototype/local-ocr.ts
- Lines: 6 | Role: binds upstream `recognizeLocalText` (plugin-files) to Alpha's pinned OCR asset URLs (`/ocr/worker.min.js`, `/ocr/`, English). | Verdict: KEEP
- Importers: `apps/app/src/browser/content-question.ts:2`, `apps/app/src/prototype/scan-review.ts:8`, `apps/app/src/prototype/scan-searchable-review.ts:4`. Test: `test/browser/local-ocr.spec.ts:27,41` (dynamic import).
  Text/path pins: stubbed by module id `./local-ocr` / `../prototype/local-ocr` / `/local-ocr$/` in `specs/quint/refinement/application/hosted-digest-refresh.mjs:74`, `hosted-notice-question.mjs:28,33`, `services/reading.mjs:23`, `services/scan-review-dialogs.mjs:19`, `test/browser-session-persistence.test.mjs:260`, `test/scan-document-drafts.test.mjs:11`, `test/scan-review-pdf-errors.test.mjs:52`; `test/support/feature-parity.mjs:381`. The `/ocr/` paths are served/emitted by `scripts/local-ocr-assets.ts:13,23,29` (Vite plugin).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C6 | Asset paths `'/ocr/worker.min.js'`, `'/ocr/'` are also spelled in `scripts/local-ocr-assets.ts` (`'ocr/'+name`, `req.url.startsWith('/ocr/')`). | Optional: export `OCR_BASE='/ocr/'` from one place both read. Low value; leave unless touching. | None |
| 2 | 1-2 | D13 | Two deep relative imports of the same upstream file. | Merge into one import (`import {recognizeLocalText as recognize, type OcrProgress} from …`); alias later. | None |
| 3 | — | D11 | Configuration binding for an upstream document module living in `prototype/`; content-question in `browser/` imports it via `../prototype/`. | Move to `runtime/local-ocr.ts` during the folder split; update the stub module ids listed above. | Low |

## Local types and helpers
None.

## Proposed end state
5 lines (merged import), same export; optionally moved to `runtime/`.

## Verification
`test/browser/local-ocr.spec.ts`, scan browser specs, the quint stubs above resolve by module id (update if moved).
