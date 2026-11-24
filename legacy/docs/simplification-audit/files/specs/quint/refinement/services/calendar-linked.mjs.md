# specs/quint/refinement/services/calendar-linked.mjs
- Lines: 129 | Kind: Quint refinement harness (bundles and runs upstream `.eliza/client-features/plugins/plugin-calendar/src/linked-sync/{linked-store,sync-controller}.ts` and `packages/contracts/src/calendar-linked-sync.ts` via `sourceModule`) | Verdict: DELETE (with `specs/quint/services/CalendarLinkedSync.qnt` and its manifest entry)
- Covers: model `CalendarLinkedSync`: client-side linked Google Calendar reconciliation (create/update/delete, lost replies, CAS refusals, conflicts, quarantine and recovery) and the `CalendarSyncController` review/enable/pause loop (20 traces). Duplicates: none in Alpha. Importers: `index.mjs` only; no per-model wrapper (runs only in the services aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 12-18 | A2 / D4 | Every executed module is upstream; the model's manifest sources are all `vendor/eliza/...`. Alpha's renderer no longer runs the linked-sync controller or reconciler: `git grep "CalendarSyncController\|LinkedCalendarReconciler" -- apps android scripts` finds nothing; `apps/app/src/runtime/cloud-protocol.ts:111` imports only Google reader **types** from that folder. D4 deleted the client-side linked-sync stack (`calendar.mjs`, its sibling harness over `calendar-linked-store.ts`, is already deleted in this worktree). | Delete this harness, `CalendarLinkedSync.qnt`, its `services/manifest.json` entry and the import/registration in `index.mjs`. Offer the model upstream (D14 follow-up). | Low for the product; owner question (below) |
| 2 | — | D18 | Android still accepts slot names `calendar-linked-sync:v1:<hash>` (`AlphaCredentialStore.java:49`, `RendererCredentialSlots.java:26`) for the deleted renderer stack. | Cross-file action for the Android owner: remove the slot pattern if nothing writes it (D18 keeps the native bridge, not this renderer slot). | Medium (persisted name; check no production writer) |
| 3 | 26, 36-41 | D8 | ~400-character lines. | Moot after delete. | — |

## Proposed end state
File removed together with its model. Owner question: confirm the client linked-sync path is not coming back (agent-side `agent-calendar.ts` is the product path, D4).
