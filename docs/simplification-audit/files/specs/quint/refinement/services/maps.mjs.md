# specs/quint/refinement/services/maps.mjs
- Lines: 89 | Kind: Quint refinement harness (imports real `device-navigation.ts`, `cloud-provider.ts`, upstream `state.ts`/`saved-places.ts` via `support.mjs` `sourceModule`) | Verdict: KEEP; add a per-model wrapper; drop the duplicated retirement case
- Covers: `MapsNavigation.qnt` — agent navigation start checks permission and fix freshness before planning, direct-start vs. confirmation, Stop, late route after retirement, and Cloud traffic evidence validation (advertised vs. returned traffic → ready or `invalid-response`). Duplicates: retirement case (54-63) also in `maps-screen-source.mjs:156-164`; permission/fix gating partly in `maps-screen-source` guidance schedules. Callers/importers: only `services/index.mjs:15,76`; no `test/` wrapper.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | coverage | Only reachable through the services aggregate; deleting the aggregate removes all replay of `MapsNavigation`, including the only check of Cloud traffic-evidence validation (64-87). | Add `test/quint-maps-navigation.test.mjs`. | high if forgotten |
| 2 | 54-63 | T4 | Late-route-after-retirement duplicated in `maps-screen-source.mjs`. | Keep in one harness only. | low |
| 3 | 28-34 | B5 | `capture` callback re-hashes all sources before each import and asserts unchanged. | Remove with `check-traces.mjs` simplification; call `sourceModule(path)`. | low |
| 4 | 64-87 | — | The traffic matrix (2×4) is effectively a contract test of `cloud-provider.ts` response validation folded into a Quint trace with a single step. Real behaviour, worth keeping. | Keep. | none |

## Proposed end state
~75 lines, run by its own wrapper test, no source re-hash. Model stays live.
