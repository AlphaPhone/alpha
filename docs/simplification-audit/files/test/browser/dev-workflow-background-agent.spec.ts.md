# test/browser/dev-workflow-background-agent.spec.ts
- Lines: 16 (7.7 KB) | Kind: Playwright, chromium; local workflow simulator, automatic run with a stub agent transport, fake clock | Verdict: DELETE
- Covers: an automatic simulator Write step generates from Home with workflow context; navigation does not cancel it; it waits for active chat; cancel/sensitive view/disconnect/Power/Background abort it; urgency step publishes its trigger input. Duplicates: `dev-workflow-agent.spec.ts` (manual variant), `dev-workflow-urgency.spec.ts`. Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | P7 | Dev-only executor and trigger runtime. | Delete with the simulator. | Low. |
| 2 | 6, 9 | A1 | Notes output read from the legacy store via `openLegacyNotes`/`readBrowserNotesRaw`. | Breaks with A2 anyway. | — |
| 3 | 13 | — | "sensitive context aborts automatic generation": `alphaClient.setViewContext({view:'passwords',sensitive:true})` aborts an in-flight `generateWorkflowText`. This rule lives in product `runtime/alpha-client.ts`. | Carry as a host integration test of `AlphaClient` (fake transport, set sensitive context, expect abort), or into `journeys/workflows.spec.ts` if an agent-backed run can be held. | Medium: no other test found for this privacy rule. |
| 4 | 11, 13, 14 | T6 | Chat and disconnect driven through `alphaClient.send/disconnect` in-page. | Gone. | None. |
| 5 | 16 | D2, P3 | `Component.prototype.api` capture. | Gone. | None. |

## Proposed end state
Deleted. One product rule (sensitive view aborts background generation) needs a replacement integration test; listed in the chunk summary.
