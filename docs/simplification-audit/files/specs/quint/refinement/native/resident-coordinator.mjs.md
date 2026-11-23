# specs/quint/refinement/native/resident-coordinator.mjs
- Lines: 48 | Kind: Quint refinement driver (host JVM; whole `AlphaLocalAgentPlugin` and 16 other product classes + upstream `plugin-native-agent` runtime) | Verdict: KEEP
- Covers: Resident runtime coordination: stop, stop error, late stop/cancel, owned/attached/unowned cancellation, lost pair, last surface, broadcast race. Model `ResidentRuntime` (`ResidentRuntime-coordinator`). Duplicates: none. Callers/importers: `native/index.mjs:14,187`, `test/quint-resident-refinement.test.mjs`; `residentSources` is imported by `credential-coordinator.mjs:5`, `resident-scheduling-service-admission.mjs:6`, `resident-start-cancel.mjs:6`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-19 | — | `residentSources` is the de-facto compile closure of `AlphaLocalAgentPlugin`. It names classes the cleanup merges or deletes: `HostedStorageFault` (→ `HostedInbox`), `VoiceEventAdmission` (→ `NativeVoiceBinding`), `CloudDeployment` (generated, trimmed). Pinning files is acceptable; every such change edits this list. | Keep; update with those changes. Consider computing the closure (javac `-sourcepath` over the app package) so the list disappears. | Low |
| 2 | 22-34, 45-48 | A7 | `generateResidentCoordinatorTraces(scenario)` and the CLI exist for manual runs only. | Inline into `checkResidentCoordinator`. | None |
| 3 | 30, 39 | B5 | `fixtureSha256` embedded in an assumption. | Delete. | None |
| 4 | 28-29 | cost | One JVM (and one javac) per scenario: 10 compiles of the full plugin closure. | Compile once via `javaTraceCampaign` with one argument set per scenario. | Low |

## Proposed end state
~30 lines: export `residentSources`, compile once, run 10 scenarios, `checkTraces`.
