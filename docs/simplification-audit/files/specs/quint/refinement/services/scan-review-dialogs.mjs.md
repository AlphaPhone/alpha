# specs/quint/refinement/services/scan-review-dialogs.mjs
- Lines: 111 | Kind: Quint refinement driver (bundles real `prototype/scan-review.ts` + `scan-searchable-review.ts` with module stubs, **injects inspection code by text** into both files, runs in JSDOM) | Verdict: PORT
- Covers: `ScanReviewDialogs`: one-shot unconfirmed Notes save, safe Keep-photo retry vs unconfirmed latch, photo-PDF retry classification, searchable PDF close before/after provider request, explicit searchable retry. Duplicates: none for these dialogs; `scan.mjs` covers the document draft dialog. Callers: `services/index.mjs:3,73`; `test/quint-scan-review-dialogs.test.mjs` (campaign + `notes-unlatch` mutant canary).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-38 | T10 | Text injection: in `apps/app/src/prototype/scan-review.ts` inserts `globalThis.scanReviewInspect=()=>({closed,attempted,pdfAttempted})` before the literal `'  return dispose;'`; in `scan-searchable-review.ts` inserts `globalThis.scanSearchInspect=()=>({closed,ready,busy,requested})` before `'  void(async()=>{for'`. Reads closure-private variables by name. All anchors present today (1 hit each). | PORT: observe from the DOM instead (dialog open, button `disabled`, status text, port call counts already counted) - every inspected flag has a visible counterpart (`closed` = dialog removed, `attempted`/`pdfAttempted` = button disabled + port calls, `busy`/`ready` = control state). Then bundle unmodified source. | High (any reformat breaks it) |
| 2 | 35 | T5 / B5 | `notes-unlatch` mutant rewrites the guard `'if(attempted||!field.value.trim())return;'` to prove the harness catches it. A test of the harness. | Delete the mutant and the host test's canary case. | Low |
| 3 | 17-27 | — | Module-specifier stubs for OCR, PDF conversion, platform plugin, Daily apps, Notes documents: legitimate closed ports. `'../runtime/browser-note-documents'` stub: check it still resolves after the Notes legacy deletion (A2). | Keep; update specifiers as files move. | Low |
| 4 | 67-71 | B5 | Hash, compile, re-hash, compile again, compare bytes, re-hash: triple capture ceremony. | One capture via the shared `sourceModule(beforeImport)`. | Low |
| 5 | 1-111 | D8 | Minified style. | Prettier. | — |

## Proposed end state
Same six schedules observing only DOM and port calls, bundling unmodified source through the shared helper; no mutant.
Model fields that have no visible counterpart are dropped from the projection rather than read from closures.
