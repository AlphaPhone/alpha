# test/browser/notes-named-review.spec.ts
- Lines: 48 | Kind: Playwright spec, chromium, 3 tests; source transplant (reads, strips and concatenates three product files and `phone.css` into `setContent`) | Verdict: DELETE
- Covers: local review dialogs for name-targeted Notes edits (disambiguate, preselect single match, Back cancels) and the titles-only share. Duplicates: `notes-review.spec.ts` tests 2-4 are the same three tests, verbatim, loaded through Vite. Callers/importers: none; imports `../support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T2 | `readFileSync` + `stripTypeScriptTypes` + regex removal of two import lines of `source-review-dialog.ts`, `notes-query-review.ts`, `modal-inert.ts`; any import change breaks it. | Delete. | None |
| 2 | 18-48 | T4 | Exact duplicate of `notes-review.spec.ts:26-59`. | Delete. | None |

## Proposed end state
File deleted. `test/support/strip-types.mjs` loses one importer (still used by `notes-query-review.spec.ts`, also DELETE, and `native-speech.production.spec.ts` Maps case, also deleted).
