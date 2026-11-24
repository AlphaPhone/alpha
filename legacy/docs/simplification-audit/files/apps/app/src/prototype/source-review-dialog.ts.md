# apps/app/src/prototype/source-review-dialog.ts
- Lines: 17 | Role: `openReview<T>()` — the shared modal review over an inert phone (focus return; Cancel, Back, abort, background and pagehide resolve null). | Verdict: KEEP (make it the only dialog scaffold)
- Importers: `calendar-availability-review.ts:4`, `notes-query-review.ts:3`. Text/path pins: `test/browser/notes-named-review.spec.ts` and `test/browser/notes-query-review.spec.ts` (read + strip types + inject — T2/T6), `test/support/feature-parity.mjs:424`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | C4 | Six modules re-implement this scaffold instead of calling it: `summary-note-review.ts:8-27`, `file-email-review.ts:12-15`, `note-web-source-adapter.ts:14`, `note-source-adapter.ts:53`, `runtime/calendar-sync-settings.ts:205`, `browser/content-question.ts:9` (identical theme-token line). | Migrate them onto `openReview` (cross-file). If `runtime/` and `browser/` callers need it, MOVE this file to `runtime/review-dialog.ts` so they do not import from `prototype/`. | Medium per caller |
| 2 | 7 | — | Theme-token copy from `.os` computed style; fine as the one owner. | Keep. | — |
| 3 | 11 | D8 | 330-character `close` line. | Format. | None |
| 4 | — | D11 | Name says "source review"; it is the generic review dialog. Class name `note-source-dialog` likewise. | Rename to `review-dialog.ts` when moving. | Low (CSS class rename optional) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `openReview` | helper | 4-17 | the six copies listed above | `runtime/review-dialog.ts` |

## Proposed end state
Unchanged body (~17 lines, formatted ~30), relocated to `runtime/review-dialog.ts`, imported by every review dialog.

## Verification
`test/browser/notes-named-review.spec.ts`, `test/browser/notes-query-review.spec.ts` (they read this path — update if moved), calendar availability review Playwright coverage; `npm run test:browser`.
