# specs/quint/refinement/native/CredentialResidentTraces.java
- Lines: 141 | Kind: Quint refinement harness (Java, real `AlphaLocalAgentPlugin` with resident stubs) | Verdict: KEEP (reformat)
- Covers: model `ResidentRuntime` (id `ResidentRuntime-credential-coordinator`): a provider clear on one plugin instance retires admitted request and stream work on another (owned work drops to 0, stream handle cancelled, request rejected), strict shutdown confirmed, and late transport callbacks after retirement neither resolve calls nor emit notifications. One trace. Duplicates: `resident-coordinator.mjs` campaigns cover ResidentRuntime start/stop without credential mutation; no other covers this cross-plugin retirement.
- Callers/importers: `credential-coordinator.mjs` (scenario `resident-retirement`, and the `campaign` mode of `CredentialCoordinatorTraces` spawns it as its own JVM). Depends on `CredentialCoordinatorTraces` static helpers and `CredentialCoordinatorPorts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 93-140 | D8 | Indentation drops from 4 to 3 spaces mid-`try` (hand-edited); the `try` block body is misaligned with its `finally`. | Reformat the method. | None |
| 2 | 17-19, 40-48 | T10 | Reflection on `AlphaLocalAgentPlugin` private `stopping`, `accepting`, `ownerToken`, `startOwnsLaunch`, `lifecycleEpoch`, `workers`, `streams`. Same split risk as `CredentialCoordinatorTraces`. | Same accessor plan. | Medium |
| 3 | 42-45 | T8 | Busy-wait on executor idle up to 5 s. | Acceptable. | None |
| 4 | 17-19 | C3 | `field()` just forwards to `CredentialCoordinatorTraces.field`. | Call it directly. | None |

## Proposed end state
Keep the single cross-plugin retirement trace, reformatted, with the forwarding `field()` removed and the reflected
lifecycle names moved behind the same accessor as the coordinator harness when the plugin is split.
