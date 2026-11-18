# test/browser/workflow-notice-lifecycle.spec.ts
- Lines: 58 | Kind: Playwright spec, chromium, 7 tests; module-in-page, no user action | Verdict: DELETE
- Covers: older history download hidden when there is no older copy; a notice action cancelled by Home/device-state/incoming-call cannot commit or navigate; locking during a held list redacts the result; permission change during a held list rejects; Home after commit keeps the receipt. Duplicates: locked redaction is also in `workflow-notices.spec.ts` test 3; history dialog in `workflow-notice-history.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7 | A1 | Test 1 checks the "Download older notification history" link (legacy copy). | Delete with the legacy reader. | None. |
| 2 | 8-58 | T6 | Six tests call `publishWorkflowNotice`, `actOnWorkflowNotice`, `BrowserNotifications.list` and patch `workflowNoticesDocument.edit` / `browserHostedResults.list` in the page. | Delete. | Race rules (cancel-before-commit, Home after commit) lose browser coverage; the notification journey keeps "tap opens Workflows" and "locked phone shows redacted". |
| 3 | 30 | D5 | Uses `dataset.devBackground` as the lock switch. | Goes with the file. | None. |

## Proposed end state
File deleted. The user-visible parts (locked notice is redacted; a tapped notice opens Workflows once) live in
`journeys/notifications.spec.ts`.
