# specs/quint/services/WorkflowWakeups.qnt
- Lines: 95 | Kind: Quint model (live; upstream-only sources) | Verdict: KEEP (upstream-pin lane)
- Covers: upstream engine's host-owned wake-up reservation for one run: earliest timer wins, bounded far timers, empty-timer fallback, unknown outcome clears the reservation, live worker poll, stopped/cancelled/terminal runs never wake, late queued typed runs never start. Duplicates: none in Alpha; Lemma `workflow-triggers.dfy` mentions it only in prose. Callers/importers: `quint:check`; `refinement/services/workflow-scheduler/index.mjs` (aggregate `services/index.mjs:29`, `test/quint-workflow-wakeups-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.9 / P1 | Single source `vendor/eliza/plugins/plugin-workflow/src/services/embedded-workflow-service.ts`. | Upstream-pin lane; upstream follow-up. | Low |
| 2 | 55 | — | `staleCallback` is `s' = s`, a label for the harness. Fine. | None. | — |
| 3 | test | T4 / B5 | Aggregate + own test with count pins. | Run once, drop exact counts. | Low |

## Proposed end state
Unchanged model and harness (real engine bundle); run only when the upstream pin changes.
