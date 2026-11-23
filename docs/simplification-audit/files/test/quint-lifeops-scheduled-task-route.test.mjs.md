# test/quint-lifeops-scheduled-task-route.test.mjs
- Lines: 33 | Kind: Quint wrapper (`checkLifeOpsScheduledTaskRoute`, services index) + one fixture scenario over the upstream SDK scheduled-task route (`test/fixtures/lifeops-scheduled-task-route.mjs`) | Verdict: DELETE
- Covers: the pinned SDK scheduled-task route and in-memory claims refine the as-built model (13 traces); case 1 documents that a stale actor's write is accepted (`allowed: true`) — a known upstream defect. Duplicates: services index runs the campaign; chunk test-34 reached the same verdict. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-33 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 6-25 | T5 | Pins upstream behaviour (an unfenced occurrence change) through closed ports. The fix belongs upstream; this test fails the day upstream fixes it. | Report upstream (D14); delete here. | Low |
| 3 | 3 | — | The fixture keeps two importers after this file goes: `specs/quint/refinement/services/lifeops-scheduled-task-route.mjs` and `personal-assistant-scheduled-task-custody.mjs`. | Move the fixture under `specs/quint/refinement/services/fixtures/`. | Low |

## Proposed end state
Deleted; the model runs from the services index; the defect is an upstream follow-up.
