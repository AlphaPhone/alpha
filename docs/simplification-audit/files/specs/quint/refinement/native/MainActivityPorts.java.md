# specs/quint/refinement/native/MainActivityPorts.java
- Lines: 47 | Kind: shared harness support port (clock, posted callbacks, AppTask list, Settings availability, activity launches, task moves) | Verdict: KEEP
- Covers: nothing alone; the Android scheduling/task boundary for every MainActivity harness. Callers/importers: `main-activity-platform.mjs` (stubs call `time`, `post`, `tasks`, `moveTask`, `bridgeAvailable`, `launch`, `settings`), `home-instance-handoff.mjs` + `HomeInstanceHandoffReplay.java`, `renderer-coordinator.mjs` + `MainActivityRecoveryTraces.java`, `renderer-background-rebuild.mjs` (`RendererBackgroundRebuildReplay.java`), `text-scale-lifecycle.mjs`, `assistant-entry.mjs` + `assistant-entry-platform.mjs:82`. All live; survives every proposed deletion.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-20 | — | Default `settings` references `RendererRecoveryBudget.ACTION_*` constants, so the port compiles only with that product class: fine, every caller compiles it. | Keep. | — |
| 2 | 13-16 | — | Mutable statics are reset per JVM (one scenario per process). | Keep. | — |

## Proposed end state
Unchanged. When `MainActivity` is split (HOME hand-off / renderer escape), this port stays the single Android-primitive boundary for all of them.
