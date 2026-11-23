# apps/app/src/prototype/notes-query-review.ts
- Lines: 53 | Role: three review dialogs on `openReview` — pick one note to share, approve a list of titles, pick/confirm a name-targeted edit — plus the `shareable` predicate | Verdict: SIMPLIFY (delete two dead dialogs); DELETE with legacy notes
- Importers: `notes-query-executor.ts:9` only. `scripts/test-notes-query-flow.ts` (`shareable`).
  Text/path pins: Playwright specs inject this file's text into a blank page and call the functions on `window` (T6): `test/browser/notes-query-review.spec.ts:12`, `test/browser/notes-named-review.spec.ts:14`, `test/browser/notes-review.spec.ts`; `test/support/feature-parity.mjs:399`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-37, 38-53 | A7 | `reviewNoteTitles` and `reviewNamedNote` are only reached from `executeNotesSearch`/`executeNamedNotes`, which have no caller (see `notes-query-executor.ts.md` #1). Other hits are Playwright specs that evaluate them in isolation (T6). | Delete both (~26 lines) with the dead executors; delete `test/browser/notes-named-review.spec.ts` and the matching tests in `notes-review.spec.ts`. | Low. |
| 2 | 17-26 | A1 (P10) | `reviewNotesQuery` serves only `executeNotesQuery`, which runs only for Older notes. | Delete with P10 (file + `notes-query-review.spec.ts`, `notes-review.spec.ts`). | Owner decision. |
| 3 | 4-6 | C3/P12 | Private `button/heading/paragraph` element factories (research P12). Twins: inline `createElement` chains in 14 dialog files, `note-source-adapter.ts:60`, `note-web-source-adapter.ts:18`. | Shared `prototype/dom.ts el()` if the file survives. | None. |
| 4 | 8 | D12 | `select.style.minHeight='44px';…maxWidth;…font;…color;…background` inline styles. | CSS class in the review stylesheet. | None. |
| 5 | 15 | — | `shareable` predicate: used by the executor and `scripts/test-notes-query-flow.ts:32`. | Keep with the executor. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `button`, `heading`, `paragraph` | helper | 4-6 | 14 dialog files | `prototype/dom.ts` |
| `noteSelect` | helper | 7-12 | none | stays (or deleted with #2) |
| `shareable` | helper | 15 | none | stays with executor |

## Proposed end state
If Older notes stays: ~22 lines (`noteSelect`, `shareable`, `reviewNotesQuery` on shared `el()`). With P10: deleted.

## Verification
Playwright `notes-query-review.spec.ts`, `notes-review.spec.ts`, `notes-named-review.spec.ts` (deleted/trimmed alongside), `scripts/test-notes-query-flow.ts`, feature-parity test.
