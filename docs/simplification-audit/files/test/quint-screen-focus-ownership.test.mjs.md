# test/quint-screen-focus-ownership.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Screen focus observer preserves navigation over resize and retires only its own installation (`application/screen-focus-ownership.mjs` over `runtime/view-focus.ts`, `main.tsx`). Duplicates: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (6 traces, 13 fields). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | T10 | Driver vm-evaluates a slice of `main.tsx` (5 vm sites). | PORT: the focus installer lives in `view-focus.ts`; import it and pass the shell as a port. | Medium |

## Proposed end state
- Runner row.
