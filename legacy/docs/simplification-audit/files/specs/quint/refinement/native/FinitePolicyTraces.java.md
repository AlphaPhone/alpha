# specs/quint/refinement/native/FinitePolicyTraces.java
- Lines: 107 | Kind: Quint refinement harness (Java, real helper classes, exhaustive finite tables) | Verdict: KEEP, SIMPLIFY (de-duplicate the scheduling table; route VAD to the upstream lane)
- Covers: three live native models: `VadSegmentation` (upstream `LiveVadGate`: 18 reachable counter states × 12 inputs incl. NaN/±Inf and 0.35/0.5 boundaries), `RendererRecovery` (app `RendererRecoveryBudget`: loss windows, saturation at 4, overflow regression), `ResidentScheduling` (app `ResidentScheduleRearm.admitAndStart` vs `decide`, 120 cases, lock held). Duplicates: `ResidentScheduleAdmissionTraces.java:90` calls `FinitePolicyTraces.schedulingTraces()` for its `table` scenario, so the same 120-case table runs again under model `ResidentSchedulingServiceAdmission` (T4).
- Callers/importers: `index.mjs:96-111` (`'FinitePolicyTraces'` campaign); compiled by `resident-scheduling-service-admission.mjs:51-53` for the reuse above (run by `test/quint-resident-scheduling-admission.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 79-102 | T4 | Scheduling admission table executed and model-checked twice (ResidentScheduling here, ResidentSchedulingServiceAdmission in the service campaign), and the service campaign has to compile `LiveVadGate` and `RendererRecoveryBudget` only because they share this class. | Move `schedulingTraces()` into `ResidentScheduleAdmissionTraces.java` (or its own small class); decide with the model owner whether both models need the table or `ResidentScheduling` can be refined only by the service campaign. Then drop `LiveVadGate`/`RendererRecoveryBudget` from that compile list. | Low; model coverage unchanged if both keep the table. |
| 2 | 10-38 | P6 / §2.9 | VAD section runs only upstream `LiveVadGate`; research lists `VadSegmentation` as upstream-only. | Separate class (or keep but schedule in upstream-lock lane). | None |
| 3 | 70-76 | — | Reflection sets `lossesInWindow` to `MAX_VALUE` as a defensive-overflow regression; the counter saturates at 4, so overflow is unreachable (B4-style test). | Keep the saturation check (10,000 losses); drop the reflective MAX_VALUE poke if the product report removes the overflow guard. | Low |
| 4 | 39-42, 73 | T10 | Reflection on `RendererRecoveryBudget.{started,windowStart,lossesInWindow}`. | Acceptable. | None |

## Proposed end state
Three small finite tables, one per model, each in the class of the campaign that uses it; the scheduling table runs
once. VAD trace scheduled with other upstream-only campaigns.
