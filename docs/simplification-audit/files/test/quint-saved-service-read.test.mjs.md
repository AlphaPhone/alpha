# test/quint-saved-service-read.test.mjs
- Lines: 16 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Saved Calendar reads refine read-only freshness and owner isolation (`application/saved-service-read.mjs` over `runtime/agent-calendar.ts`, `runtime/service-read-cache.ts`). Duplicates: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 8, 8 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 12-13 | T5 | Re-verifies generated-input snapshots (`verifyRefinementReceiptInputs`): a checker property already covered by `quint-refinement-harness.test.mjs:114-170`. | Drop. | Low |

## Proposed end state
- Runner row. `agent-calendar.ts` is the kept product path (D4).
