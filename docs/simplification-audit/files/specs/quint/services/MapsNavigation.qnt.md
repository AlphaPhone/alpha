# specs/quint/services/MapsNavigation.qnt
- Lines: 94 | Kind: Quint model, live (services manifest; `sharedSources` upstream `navigation-fix.ts`) | Verdict: MERGE into `specs/quint/services/MapsNavigationGuidanceReadback.qnt` (then rename that file `MapsNavigation.qnt`)
- Covers: route requests generation-fenced by owner epoch, guidance needs a route of the current owner, failed reroute keeps the previous route, account switch retires the route (4 runs, 5 invariants). Duplicates: `MapsNavigationGuidanceReadback.qnt` is a strict extension (same state plus `located`, `screenOff`; same four runs under the same names plus three more). Callers/importers: manifest; `refinement/services/maps.mjs` (`sourceModule` = real `DeviceMapsNavigation`, `createCloudMaps`, upstream `MapsController`, `SavedPlaces`); only runner is aggregate `services/index.mjs` (`index.mjs:140` obligation entry). Also named in `scripts/test-maps-device-navigation.ts`, `scripts/test-connection-history.ts`, `test/optional-view-channel-chat.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | T4 / §2.11 | Audit-variant twin: the readback model's header says "Complementary current-source guidance/readback scope; canonical failed-reroute correspondence remains registered" — i.e. this file. Its `start` still requires `locationGranted and fixFresh`, while the current screen starts without a fix (readback model `start`, `userStartNeedsNoLocationTest`); this model only passes because `maps.mjs` traces grant a fix first. | Merge: carry `maps.mjs` failed-reroute and stale-reply traces into the readback model's harness (`maps-screen-source.mjs` or a merged `maps-navigation.mjs`) with `located`/`screenOff` added to expectations; delete this model and its manifest entry; rename the survivor. | Medium: two harnesses merge |
| 2 | 42-47 | — | `agentStart` under a separately read direct-start preference is also in the readback model. | Carried by merge. | — |

## Proposed end state
One `MapsNavigation.qnt` (today's readback model), one harness driving `DeviceMapsNavigation` + `MapsScreenController` for both failed-reroute and guidance/readback traces. Script/test references updated to the merged name.
