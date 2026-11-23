# test/quint-workflow-request-recovery-admission.test.mjs
- Lines: 10 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Workflow request recovery follows the admitted browser review (`application/workflow-request-recovery-admission.mjs` over `browser/domain-recovery.ts`, `automations-adapter.ts`, `template.html`, `runtime/workflow-intents.ts`). Duplicates: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 7). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | T10 | Reads `template.html`. | PORT with the template split. | Medium |

## Proposed end state
- Runner row.
