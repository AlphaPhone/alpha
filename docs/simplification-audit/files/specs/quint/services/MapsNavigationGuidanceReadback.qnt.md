# specs/quint/services/MapsNavigationGuidanceReadback.qnt
- Lines: 170 | Kind: Quint model, live (services manifest; 6 upstream `sharedSources`) | Verdict: KEEP as the merge target (rename to `MapsNavigation.qnt`; absorb `MapsNavigation.qnt`)
- Covers: Maps navigation as the current source behaves: user Start needs only a ready route, guidance waits for its own fix, hidden page keeps guidance only with the native screen-off session, leaving Maps or losing the session releases it, failed reroute keeps the previous route, account switch releases everything (7 runs, 9 invariants, 4 witnesses). Duplicates: `MapsNavigation.qnt` (subset, see that report). Callers/importers: manifest; `refinement/services/maps-screen-source.mjs` `checkMapsNavigationGuidanceReadback` (real `DeviceMapsNavigation`, `MapsScreenController`, upstream `MapsController`/`SavedPlaces`); `test/quint-maps-screen-source.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 / §2.11 | Header "Complementary current-source … scope; canonical … remains registered" describes the twin arrangement. | After the merge: one-line description of what the model covers. | None |
| 2 | `maps-screen-source.mjs:28-35`, test lines 5-6 | T10, B5 | Source "canaries": when `mutant` is set, the harness rewrites upstream `.eliza/.../maps-screen.ts` at literal anchors (`this.navigating = false;` → `true`, the selected-place Back guard) to prove the refinement fails. Self-test of the checker, text-anchored, on generated upstream output. | Delete the `mutant` option and the two canary tests. | None |
| 3 | `maps-screen-source.mjs:36-49` | B5 | Compiles twice, hashes inputs three times, writes the bundle to a temp file. | Compile once and import. | None |
| 4 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Renamed `MapsNavigation.qnt`, the only navigation model; harness imports real modules without canaries or hash rounds; path filter `apps/app/src/maps/{device-navigation,guidance,background-navigation,resident-relay,state,screen,cloud-*}.ts`, the two Android Maps Java files, upstream `plugin-maps/src/client/*`.
