# specs/quint/services/WorkflowEngineAdmission.qnt
- Lines: 159 | Kind: Quint model (live; upstream-only sources) | Verdict: KEEP (upstream-pin lane)
- Covers: upstream embedded workflow engine: durable run admission before any worker, manual receipt replay, stale-version and paused-trigger refusal, missed/overlap occurrences, cancellation vs terminal winner, unknown worker outcome restart, approval digest/owner checks, committed-but-unconfirmed decision replay. Duplicates: the client-side `WorkflowExecution`/`WorkflowExecutionAuditAdmission` models restate admission from the phone side (different boundary, not a duplicate). Callers/importers: `quint:check`; `refinement/services/workflow-engine/index.mjs` (+ `ports.mjs`), aggregate `services/index.mjs:28`, `test/quint-workflow-engine-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.9 / P1 | Sources are all `vendor/eliza/plugins/plugin-workflow/src/**` and `packages/core/src/services/trigger-scheduling.ts`. | Upstream-pin lane only; upstream follow-up (D14). | Low |
| 2 | harness `workflow-engine/ports.mjs` | B5 | Bundles the real engine (good) but hashes before/after compilation and evaluation; `test/quint-workflow-engine-refinement.test.mjs:11-14` asserts those hash checks fire (`module graph changed`, `compiled bytes differ`) — tests of the evidence machinery. | Drop rehashing and those test cases (T5). | Low |
| 3 | 107-108 | — | `lateTerminalEvent` and `restart` are stuttering actions (`s' = s`) kept as harness labels. Harmless. | None. | — |
| 4 | test | T4 | Aggregate + own test. | Run once. | Low |

## Proposed end state
Model unchanged; harness kept without rehash ceremony; run only when the upstream pin changes.
