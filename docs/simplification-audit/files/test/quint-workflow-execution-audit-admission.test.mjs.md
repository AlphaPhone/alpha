# test/quint-workflow-execution-audit-admission.test.mjs
- Lines: 35 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Workflow admission audit observes actual protocol, journal and renderer recovery (`services/workflow-execution-audit-admission.mjs` over `runtime/workflow-protocol.ts`, `phone-workflow-authoring.ts`, `workflow-device-contract.ts`). Duplicates: `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-24 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 6, checkpoints 48, 11 actions). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 11-15 | T9 | Self re-exec under `--import=tsx`. | Runner runs under one loader. | Low |
| 4 | 27-35 | T10 | Two text-rewrite canaries (`if(request){if(!reviewResend){`, `if(stuck){if(!reviewClear){`). | Drop from the PR lane. | Low |
| 5 | 29; driver:22,34 | A1? | One canary is "legacy clear bypasses its owner review" and the driver has a `legacy` engine scenario (status without `manualSubmissionProtocol`). If that is a reader for an older engine/request format, D1 deletes it and the model shrinks. | Owner question; check with the workflow-protocol reviewer. | Medium |

## Proposed end state
- Runner row, minus any legacy-protocol scenario D1 removes.
