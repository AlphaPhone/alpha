# test/browser/dev-workflow-receipts.spec.ts
- Lines: 44 (18 KB) | Kind: Playwright, chromium (and `browserName` branches); simulator receipt workflow (save attachment to Files, add amount to Wallet) + `BrowserFiles` unit tests | Verdict: DELETE
- Covers: simulator "Workflow receipt" review dialog, exact attachment bytes to Files, Wallet transaction, replay/cancel/rollback semantics, version-one Files IndexedDB upgrade, receipt date ageing. Duplicates: `dev-files.spec.ts` (attachment bytes, reviewed hashes). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 13, 18, 20, 25, 27 | A3 | The workflow's second step is "Add the amount to Wallet"; Wallet is deleted (D2). `datedReceiptWallet`, `recordWorkflowExpense` exist only for it. | Delete with Wallet. | None. |
| 2 | 23, 36-38 | A1 | "version-one Files upgrade" and "blocked Files upgrade … without losing legacy data" open `alpha.browser.files.v1` at version 1: legacy readers (D1). | Delete with the upgrade path in `browser/files.ts`. | None. |
| 3 | 19, 21, 24, 29-31 | T6, P3 | `new BrowserFiles().saveWorkflowAttachment` unit tests; `IDBObjectStore.prototype.add` patched. | Delete. | Low. |
| 4 | 40-44 | T6 | `requestWorkflowReceipt(api,…)` called in-page with a fake `api`. | Gone. | None. |
| 5 | 26 | — | Compact dark-display layout check of the simulator dialog. | Gone with the dialog. | None. |

## Proposed end state
Deleted together with Wallet, `browser/workflow-receipts.ts` and the version-one Files upgrade.
