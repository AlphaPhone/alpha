# test/quint-native-stream-bridge.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (calls `runNativeStreamBridgeReplay` from `specs/quint/refinement/native/native-stream-bridge.mjs`) | Verdict: DELETE
- Covers: `streamNativeAgent` (`runtime/local-agent-native-stream.ts`) follows NativeStreamBridge over a synthetic Capacitor port (70 traces). Duplicates: `specs/quint/refinement/native/forward-replays.mjs` registers `NativeStreamBridge` and runs the same replay inside `test/quint-native-refinement.test.mjs`; `owningAssertions` there repeats 70 traces, the 8-action list and `checkpoints > 1500`; host/Playwright pair `local-agent-native-stream` also exists. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14 | T4, P3 | Same replay executed twice per `npm test` (240 s). | Delete the wrapper. | None |

## Proposed end state
Deleted. `NativeStreamBridge` runs once through the native forward-replay list in the manifest runner.
