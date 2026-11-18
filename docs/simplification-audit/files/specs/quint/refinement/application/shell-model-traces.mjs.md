# specs/quint/refinement/application/shell-model-traces.mjs
- Lines: 81 | Kind: test support — Quint ITF trace generator (`quint run --mbt --out-itf`) and step replayer | Verdict: MERGE into one `specs/quint/refinement/model-traces.mjs`
- Covers: generates simulator traces for a model and replays them against a fixture comparing `observe()` with `project(state)` after every step. Importers: `shell-core-fixture.mjs` (for `root`) and 13 tests (`quint-back-dispatch`, `quint-chat-dock`, `quint-fixture-busy-latch`, `quint-home-surface`, `quint-inert-hold`, `quint-inline-modal-focus`, `quint-keyboard-detectors`, `quint-keyboard-geometry`, `quint-phone-recents`, `quint-settings-capability-reads`, `quint-settings-session`, `quint-shade-pull`, `quint-shell-screen`). Duplicates: `specs/quint/refinement/assistant-model-traces.mjs` and `application/browser-model-traces.mjs` (same ITF decode + `modelTraces` + `replayTraces`, with scenario/witness support).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-47 | C5 | Third implementation of ITF decode (`#bigint/#set/#tup/#map`) and simulator invocation; the other two add named scenario/witness runs. | One module exporting `modelTraces({family, module, scenarios, witnesses, random, steps, seed})` and `replay(traces, driver, {project})`; port the 13 tests and the two siblings' importers. | M |
| 2 | 81 | C3 | `tick` duplicated in `support.mjs`. | Single helper. | L |
| 3 | 36-39 | P1 | Spawns the Quint CLI per test with a 120 s timeout (40 traces × 30 steps default). | Fine; keep counts as parameters. | — |
| 4 | 13 | C3 | `root` re-derived here, in `support.mjs`, `browser-model-traces.mjs`, `assistant-model-traces.mjs`, `vault-coordinator.mjs`, `startup-permissions-coordinator.mjs`. | Export once. | L |

## Proposed end state
Deleted; its two functions live in the merged trace runner used by all model-trace replays.
