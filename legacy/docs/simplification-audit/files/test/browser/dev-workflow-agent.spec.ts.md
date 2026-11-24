# test/browser/dev-workflow-agent.spec.ts
- Lines: 79 (13 KB) | Kind: Playwright, chromium; local workflow simulator (`alpha.dev.app.workflows`, label-driven executor in `browser/simulated-workflows.ts`, dev-only) with a stub agent transport | Verdict: DELETE (carry one layout case into `journeys/workflows.spec.ts`)
- Covers: a simulated "Write" step sends the instruction to the agent through `alphaClient.attachVerifiedTransport` and feeds the returned text into a legacy-Notes step; cancel/HOME/edit/external edit/storage refusal recovery messages. Duplicates: `workflow-generation.spec.ts` (cancel, late response, edit-during-generation on the product generator), `workflow-interruption-recovery.spec.ts`. Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | P7 | Every test runs the dev-only local executor (flag-off builds fold `installSimulatedApps` to a no-op, `simulated-apps.ts:17-18`). The product runs workflows on the resident agent (AP-11). | Delete with the simulator (owner question Q-DEV-1). | Low for product. |
| 2 | 5, 10, 28, 56, 78 | A1 | Notes effects go through `openLegacyNotes` and `readBrowserNotesRaw` (legacy "Previous notes" store deleted by A2/D1; Q-NOTES-3 open). | Would break anyway once A2 lands. | — |
| 3 | 14, 18, 36, 60 | D2, P3 | Four copies of `Component.prototype.api=function(key){…if(key==='workflows')window.workflowApi=api…}` to grab the view API; ~12 copies across this chunk. | Gone. | None. |
| 4 | 67 | T6 | `VIEWS.workflows.render({...},api).fd.run()` calls a render result's handler directly. | Gone. | None. |
| 5 | 12 | T3 | "busy generation cannot cancel another consumer" constructs `new AlphaClient()` in-page: a unit test of product `runtime/alpha-client.ts`. | If wanted, a Node integration test of `AlphaClient` with a fake transport. | Medium: `generateWorkflowText` busy/abort ownership has no other test. |
| 6 | 31-33 | — | Long instruction stays within phone width: useful layout check of the product Workflows view. | Carry into `journeys/workflows.spec.ts` on an agent-backed workflow. | None. |

## Proposed end state
Deleted together with the local workflow simulator. Carried: one layout case. Coverage note: AlphaClient generation ownership (line 12) moves to a host integration test if the owner wants it.
