# specs/quint/refinement/native/AppInfoHandoffProbe.java
- Lines: 46 | Kind: refinement probe (host-JVM; runs real `AlphaSystemPlugin.openAppInfo` on one raw renderer request) | Verdict: KEEP (or MERGE into `AppInfoHandoffTraces.java` as a `probe` main mode)
- Covers: carries the mounted renderer's exact App-info request into the real Java bridge so the composition campaign checks renderer and native together. Duplicates: the reply/observation projection in `AppInfoHandoffTraces.java:26-66`. Callers: `specs/quint/refinement/application/app-info-handoff-composition.mjs:13` (`const probe = 'AppInfoHandoffProbe.java'`); test `test/quint-app-info-handoff-composition.test.mjs`. (Research `ci-and-formal.md` lists only `AsrPipeFailureProbe` as unreferenced; this one is used.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-44 | C5 | Re-implements the "one call must not fall back across profiles" assertion and the query/attempt projection that `AppInfoHandoffTraces.state()` has. | Give `AppInfoHandoffTraces` a `main` branch `probe <input> <environment>` reusing `state()`; delete this file and point `app-info-handoff-composition.mjs` at it. | Low |
| 2 | 11-26 | — | Real entry point, real `PluginCall` — the right shape. | Keep behaviour. | — |

## Proposed end state
Either unchanged (46 lines, used) or folded into `AppInfoHandoffTraces.java` so the native and composition campaigns share one projection.
