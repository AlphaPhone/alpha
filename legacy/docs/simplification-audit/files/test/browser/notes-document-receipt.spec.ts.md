# test/browser/notes-document-receipt.spec.ts
- Lines: 86 | Kind: Playwright spec, chromium, 3 tests; legacy Notes "Import text note" and "Share note > Save file", `document.hidden` overridden | Verdict: DELETE (owner question on the generic toast-deferral rule)
- Covers: a document receipt or failure toast issued while the page is hidden is shown once it is visible again; a visible page shows it at once. Duplicates: none. Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 42, 52 | A1 | All three tests open legacy "Previous notes"; "Import text note" is legacy-only (`canonical-notes-ui.ts:299` sets `canImportText:false`). | Delete with legacy Notes. | Coverage: deferring a toast until the page is visible |
| 2 | 29, 72 | T8 | Two fixed `waitForTimeout(2300)` sleeps ("longer than a receipt stays up"). | If the rule moves to another journey, use the fake clock or assert after `visibilitychange`. | None |
| 3 | 20-25, 63-68 | T6 | Redefines `document.hidden` and replaces `URL.createObjectURL`. | A rewrite on another document flow (Files save, Photos share) should use `page.evaluate(()=>document.dispatchEvent(...))` with CDP page visibility instead. | Low |

## Proposed end state
File deleted. If the toast-deferral rule is shared (it lives in the toast layer, not Notes), one step in `journeys/files.spec.ts` saves a file while the page is hidden and asserts the toast appears after it becomes visible.
