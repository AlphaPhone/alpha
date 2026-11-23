# specs/quint/refinement/native/home-instance-handoff.mjs
- Lines: 27 | Kind: Quint ITF replay driver (simulator traces replayed step by step on the real `MainActivity` in a JVM) | Verdict: KEEP
- Covers: HOME task hand-off: external start, front start creating an instance, unacknowledged/unreliable hand-off, relaunch of a home-type owner; model `HomeInstanceHandoff` (native manifest, live; the manifest names this file). Duplicates: run by `test/quint-home-instance-handoff.test.mjs` **and** via `forward-replays.mjs` in the native aggregate (T4). Callers/importers: those two.

## How it is tied to product code
Compiles whole `MainActivity.java`, `RendererRecoveryBudget.java`, `NavigationOpenRequest.java` (exist) with `MainActivityPorts.java` and `main-activity-platform.mjs` stubs. Uses the shared `itf-replay.mjs` engine. No slicing (the platform reads two strings from source, see its report).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | — | Default `traces=60` + 4 witnesses = 64, which the test and `forward-replays.mjs` both assert. | Keep the bound in the test only. | None |
| 2 | 27 | A7 | CLI block for manual runs. | Optional. | None |

## Proposed end state
Unchanged; one runner (its test), path-filtered to `MainActivity.java`, `RendererRecoveryBudget.java`, `NavigationOpenRequest.java`, the model and this folder.
