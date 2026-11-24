# specs/quint/native/ResidentScheduling.qnt
- Lines: 83 | Kind: Quint model (live) | Verdict: MERGE into `specs/quint/native/ResidentSchedulingServiceAdmission.qnt` (then rename that one `ResidentScheduling`)
- Covers: `ResidentScheduleRearm.decide` ordered decision table (IGNORE/LOCKED/NOT_PACKAGED/NOT_ENABLED/LIFECYCLE_BUSY/START) and admission+start under one lock against stop/provider-change. Duplicates: `ResidentSchedulingServiceAdmission.qnt` contains the same `decision` function (lines 16-22 there), the same state, the same eight tests and canary, and adds service refusal, foreground launch and confirmed-stop semantics. Callers/importers: manifest; `FinitePolicyTraces.java` (`index.mjs:97-109`, complete-finite-helper table); README rows 188-199, 248.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | T4 / P6 / C5 | Audit twin. `ResidentSchedulingServiceAdmission` (its header: "Complementary audit scope; the canonical model … registered separately") is a superset. Two models, two harnesses (`FinitePolicyTraces` and `resident-scheduling-service-admission.mjs`) for 60 lines of Java. | Keep one model. Point `FinitePolicyTraces`' `ResidentScheduling` traces at the merged model (observed fields are a subset; `checkTraces` compares observed fields only), or drop them since the SSA harness already runs "the 120-case ordered admission table" (its assumption text). | low |
| 2 | 37-38 | — | Semantic difference: here `finishLifecycle` returns to `idle` and a later broadcast may START; in SSA a confirmed stop keeps broadcasts refused until an explicit start or process death (SSA `providerMutationWinsBeforeBroadcastTest`, `confirmedStopStaysClosedUntilRestartTest`). This model is the weaker over-approximation; SSA matches current code per its harness. | Merge keeps SSA semantics. | low |
| 3 | 6, 29-31, 56 | B4 | `lastStartAdmitted` re-derives the same conjunction `decision()` already checked, then the invariant re-checks it. | Disappears with the merge. | none |

## Proposed end state
File deleted. `ResidentSchedulingServiceAdmission.qnt` renamed to `ResidentScheduling.qnt` (module renamed),
manifest entry merged (keep the union of `sources`, the SSA `symbols`, tests and witnesses), `FinitePolicyTraces`
either retargeted or reduced to `VadSegmentation`/`RendererRecovery`, README rows replaced. Quint stays at 100 %
because the surviving model already passes with a stronger harness.
