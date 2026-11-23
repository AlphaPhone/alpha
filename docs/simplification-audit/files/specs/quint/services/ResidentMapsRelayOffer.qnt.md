# specs/quint/services/ResidentMapsRelayOffer.qnt
- Lines: 138 | Kind: Quint model (services family, live; 8 tests, 6 witnesses, 6 symbol pins) | Verdict: KEEP; owner question on the documented gap
- Covers: `apps/app/src/maps/resident-relay.ts` `withResidentMapsNavigation`: a resident conversation turn offers Maps navigation to the agent host for the length of the turn; the `relay` flag belongs to the last accepted offer and only that turn's end clears it; requests are received only for the binding the turn began with. Sources exist (`maps/resident-relay.ts`, `maps/agent-navigation.ts`, `runtime/connection-ui.tsx`). Duplicates: none (Maps navigation itself is `MapsNavigation.qnt`). Callers/importers: manifest; harness `refinement/services/resident-maps-relay-offer.mjs` (esbuild-bundles and imports `withResidentMapsNavigation` and `residentMapsNavigationPort`; observed replay); run by `forward-replays.mjs` (aggregate) and `test/quint-resident-maps-relay-offer.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 98-100, 128-130 | owner (D16) | `ConnectedTurnShowsFlagDesired` is a property the source does not have: when two turns overlap and the newer ends first, the older turn stays connected with the flag cleared, so the host may stop relaying navigation for a turn that is still open. Recorded as a known gap, not in `safety`. | Report to the owner as a possible bug; no change here. | — |
| 2 | 68-72, 125-127 | — | `unlatchedEnd` is a mutant action (not in `step`) showing why the latch exists. Fine as a regression witness. | Keep. | — |
| 3 | manifest | T10 | Sources and symbol pins include `connection-ui.tsx` (the call site that wraps the turn), which the harness never loads. Every `connection-ui.tsx` edit re-runs this campaign. | Drop it from sources/pins, or pin the one call-site file after the `connection-ui.tsx` split. | None |

## Proposed end state
Model unchanged; harness already imports the real module; run once; `connection-ui.tsx` no longer a trigger.
