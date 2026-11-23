# test/quint-resident-liveness.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Resident liveness checks and restart replies retain the originating epoch (`application/resident-liveness.mjs`). Duplicates: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 7, checkpoints 38). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | T10/P6 | Driver vm-slices `runtime/connection-ui.tsx` and imports `specs/quint/legacy/...` helpers (ci-and-formal §6: resident-liveness is one of three live harnesses that import from legacy). | PORT: import the liveness controller from an exported `connection/resident-liveness.ts`; move the shared `deferred` helper to `refinement/support.mjs` before `specs/quint/legacy` is retired. | Medium |
| 4 | 6 | consistency | No `timeout` option; inherits the 600 s global. | Runner sets one timeout per row. | Low |

## Proposed end state
- Runner row; driver imports, no legacy dependency.
