# test/browser/dev-workflow-executor.spec.ts
- Lines: 83 (22 KB) | Kind: Playwright, chromium; local workflow simulator executor internals, 21 tests, heavy in-page module use | Verdict: DELETE
- Covers: simulator Do/Read/If/Send/Write/Notify steps: device effects, cancel/reload/failure semantics, run-intent journal, replay-bound local send receipts, journal capacity, legacy Notes writes, workflow notice publication/redaction/dedupe. Duplicates: `workflow-notices.spec.ts`, `workflow-notice-lifecycle.spec.ts`, `workflow-notice-history.spec.ts`, `workflow-notification-recovery.spec.ts` (notice publication, redaction, shade, Clear all on the product module `browser/workflow-notices.ts`). Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-7 | P7 | All tests run the dev-only executor seeded through `alpha.dev.app.workflows`. Research flagged this spec as "executor internals" (tests-browser §7 item 10). | Delete with the simulator. | Low. |
| 2 | 11, 19, 32 | P3 | `BrowserDevice.prototype.setSensor` replaced to hold/fail/never resolve. | Gone. | None. |
| 3 | 28, 48 | P3 | `Storage.prototype.setItem` throws for simulator keys. | Gone. | None. |
| 4 | 45, 57 | T6 | `sendWorkflowLocal(...)` and `api.localWorkflowNotes(...)` replayed directly in-page to check receipts. | Gone. | None. |
| 5 | 55-67 | A1 | Notes writes go to the legacy store (`readBrowserNotesRaw`, `browserNotesPort.compareExchange`); A2 deletes it (Q-NOTES-3). | Gone. | — |
| 6 | 69-83 | T4, T6 | `publishWorkflowNotice` called in-page with hand-made ids; the same product module is covered through UI by the `workflow-notice*` specs. | Delete; confirm `workflow-notices.spec.ts` keeps "failed notice persistence posts nothing" and "cancel while waiting for the lock prevents publication", else carry those two there. | Medium for the two notice-failure cases. |

## Proposed end state
Deleted. Before deletion, check the two workflow-notice failure cases (lines 75-77, 81-83) exist in a surviving workflow-notice spec; if not, move them into `journeys/workflows.spec.ts` on agent-produced notices.
