# specs/quint/refinement/native/ResidentTestPorts.java
- Lines: 101 | Kind: shared harness support (controlled service/OS replies for the resident agent: native lib dir, start/stop, boot state, `/api/auth/*` enrollment responses, a pause/release latch) | Verdict: KEEP
- Covers: nothing by itself; it is the fixed external boundary every resident harness compiles. Callers/importers (git grep): `ResidentCoordinatorTraces.java`, `ResidentScheduleAdmissionTraces.java`, `ResidentStartCancelReplay.java`, `CredentialCoordinatorPorts.java`, `CredentialCoordinatorTraces.java`, `CredentialResidentTraces.java`; drivers `resident-coordinator.mjs`, `resident-scheduling-service-admission.mjs`, `resident-start-cancel.mjs`, `credential-coordinator*.mjs`; referenced by name inside generated stubs of `resident-platform.mjs` (`Context.getApplicationInfo`, `AssetManager.open`, generated `ElizaAgentService.start`). All importers are KEEP, so it survives.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 74-90 | — | Routes `/api/auth/status`, `/api/auth/pair-code`, `/api/auth/pair`, `/api/auth/me` mirror the local resident enrollment in `AlphaLocalAgentPlugin.java:1180-1181` (on-device agent pairing, not the PRD-excluded hosted pairing of D5). Live. | Keep. | none |
| 2 | 11-22 | D3 | All state is mutable public statics shared by every harness (`state`, `serviceActive`, `starts`, `failStop`, `losePairResponse`, ...). Works because each scenario runs in a fresh JVM. | Keep; note the one-scenario-per-JVM requirement in the class comment. | low |
| 3 | 22-26 | — | `initialize` creates an empty `libeliza_bun.so` so the plugin's packaged-runtime check passes. | Keep. | none |
| 4 | all | — | Every member has a user (grep: `losePairResponse`, `awaitEntered`, `onStart` in `ResidentCoordinatorTraces`/`CredentialResidentTraces`; `pausePath` internal to `pause/request`; `rootToken` in `ResidentStartCancelReplay`/`resident-platform.mjs`). No dead members. | none | none |

## Proposed end state
Unchanged. If the resident harnesses gain a `residentPlatform({ports})` option (see `ResidentScheduleAdmissionTraces.java.md`), this class stays the single port implementation the generated stubs call.
