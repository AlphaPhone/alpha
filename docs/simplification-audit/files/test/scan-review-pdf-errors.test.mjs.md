# test/scan-review-pdf-errors.test.mjs
- Lines: 92 | Kind: transplant (type-strips `scan-pdf.ts`, rewrites four import specifiers to `data:` URLs) + transplant-bundle (esbuild of `scan-searchable-review.ts` with stubs, jsdom) | Verdict: REWRITE as cases in `journeys/camera-photos.spec.ts` and `journeys/files.spec.ts`
- Covers: PDF conversion failure shows its reason and keeps retry; a failed/unknown export locks retry as unconfirmed; an export that pushes a picked document out of Recent releases its grant; searchable review stays open with edited text when nothing was written; Back before the request is a cancel, after it unconfirmed. Duplicates: `test/browser/scan-pdf.spec.ts`, `scan-searchable.spec.ts`, `scan-document.spec.ts` ("Export unconfirmed"); `specs/quint/refinement/application/files-recent-index.mjs` (Recent eviction). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-10 | T2 | String-replaces exact import specifiers (incl. `../../../../.eliza/...`). | Delete. | Low |
| 2 | 49-63 | T2 | Second bundle with a stub map. | Delete. | Low |
| 3 | 43-46 | T3 | `scanPdfRetryable` status table. | Delete. | Low |

## Proposed end state
Delete after: camera-photos journey asserts "nothing written keeps the searchable review open with edited text and
retry enabled" and "Back after the request reports unconfirmed"; files journey asserts "an export that evicts a picked
Recent document releases its grant (DailyApps fake records `forgetSelected`)".
