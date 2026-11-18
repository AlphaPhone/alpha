# test/quint-signin-refinement.test.mjs
- Lines: 15 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Native sign-in coordinator preserves cancellation ownership and bounds email, SMS and MFA attempts (`services/sign-in-coordinator.mjs` over `android/app/.../alphaphone/`). Duplicates: `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 21). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 6-14 | T9 | `node --import=tsx -e` inline program; failures surface only as exit status. | Runner imports the driver directly. | Low |

## Proposed end state
- Runner row. The legacy sign-in replay (`quint-legacy-sign-in-refinement`) and the deleted `quint-saved-sign-in-recovery` are not this model.
