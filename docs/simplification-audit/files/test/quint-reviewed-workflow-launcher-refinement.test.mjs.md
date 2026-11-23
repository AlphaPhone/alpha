# test/quint-reviewed-workflow-launcher-refinement.test.mjs
- Lines: 39 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Reviewed workflow launcher (agent scripts: identity, model, embeddings, combined source) compares private admission and child handoff; extra traces when `ALPHA_QUINT_BUN` is set. Duplicates: `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; `ALPHA_QUINT_BUN` is set by `.github/workflows/browser.yml:73`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 16 or 19). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 12-38 | T4 | Model-specific final-state checks per named trace (`default-source`, `write-metadata`, `signal-int`, ...). These duplicate what the trace expectations already check at every step. | Drop; if any is not in the model, add it to the model instead. | Low |
| 4 | 7 | T9 | Behaviour changes with an env knob. | Keep the knob only in CI; the runner passes it through. | Low |

## Proposed end state
- Runner row.
