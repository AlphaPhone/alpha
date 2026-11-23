# specs/quint/refinement/native/navigation-service.mjs
- Lines: 35 | Kind: Quint refinement driver (host JVM; compiles whole product classes) | Verdict: KEEP
- Covers: Native navigation service ownership: stale start/update/stop commands, notification owner, task-removal attribution (HOME/launcher/assistant tasks), foreground refusal and dispatch failure after replacement, service destroy. Model `NativeNavigationOwnership`. Product: `AlphaNavigationService.java`, `AlphaMapsTransportPlugin.java`, `PluginWorkers.java` compiled whole, plus Capacitor `JSObject.java` from `node_modules`. Duplicates: none. Callers/importers: `native/index.mjs:41,170`, `test/quint-native-navigation-ownership.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-26 | — | Whole classes compiled against ports: the right shape, nothing sliced. | Keep. | — |
| 2 | 22-25 | B5 | Hashes harness files as sources. | Keep compiled files + model only. | None |
| 3 | 35 | A7 | CLI entry; no script runs it. | Optional delete. | None |

## Proposed end state
Unchanged except the shorter `sources` list.
