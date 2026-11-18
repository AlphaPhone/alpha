# test/browser/notes-query-review.spec.ts
- Lines: 21 | Kind: Playwright spec, chromium, 2 tests (theme loop); source transplant into `setContent` | Verdict: DELETE
- Covers: the local "Share note" choice dialog keeps theme colours, shows the exact long preview, never shows the record id, holds the phone inert, returns focus, and cleans up when `showModal` throws. Duplicates: `notes-review.spec.ts:14-24`, verbatim, loaded through Vite. Callers/importers: none; imports `../support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | T2 | Reads and strips `modal-inert.ts`, `source-review-dialog.ts`, `notes-query-review.ts`, removes imports by regex and injects them as a module script. | Delete. | None |
| 2 | 10-21 | T4 | Same test body as `notes-review.spec.ts` test 1. | Delete. | None |

## Proposed end state
File deleted. With `notes-named-review.spec.ts` and the Maps case of `native-speech.production.spec.ts` gone, check `test/support/strip-types.mjs` for remaining importers before keeping it.
