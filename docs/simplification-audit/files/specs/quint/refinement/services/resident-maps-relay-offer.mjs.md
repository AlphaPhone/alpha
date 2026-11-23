# specs/quint/refinement/services/resident-maps-relay-offer.mjs
- Lines: 102 | Kind: Quint model-trace replay (esbuild bundle of real `apps/app/src/maps/resident-relay.ts` + `agent-navigation.ts`, fresh module instance per trace, controlled request/send ports) | Verdict: KEEP, SIMPLIFY
- Covers: `ResidentMapsRelayOffer` (live): the resident turn opens a Maps navigation offer, polls while the turn is open, retires the offer, registers/unregisters the navigation binding in order, and a refused/old-protocol offer leaves a plain turn. Duplicates: run twice - `test/quint-resident-maps-relay-offer.test.mjs` and `services/forward-replays.mjs:22` (T4). Callers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-20, 96-99 | — | `counterfactual` cuts a trace before the model action `unlatchedEnd` ("behaviour the code does not have"). The model contains a scenario the product deliberately does not implement. | Owner/model question: remove `unlatchedEnd` scenarios from the model if they only document a rejected design; then delete the cut-off. | Low |
| 2 | 21-22 | C3 | Local `tick`, `deferred`. | Shared helpers. | Low |
| 3 | 37 | — | Fresh module evaluation per trace via a `data:` URL with a counter comment, to reset module state. Works; leaks one module per trace (fine for 74 traces). | Keep, or expose a reset from the product module if it is ever added for other reasons (not for tests: D7). | — |
| 4 | 52 | T10 (route) | Pins the request path `/api/client-devices/maps-navigation`: a protocol boundary, acceptable. | Keep. | — |
| 5 | — | T4 | Two runners. | Keep only the forward-replay registration in the per-model runner; delete the host wrapper's count pins (`scenarios.length===8`, `witnesses.length===6`, `checkpoints > traces*5`). | Low |

## Proposed end state
Unchanged replay over real imports; one runner; shared helpers; counterfactual scenarios removed from the model if the
owner agrees.
