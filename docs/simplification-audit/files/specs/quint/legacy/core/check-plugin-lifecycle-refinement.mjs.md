# specs/quint/legacy/core/check-plugin-lifecycle-refinement.mjs
- Lines: 326 | Kind: Quint refinement harness (legacy model, real AgentRuntime + PGlite) | Verdict: DELETE
- Covers: joined plugin registration (success and init failure with rollback), joined unload withdrawing held service starts, rival connector surviving unload with a failed service stop, runtime stop projection, against `legacy/CorePluginLifecycle.qnt` (3 profiles) plus two recorded divergences (`PluginRegistrationRollbackVisibility`, `PluginRuntimeStopLookup`). Duplicates: the late-connector and rival scenarios are covered by `check-plugin-connector-custody.mjs` (live `CoreConnectorCustody`); runtime stop is covered by `refinement/services/core-runtime/shutdown.mjs` (live `CoreRuntimeShutdown`, 12 scenarios incl. strict/ordinary stop and service-stop failure). Callers/importers: `specs/quint/refinement/legacy/index.mjs:17`, `test/quint-core-plugin-lifecycle-refinement.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 221-249 | T4 | `late_start_cannot_republish_connector` duplicates connector-custody's first schedule. | Delete. | None. |
| 2 | 283-300 | T4 | Runtime stop projection duplicates `core-runtime/shutdown.mjs`. | Delete. | None. |
| 3 | 161-219 | §2.9 | Joined registration with rollback is upstream-only `registerPlugin` behaviour. | Delete; upstream follow-up if wanted. | Low: no other consumer-side coverage of joined registration rollback. |
| 4 | 143-150, 316-325 | P6 | Records known model/source divergences as obligations: historical evidence. | Gone. | None. |
| 5 | 22 | C3 | `denyFetch` twin. | Gone. | None. |

## Proposed end state
Delete harness, `legacy/CorePluginLifecycle.qnt` + manifest entry, `legacy/core/plugin-lifecycle-refinement.md`, the index row (and `pluginDifferences` map), and `test/quint-core-plugin-lifecycle-refinement.test.mjs`.
