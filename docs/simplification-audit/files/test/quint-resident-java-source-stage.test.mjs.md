# test/quint-resident-java-source-stage.test.mjs
- Lines: 33 | Kind: mixed: tooling integration (test 1) + Quint wrapper (test 2) | Verdict: MERGE: test 1 into `test/tooling/upstream-sources.test.ts`; test 2 into `test/quint/refinement.test.mjs`
- Covers: Test 1 runs the real `stage-local-agent-sources.ts` (via `test/fixtures/resident-java-source-stage.mjs`) and proves a rewrite-anchor refusal leaves the previous Java tree byte-exact. Test 2 replays ResidentJavaSourceStage. Duplicates: Test 2: `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`). Test 1: none. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-26 | keep | Real script, real filesystem, checks an atomic-publication property of a build input script. | Move into the upstream-sources tooling file. | Low |
| 2 | 21 | T10 | Matches the refusal message text `Review changed runtime notification presentation`, which is an upstream literal the script repeats (test-35 notes the fixture repeats the anchor). | Assert on error class/exit code; read the anchor from the script. | Low |
| 3 | 28-33 | T4/P3 | Thin wrapper: calls one driver and pins receipt numbers (traces 9, checkpoints 49). Exact counts break whenever the model or harness gains a scenario, and say nothing about product behaviour beyond "the replay passed". | Register the model in the manifest-driven runner `test/quint/refinement.test.mjs`; move the count/action floors into the manifest entry (or drop exact counts, keep "passed && driverInputsBound && inputsUnchanged"). | Low |
| 4 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |

## Proposed end state
- Test 1 in `test/tooling/upstream-sources.test.ts`; test 2 is a runner row.
