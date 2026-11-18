# specs/quint/services/WorkflowScheduleTasks.qnt
- Lines: 88 | Kind: Quint model (live; upstream-only sources) | Verdict: KEEP (upstream-pin lane)
- Covers: upstream engine's schedule task registration as a separate commit from activation: stale creates retired without touching a successor, lost create receipt, removal cleanup marker before restore, pause preserves unrelated triggers, malformed schedule rejected. Duplicates: none (WorkflowWakeups covers timers of a run, not task registration). Callers/importers: `quint:check`; `refinement/services/workflow-scheduler/registration.mjs` (aggregate `services/index.mjs:30`, `test/quint-workflow-tasks-refinement.test.mjs`); prose reference in `native/manifest.json:806`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.9 / P1 | Sources: `vendor/eliza/plugins/plugin-workflow/src/services/embedded-workflow-service.ts` and core uuid/trigger helpers. | Upstream-pin lane; upstream follow-up. | Low |
| 2 | test | B5 / T4 | `test/quint-workflow-tasks-refinement.test.mjs` spawns a child and asserts `traces === 14`, `checkpoints === 63`. Also runs in the aggregate. | Run once, assert `> 0`. | Low |
| 3 | 58-62 | — | `step` enumerates fixed argument tuples instead of `nondet`; small and intentional for bounded simulation. | None. | — |

## Proposed end state
Unchanged model; harness kept (real engine bundle via `workflow-engine/ports.mjs`); runs only on upstream pin change.
