# test/browser/dev-workflow-result.spec.ts
- Lines: 13 (7.2 KB) | Kind: Playwright, chromium; simulator "Development result" dialog that supplies offline Write output | Verdict: DELETE
- Covers: offline simulator Write steps accept a typed result, feed it to Notes/notices/messages, reject empty/oversized input, retire on cancel/back/home/escape, mark reload as interrupted, refuse after a workflow edit. Duplicates: `workflow-generation.spec.ts` (product: late/edited generation discarded). Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | P7 | The "Workflow step result" dialog is the simulator's stand-in for agent output. | Delete with the simulator. | Low. |
| 2 | 6, 8 | A1 | Notes effects through the legacy store. | Breaks with A2. | — |
| 3 | 9, 13 | T7 | Two loops (5 retirement actions, 3 instructions). | Gone. | None. |
| 4 | 12 | D2, P3 | `Component.prototype.api` capture. | Gone. | None. |

## Proposed end state
Deleted with the simulator.
