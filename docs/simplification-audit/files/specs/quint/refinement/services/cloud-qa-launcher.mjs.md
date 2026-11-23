# specs/quint/refinement/services/cloud-qa-launcher.mjs
- Lines: 61 | Kind: Quint refinement driver (spawns the probe per scenario, feeds traces to `checkTraces`) | Verdict: KEEP pending owner; SIMPLIFY (merge `runScenario` with its twins)
- Covers: runs 22 `CloudQaLauncher` scenarios against the real `scripts/start-cloud-qa.ts`. Duplicates: run by `test/quint-cloud-qa-launcher.test.mjs` and again by `refinement/services/index.mjs:55` (services aggregate, T4). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-39 | C5 | `runScenario` (scratch dir, private HOME, minimal env, spawnSync probe, read `report.json`, assert exit code) is copied in `combined-agent-launcher.mjs:36-54` and `reviewed-workflow-launcher.mjs:35`. | One `runLauncherProbe(probe, scenario, {timeout, env})` in a shared support module. | Low |
| 2 | 41-51 | B5 / T10 | Hand-maintained source list (13 paths plus core-state inputs) used for `captureInputs` hashing before/after. Path pins break on script merges proposed in scripts-08/scripts-02. | Derive sources from the probe's bundle metafile, or drop input hashing if receipts lose their consumer (ci-and-formal §2.8). | Low |
| 3 | 52-57 | C7 | Assumption prose duplicates `cloud-qa-launcher.md`. | Keep one copy. | None |
| 4 | whole | T4 | Executed twice per `npm test`. | Keep only the per-model test or only the aggregate (cross-chunk decision for all services harnesses). | Low |

## Proposed end state
~30 lines: scenario list, shared probe runner, `checkTraces` call. Lives and dies with `scripts/start-cloud-qa.ts` (owner question).
