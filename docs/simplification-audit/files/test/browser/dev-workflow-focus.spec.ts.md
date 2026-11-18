# test/browser/dev-workflow-focus.spec.ts
- Lines: 40 (21 KB) | Kind: Playwright, chromium; local workflow simulator "focus" workflows (DND + allow-list + end summary) with fake clock, 18 tests | Verdict: DELETE
- Covers: a simulated focus run turns on DND during a Calendar block, lets only Maya through, captures arrivals, redacts on lock, reconciles edits, releases on cancel/disable/delete/reload, posts one end summary. Duplicates: none outside the simulator. Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P7 | Dev-only executor; focus policy lives in `browser/focus-state.ts`, imported only by browser stand-ins (`browser/notifications.ts`, `browser/device.ts`, `browser/workflow-focus.ts`) and `simulated-workflows.ts`. | Delete with the simulator and `focus-state.ts`/`workflow-focus.ts`. | Low: no product build reaches it. |
| 2 | 8, 13-35 | D2, P3 | `focusApi` (prototype `api` capture) drives `setView('messages'|'inbox'|'workflows')` to fake arrivals. | Gone. | None. |
| 3 | 19, 31 | P3 | Patches `browserHostedResults.list` and `BrowserNotifications.prototype.focusSnapshot`. | Gone. | None. |
| 4 | 6 | T6 | `browserDeviceState().doNotDisturb` read in-page. | Gone. | None. |
| 5 | 33-40 | T7 | Loop over three DND-step modes. | Gone. | None. |

## Proposed end state
Deleted with the simulator. If the owner wants a product "focus" workflow later, it runs on the resident agent and gets its own journey.
