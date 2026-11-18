# specs/quint/refinement/services/workflow-scheduler/tasks.mjs
- Lines: 46 | Kind: refinement support (controlled task-persistence port with hold/release/fail gates) | Verdict: KEEP, SIMPLIFY
- Covers: an in-memory `getTasks`/`getTasksByName`/`createTask`/`deleteTask` port for upstream `EmbeddedWorkflowService`. It records events (`create-called`, `created`, `delete-called`, `deleted`) and open creations, and has gates before and after create and delete, so the harness can hold or fail task writes at exact points. Duplicates: none. The services `task-service`/`task-scheduler` harnesses use the real upstream task service on PGlite rather than a port. Callers/importers: `workflow-scheduler/fixture.mjs` (directly), `registration.mjs` (through the fixture: `seed`, `hold`, `release`, `fail`, `detach`, `events`, `openCreates`, `tasks`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | A7 | `gates.read` is checked in `getTasks`, but no caller ever holds `'read'` (`git grep "hold('read')"` finds nothing). | Delete the read gate. | None |
| 2 | 41-44 | — | `detach`, `hold`, `release` and `fail` are each used by `registration.mjs`. | Keep. | — |
| 3 | 1 | — | Imports `deferred` from `../support.mjs`. That is the shared helper, which is correct. | Keep. | — |

## Proposed end state
About 44 lines: the same port without the dead read gate. It moves with the scheduler harness if upstream-only models move upstream.
