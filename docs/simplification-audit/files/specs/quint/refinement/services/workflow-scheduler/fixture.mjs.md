# specs/quint/refinement/services/workflow-scheduler/fixture.mjs
- Lines: 29 | Kind: refinement support (composes the engine fixture with the controlled clock and task store) | Verdict: KEEP
- Covers: `createSchedulerFixture()` builds `createEngineFixture()` from `../workflow-engine/ports.mjs`, swaps global `Date`/`setTimeout`/`clearTimeout` for the controlled clock, plugs the task-store port into the runtime, and adds `settleWith(result)` plus a `close()` that restores globals. Duplicates: `settleWith` overlaps `engine.settle(status, errorCode)` in `ports.mjs:177`. The only difference is that `settleWith` takes a whole result object (`wakeAtMs`). Callers/importers: `workflow-scheduler/index.mjs`, `workflow-scheduler/registration.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-23 | C5 | `settleWith` duplicates `ports.mjs` `settle`. | Make `ports.mjs` `settle` accept `(statusOrResult, errorCode)`, or a result object, and delete `settleWith`. | None |
| 2 | 10-13 | — | The global clock swap happens after `createEngineFixture()` has evaluated the bundle, so the service reads `Date`/`setTimeout` at call time. That is correct for this service, but order-sensitive. | Keep. Add one comment saying the swap must happen before the service schedules anything. | Low |
| 3 | 17 | — | The `service` getter is needed because `restart()` replaces `engine.service`. | Keep. | — |

## Proposed end state
About 22 lines: the engine fixture, the clock, the task store, and global swap/restore, without its own settle helper.
