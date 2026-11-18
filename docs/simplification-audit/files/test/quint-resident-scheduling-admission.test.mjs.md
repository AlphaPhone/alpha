# test/quint-resident-scheduling-admission.test.mjs
- Lines: 20 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Resident admission runs the real receiver refusals and closed lifecycle after stop acknowledgement; two named source mutants must fail (`native/resident-scheduling-service-admission.mjs`). Duplicates: `test/quint-native-refinement.test.mjs` (aggregate over `specs/quint/refinement/native/index.mjs`) (receipt part). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 123, checkpoints > 500). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 2 | whole file | T4 | The same campaign also runs in `test/quint-native-refinement.test.mjs` (aggregate over `specs/quint/refinement/native/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |
| 3 | 11-20 | T10 | Two mutant canaries (`ignore-lifecycle`, `lose-refusal`) compile mutated Java; each costs a javac+java run. | Drop from the PR lane (opt-in mutation lane at most). | Low |

## Proposed end state
- Runner row; canaries opt-in.
