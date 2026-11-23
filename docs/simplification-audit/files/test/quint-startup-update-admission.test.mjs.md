# test/quint-startup-update-admission.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Android startup gate holds mount through uncertain and foreign update readbacks (`application/startup-update-admission.mjs` over `main.tsx`, `AlphaDevicePlugin.java`). Duplicates: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (4 traces, 9 fields). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | T10 | Driver vm-evaluates slices of `main.tsx` and anchors into `AlphaDevicePlugin.java`. | PORT: export the startup gate from a `startup/` module. | Medium |

## Proposed end state
- Runner row.
