# specs/quint/refinement/services/combined-agent-launcher.mjs
- Lines: 66 | Kind: Quint refinement driver | Verdict: KEEP pending owner (delete with `scripts/start-combined-agent.ts`); SIMPLIFY
- Covers: runs 21 `CombinedAgentLauncher` scenarios via the probe and checks traces. Duplicates: run by `test/quint-combined-agent-launcher-refinement.test.mjs` and `refinement/services/index.mjs:45` (T4). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 36-54 | C5 | `runScenario` twin of `cloud-qa-launcher.mjs:19-39` and `reviewed-workflow-launcher.mjs:35`. | Shared runner. | Low |
| 2 | 19-34 | T10 / B5 | Hand source list incl. `parseBuildPolicy(upstream-core-sources.ts)`; scripts-17 converts that manifest to JSON and deletes `build-policy-source.ts`, which breaks line 8. | Derive from metafile; read JSON once the manifest moves. | Low |
| 3 | whole | T4 | Runs twice per `npm test`. | Keep one entry point. | Low |

## Proposed end state
~30 lines on the shared runner, or deleted with the combined launcher.
