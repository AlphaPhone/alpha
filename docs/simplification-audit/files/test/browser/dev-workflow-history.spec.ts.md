# test/browser/dev-workflow-history.spec.ts
- Lines: 34 (7.5 KB) | Kind: Playwright, chromium; UI of the simulator's Workflow history dialog (download, remove finished runs) | Verdict: DELETE
- Covers: "Download history" exports the exact simulator snapshot, "Remove finished runs" keeps running ones, stale/failed writes keep history, backgrounding revokes the download URL. Duplicates: `workflow-notice-history.spec.ts`, `workflow-dialog-layout.spec.ts` (product history surfaces). Callers: chromium only. Imports `node:fs` `readFileSync` to read the download.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | P7 | Seeds `alpha.dev.app.workflows`; `browser/workflow-history.ts` is imported only by `simulated-workflows.ts`. | Delete with the simulator. | Low. |
| 2 | 13-16 | A3 | History export/download of simulator state is an export surface the PRD does not plan (D3 spirit). | Gone. | None. |
| 3 | 9 | P3 | `URL.revokeObjectURL` wrapped in an init script to record revocations. | Gone. | None. |
| 4 | 25, 32 | P3 | `Storage.prototype.setItem` throws; `BrowserDevice.prototype.setSensor` never resolves. | Gone. | None. |
| 5 | 16 | B5 | `page.screenshot({path:'test-results/workflow-history.png'})` nothing reads. | Gone. | None. |

## Proposed end state
Deleted with the simulator's history dialog.
