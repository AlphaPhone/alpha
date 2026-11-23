# specs/quint/refinement/services/workflow-scheduler/README.md
- Lines: 31 | Kind: harness documentation | Verdict: SIMPLIFY (shrink, and keep it as the only home of the "known current behaviour" notes)
- Covers: explains the `WorkflowWakeups` (per-run timer/callback reservation) and `WorkflowScheduleTasks` (SQL definition versus runtime task commits) harnesses over upstream `EmbeddedWorkflowService`. Duplicates: the bounds and obligations repeat the `assumptions`/`obligations` arrays in `workflow-scheduler/index.mjs:156-164` and `registration.mjs:199-208`. Callers/importers: none (documentation, no links found by `git grep workflow-scheduler/README`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17, 27-31 | C5 | Bounds and gaps are duplicated with the harness receipts. | Keep them once. | None |
| 2 | 19 | B5 | "Source discovery, exact compiled-byte checks and before-driver provenance…" describes the hash ceremony being removed from `workflow-engine/ports.mjs`. | Delete the sentence. | None |
| 3 | 29-31 | — | Documents real current upstream behaviour: a completed cleanup marker can coexist with a late stale task that startup later removes, and task registration does not authorize a run. This is useful upstream knowledge. | Keep, and file it as an upstream follow-up note if the owner considers it a bug (D14). | — |

## Proposed end state
About 15 lines: what each of the two harnesses runs for real and what is a port (clock, task store, process), the two "known current behaviour" paragraphs, and the run commands. It moves upstream with the harness if the owner moves upstream-only models.
