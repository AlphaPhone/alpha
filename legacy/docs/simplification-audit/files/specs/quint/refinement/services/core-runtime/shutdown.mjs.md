# specs/quint/refinement/services/core-runtime/shutdown.mjs
- Lines: 260 | Kind: Quint refinement harness (runs the real `AgentRuntime`, service lifecycle, retirement, room queue, turn controller and post-delivery tracker) | Verdict: KEEP (upstream + product-patched room queue/turn controller; path-scope)
- Covers: ordinary vs strict stop, joined callers, room/turn drain, post-delivery drain, fast timeout and retry, preparation failure and reentrancy — against `CoreRuntimeShutdown.qnt`. Duplicates: legacy `check-runtime-lifecycle-refinement.mjs` (specs-12: DELETE; check the room-timeout schedule exists here — it does, lines 214-245). Callers/importers: `test/quint-core-shutdown.test.mjs`, `refinement/services/index.mjs:35` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14 | T8 | `until()` polls every 1 ms up to 5 s — condition-based, bounded. | Keep; move to shared support. | Low |
| 2 | 212-235 | T8 | Sets `ELIZA_FAST_ROOM_DRAIN_TIMEOUT_MS=25` for two real-timer schedules; restored in `finally`. Fine. | Keep. | Low |
| 3 | 54, 57 | T10-lite | Calls `runtime._runServiceStart` and reads `serviceLifecycle.stopOperations` (upstream internals). | Accept. | Low |
| 4 | whole | P6 | Inputs are `vendor/eliza` plus `core-state-patch` (room-handler-queue, turn-controller patched). | Lane on `upstream.lock.json`, `upstream-core-sources.ts`, `core-state-patch.ts`, this folder. | Low |
| 5 | 6-7, 256-260 | C3 / T9 | Local `action`/`flush`; unused CLI tail. | Shared support; delete tail. | None |

## Proposed end state
~245 lines, shared `action/flush/until`, upstream-pin lane, single caller.
