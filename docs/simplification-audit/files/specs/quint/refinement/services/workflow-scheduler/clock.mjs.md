# specs/quint/refinement/services/workflow-scheduler/clock.mjs
- Lines: 45 | Kind: refinement support (controlled platform clock: `Date` subclass, `setTimeout`/`clearTimeout`, `advance`, `deliverAlreadyQueued`) | Verdict: KEEP
- Covers: deterministic time and timer delivery for the wake-up and task harnesses, without touching service logic. `deliverAlreadyQueued` lets a test fire a callback after `clearTimeout` (stale old-host callback). Duplicates: other refinement harnesses hand-roll fake clocks (research T8 "one clock policy"). No shared clock module exists in `specs/quint/refinement/support` today. Callers/importers: `workflow-scheduler/fixture.mjs` (directly), `workflow-scheduler/index.mjs` and `registration.mjs` (listed as hashed sources only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5/T8 | A good, small controlled clock. Other harnesses would benefit from the same one. | Move to `specs/quint/refinement/support/clock.mjs` when consolidating the Quint support helpers, and reuse it where harnesses fake timers. | None |
| 2 | 21 | A7 | `allTimers` is exported and never read by any caller (`git grep allTimers` finds only this file). | Delete. | None |
| 3 | 24 | — | The timer object has `unref()` because the service calls it on Node timers. | Keep. | — |

## Proposed end state
About 40 lines, unchanged apart from dropping `allTimers`. It is the shared controlled clock for refinement harnesses.
