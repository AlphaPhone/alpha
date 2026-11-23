# test/quint-trigger-cursor.test.mjs
- Lines: 6 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Development trigger runtime follows TriggerCursor scenarios and random walks; an uncheckable workflow keeps its cursor only while its definition is unchanged (`services/trigger-cursor-replay.mjs`). Duplicates: `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`); `test/trigger-cursor-isolation.test.mjs` also imports the replay module. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (asserted inside the case functions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` via `specs/quint/refinement/services/forward-replays.mjs` (imported by `services/index.mjs:1`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | whole | scope | Models the development trigger simulator (`browser/workflow-trigger-runtime.ts`), kept with its proofs by D20. | Keep while the simulator stays; delete together if D20 changes. | Low |

## Proposed end state
- Runner row.
