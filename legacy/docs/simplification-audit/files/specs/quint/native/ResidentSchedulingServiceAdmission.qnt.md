# specs/quint/native/ResidentSchedulingServiceAdmission.qnt
- Lines: 129 | Kind: Quint model (live, "complementary audit" twin) | Verdict: KEEP as the single scheduling model (absorbs `ResidentScheduling.qnt`); harness PORT
- Covers: rearm broadcast admission (`ResidentScheduleRearm.decide`/`admitAndStart`), service refusal of an admitted start (deferred to later broadcast or foreground launch), confirmed stop keeping broadcast admission closed until explicit start or process death. Duplicates: `ResidentScheduling.qnt` (subset); `ResidentStartCancel.rearm` touches the same admission from the plugin side. Callers/importers: manifest (15 `symbols`); `refinement/native/resident-scheduling-service-admission.mjs` (`index.mjs:73,95`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 | Header "Complementary audit scope; the canonical model … remain registered separately" describes a registry arrangement, not behaviour. | Replace with the behaviour sentence once it is the canonical model; rename module/file to `ResidentScheduling`. | low |
| 2 | harness 15-47 | T10 | Harness rewrites text: asserts exactly one occurrence of the seam `Decision decision=decide(action,userUnlocked,…);` in the real `ResidentScheduleRearm.java` and inserts `ResidentScheduleAdmissionTraces.Ports.decision=…` after it; also string-replaces five platform stub files and (mutation mode) the receiver's catch clause. | PORT: `admitAndStart` already returns `Decision` (`ResidentScheduleRearm.java:44`) and the receiver logs refusals through `Log.w` (already ported). Observe the decision from the return value / `Log` port and compile the product file unmodified. Keep platform stub edits as stub files, not `replace()` calls. Mutation modes (`ignore-lifecycle`, `lose-refusal`) are mutation testing of the harness (T5); delete unless a release check uses them. | low |
| 3 | harness 47-55 | C3 | Compile list drags in `FinitePolicyTraces.java`, `LiveVadGate.java`, `RendererRecoveryBudget.java` (unrelated to this model) because the harness class depends on the finite helper. | Remove after the merge with `ResidentScheduling`. | low |
| 4 | 33-39 | — | `broadcastOutcome(event, works)` + `broadcast = broadcastOutcome(e, true)`; fine. | none | — |

## Proposed end state
Renamed to `ResidentScheduling.qnt`, the only scheduling model; header states behaviour. Harness compiles the
unmodified Java and observes `Decision` through the existing return value/log port. Product code
(`ResidentScheduleRearm.java`, `ResidentScheduleReceiver.java`, `AlphaLocalAgentPlugin.java`) live.
