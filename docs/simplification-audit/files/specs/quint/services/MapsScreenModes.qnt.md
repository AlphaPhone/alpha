# specs/quint/services/MapsScreenModes.qnt
- Lines: 248 | Kind: Quint model, live (services manifest, 8 `symbols` pins, 5 witnesses) | Verdict: KEEP (drop pins; owner question on the three desired-property violations)
- Covers: the Maps screen's six modes from independent flags: Back unwinds one layer, cross-app hand-off applied once and discarded by newer input, hidden guidance needs the screen-off session, a pending fix ends guidance (8 runs, 9 invariants). Duplicates: overlaps `MapsNavigationGuidanceReadback` only on hide/screen-off (different state). Callers/importers: manifest; `refinement/services/maps-screen-source.mjs` `checkMapsScreenModes`; `test/quint-maps-screen-source.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 192-197, 236-247 | — | `LocatingHasWatchDesired`, `LateFixKeepsSearchDesired`, `LateFixKeepsTypedOriginDesired` are properties the source **does not have**; two runs assert the violation: a late "Use current location" fix replaces a newer typed search or typed origin, and the busy flag outlives a chosen origin. These are product bug candidates. | Owner question (D16): fix in `maps-adapter.ts`/`screen.ts`, then move the three into `safety`. Not changed here. | None now |
| 2 | manifest `symbols` | T10 | Pins `pendingHandoff`, `discardHandoff`, `screen.handoff`, `screen.hidden`, `screen.release`, `screen.back`, … in `maps-adapter.ts`; the harness executes `screen.ts` and upstream `maps-screen.ts`, not the adapter. | Delete `symbols`; drop `maps-adapter.ts` from `sources` unless the hand-off moves to an imported module. | Low |
| 3 | harness | B5 | Shares the canary/hash ceremony noted in the readback report. | Same fix. | None |
| 4 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged until the owner decides the late-fix behaviour; no symbol pins; harness imports and drives `MapsScreenController`; Maps lane path filter.
