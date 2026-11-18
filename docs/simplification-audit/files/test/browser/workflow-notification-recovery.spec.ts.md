# test/browser/workflow-notification-recovery.spec.ts
- Lines: 54 | Kind: Playwright spec, chromium, 5 tests; module-in-page over the dev local-agent journal | Verdict: DELETE
- Covers: `developmentActionJournal.recoverNotification` repairs an interrupted post_notification journal entry from posted/dismissed/compacted notice history without reposting; missing, legacy-unbound and changed-bound receipts cannot be promoted; a concurrently settled journal is not overwritten. Duplicates: host tests `test/workflow-notice-delivery.test.mjs`, `test/workflow-notice-return.test.mjs` cover notice delivery; the product journal is native (`AlphaActionJournal`). Callers/importers: none. Imports `scripts/local-agent-dev-storage.ts` from a spec.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-54 | T6 | No user action; every assertion is on module return values imported in the page. | Delete. | Low. |
| 2 | 9, 42 | D6 | Exercises `developmentActionJournal`, the dev simulator's journal, not the production native journal. | Delete; production recovery belongs to Android instrumentation. | Owner question: is browser `workflowNoticeReceipt` binding reachable in a product build? |
| 3 | 22-28 | A1 | "legacy" unbound receipt case protects pre-binding notice rows. | Delete with the reader. | None. |
| 4 | 10, 43 | C3 | Local SHA-256→hex helper, twice. | Goes with the file. | None. |

## Proposed end state
File deleted. If notification-journal recovery needs coverage, it is an Android instrumentation test of
`AlphaActionJournal` plus the native notice ledger.
