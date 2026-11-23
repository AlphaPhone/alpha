# test/native-network-lifecycle.test.mjs
- Lines: 60 | Kind: transplant (slices `let nativeNetworkGeneration =` … `let state:` and an Android `useEffect` up to `// Plan state is checked again` from `apps/app/src/runtime/connection-ui.tsx`, strips types, runs in `vm` with fake window/document) | Verdict: DELETE
- Covers: on Android the active network is sampled on start/online/offline/pageshow/visibility before the plan-return check; newer observations supersede older reads; cleanup retires pending reads; an unavailable bridge clears a stale offline hint. Duplicates: `test/connection-presentation-state.test.mjs` (readNativeNetwork use), `specs/quint/refinement/application/cloud-plan-recheck.mjs`, `test/browser/native-cloud-subscription.spec.ts` (`recheckPlanOnReturn`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-13 | T2 | Two marker slices of the 4k-line `connection-ui.tsx`; blocks the D1 split of that file. | Delete. | Medium: generation fencing of network reads is otherwise covered only by the Quint refinement. |
| 2 | 19-22 | C1 | Hand-built fake controller and `useEffect` shim. | Gone. | None |

## Proposed end state
File deleted. `journeys/connection-cloud.spec.ts` (Android native-fake project) gets one case: go offline then online
while hidden, return to the foreground, and the plan check runs once with the current network state.
