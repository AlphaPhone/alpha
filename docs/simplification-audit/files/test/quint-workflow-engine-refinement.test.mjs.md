# test/quint-workflow-engine-refinement.test.mjs
- Lines: 36 | Kind: mixed: harness tooling (test 1) + Quint wrapper via child process (test 2) | Verdict: MERGE: test 1 into `test/quint/tooling.test.mjs`; test 2 into `test/quint/refinement.test.mjs`
- Covers: Test 1: workflow engine compilation refuses a changed module graph or changed captured bytes (`services/workflow-engine/ports.mjs`). Test 2: upstream workflow engine SQL admission and source coordinator refine bounded traces. Duplicates: Test 2: `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`) (`runWorkflowEngineRefinement`). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | keep | Input-binding check for the engine harness (same family as `quint-refinement-harness`). | Move to tooling. | Low |
| 2 | 17-36 | T9 | `node -e` inline program; assertions invisible to node:test. | Runner imports directly. | Low |
| 3 | whole file | T4 | The same campaign also runs in `test/quint-services-refinement.test.mjs` (aggregate over `specs/quint/refinement/services/index.mjs`), so every `npm test` replays it twice. | Delete this wrapper once the runner exists, or delete the aggregate (chunk summary recommends deleting the aggregates). | Low |

## Proposed end state
- Tooling case + runner row.
