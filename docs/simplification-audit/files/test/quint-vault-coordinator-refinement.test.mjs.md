# test/quint-vault-coordinator-refinement.test.mjs
- Lines: 13 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Password vault coordinator clears drafts and retires reset review on leave (`application/vault-coordinator.mjs` over `passwords/password-manager.ts` and upstream `plugin-native-passwords`). Duplicates: `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 9, checkpoints ≥ 50). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-application-refinement.test.mjs` (aggregate over `specs/quint/refinement/application/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | driver | A3 check | D3 deletes password import/export from `password-manager.ts`; this model covers draft clearing and reset review, which stay. | Re-run after the D3 deletion; drop any import/export action from the model if present. | Low |

## Proposed end state
- Runner row.
