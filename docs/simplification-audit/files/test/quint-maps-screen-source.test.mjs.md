# test/quint-maps-screen-source.test.mjs
- Lines: 7 | Kind: Quint wrappers (`checkMapsScreenModes`, `checkMapsNavigationGuidanceReadback`, services index) + two driver-mutant canaries | Verdict: DELETE
- Covers: Maps screen layers refine the bounded modes projection (3 traces); guidance and readback refine route/session schedules (6 traces); Back retires the selected place; End clears guidance. Duplicates: services index registers `maps-screen-source.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | T4 | Both positive campaigns already run in the services aggregate. | Delete. | None |
| 2 | 6-7 | T5 | Mutant canaries (`keep-place-after-back`, `keep-guidance-after-end`) test the harness. | Delete (or formal-lane only). | Low |
| 3 | 4-7 | D8 | Four tests on four minified lines up to 298 chars. | Gone. | None |

## Proposed end state
Deleted. Back/End behaviour is user-visible: assert it in `journeys/maps.spec.ts` if not already there.
