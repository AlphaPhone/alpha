# test/browser/maps-approved-read.spec.ts
- Lines: 162 | Kind: Playwright integration with heavy in-page backdoors (T6) and an inline agent + bridge fake; project `chromium`, 7 tests | Verdict: **MERGE** into `journeys/maps.spec.ts` (agent share-approval block), 4 cases
- Covers: the approved `maps_read_selected` device action: the chat send carries only the selected object reference (no place name or coordinates), the disclosure appears before approval, approval uploads exactly the selected snapshot, a stale selection refuses review, a failed receipt is replayed once from the journal. Duplicates: none for the approval flow; journal replay logic overlaps the action-history specs. Callers/importers: none; imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-71 | T7 / C4 | Inline Capacitor fake with a full paired-agent HTTP server (auth/pair, me, agents, register, conversations, proposals, decision/claim/receipt) plus secure store and journal. Same shapes as `mail-review.production.spec.ts` and `helpers/resident-agent-plugin.ts`. | Use the shared bridge plus one `harness/agent-proposals.ts` fake that both specs use. | Low |
| 2 | 73-80 | D5 / A3 | Connects through Settings > diagnostics > "Local development agent" with a pairing code. That is the dev/remote pairing harness D5 keeps only while specs need it. | Re-base on the resident agent (`residentStub`) so this journey does not hold the pairing harness alive. | Medium: proposal routing differs between resident and paired agents; verify the resident path reaches the same coordinator |
| 3 | 81-86, 98-103, 125, 131, 137-139 | T6 | `configureMapsProvider` installed from `/src/maps/runtime.ts`; `getMapsSelectedObject`/`clearMapsSelection` from `/src/maps/agent-context.ts`; `connectionController.actionHistory(true)` called directly. | Provider: install through a harness Maps-provider fixture at the Cloud HTTP boundary (as the production specs do). Stale selection: close the place in the UI (the `stale-before-approval` case already does). Replay: open action history through its UI control. | Medium |
| 4 | 97-104 | T6 | `basemap-ready` toggles a `data-map-ready` attribute and checks the selection object is unchanged: internal state, no user effect. | Drop the case. | Low |
| 5 | 7, 157-160 | T7 | Seven-mode loop with mode-specific branches makes each test hard to read. | Four named tests: place, route, stale before approval, receipt replay (stale-replay folds into the replay test as a second step). | none |

## Proposed end state
Four named tests in `journeys/maps.spec.ts` ("share selected place/route with approval", "closed selection cannot be
approved", "interrupted receipt is replayed once from history"). They run on the resident agent with a shared proposal fake and a
Cloud-boundary Maps provider fixture, with no `/src` imports. `stale-after-read` and `basemap-ready` are dropped
(internal-state checks).
