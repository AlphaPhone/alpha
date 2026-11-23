# android/app/src/main/java/ai/alphacompute/alphaphone/OwnerRoutes.java
- Lines: 16 | Role: wraps the shared `OwnerRoutePolicy` over the packaged `owner-routes.json` asset | Verdict: SIMPLIFY
- Importers: `AlphaConnectionPlugin:282`, `AlphaLocalAgentPlugin:1221-1222`. Text/path pins: `test/owner-route-parity.test.mjs` (uses `OwnerRoutes.Assets`, `shipped`), `test/prepared-navigation-route.test.mjs`, `test/fixtures/ResidentRequestDeadlineTest.java`, `specs/quint/refinement/native/{credential-coordinator,credential-coordinator-platform,resident-platform}.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | D4 / A7 | `interface Assets extends OwnerRoutePolicy.Assets {}` — empty re-alias, used only by `test/owner-route-parity.test.mjs`. | Delete; the test uses `OwnerRoutePolicy.Assets`. | None. |
| 2 | 10-15 | D4 (P17) | Instance wrapper whose `group`/`allowed` forward to `policy`. | `static OwnerRoutePolicy shipped(OwnerRoutePolicy.Assets a){return SHIPPED.get(a);}` and let callers use `OwnerRoutePolicy` directly. | Low (2 callers + 1 test). |
| 3 | 8 | A7 | `ASSET` is only read inside this file. | Make private. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Assets` | interface | 7 | `OwnerRoutePolicy.Assets` (identical) | deleted |
| `ASSET` | const | 8 | build script that generates `owner-routes.json` | here |

## Proposed end state
~7 lines: asset name, `SHIPPED`, `shipped(assets)` returning the upstream policy.

## Verification
`test/owner-route-parity.test.mjs`, `test/prepared-navigation-route.test.mjs`, resident request-gate instrumentation.
