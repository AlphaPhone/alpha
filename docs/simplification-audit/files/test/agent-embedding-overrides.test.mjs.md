# test/agent-embedding-overrides.test.mjs
- Lines: 89 | Kind: unit (lines 14-50, `localEmbeddingEnvironment`) + tooling integration (lines 52-89: spawns the real launchers with a fake `bun`, a temp git repo and temp HOME) | Verdict: MERGE into `test/tooling/local-agent-launcher.test.mjs` (reduced)
- Covers: developer launchers forward explicit embedding library/model paths to the agent child and never rewrite the saved profile. Duplicates: `test/agent-identity.test.mjs` and `test/agent-model-selection.test.mjs` use the same launch fixture pattern on the same launcher. Callers/importers: `npm test` glob; imports `scripts/agent-embeddings.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-50 | T3 | Six unit tests of one env-mapping function. | Drop; the launch cases cover the outcome. | Low |
| 2 | 87-89 | P1 | 2 launchers x 6 input kinds = 12 process spawns, each with `git init` + commit. | Keep two launches (all inputs set; nothing set) on `start-local-remote.ts` only. | Low |
| 3 | 75, 87 | A7 | `start-reviewed-workflow-agent.ts` has no package.json or CI caller (scripts research: merge into `start-local-remote.ts` or delete). | Follow the scripts-chunk decision; drop its case if the launcher goes. | - |
| 4 | 52-85 | C3 | Fourth copy of the "fake bun + temp profile + git fixture" launch helper (also in `agent-identity`, `agent-model-selection`). | One helper in the merged file. | - |
| 5 | 10 | A7 | `ALPHA_EMBEDDING_TEST_ROOT` env knob: set by nothing (grep). | Delete. | None |

## Proposed end state
Gone as a file. `test/tooling/local-agent-launcher.test.mjs` owns one launch helper and about eight cases total across
the three launcher test files; two of them are the embedding-forwarding cases from this file.
