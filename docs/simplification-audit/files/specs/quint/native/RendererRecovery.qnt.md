# specs/quint/native/RendererRecovery.qnt
- Lines: 315 | Kind: Quint model (live, with `additionalProofInit: budgetInit`) | Verdict: KEEP (consolidate its three source ties)
- Covers: `RendererRecoveryBudget` (three immediate recreations, exact 60 s window, backwards clock, 5 s backoff, HOME escape) and `MainActivity` render-process-gone handling: stale/duplicate callbacks, async recreation, Settings fallbacks, secondary-launcher handoff to the page owner, task restore, shared renderer deaths with the assistant surface. Duplicates: assistant/shared-death part overlaps `RendererBackgroundRebuild.qnt`. Callers/importers: manifest; three harnesses: `FinitePolicyTraces.java` (budget table, `refinement/native/index.mjs:96-110`), `renderer-coordinator.mjs` + `MainActivityRecoveryTraces.java` (`index.mjs:189`), and `native/recovery-vad-conformance.mjs` (+ `test/quint-recovery-vad-conformance.test.mjs`); referenced by `application/manifest.json`, `refinement/application/recovery-ui.md`, `scripts/android-instrumentation.ts`, `test/android-instrumentation-runner.test.mjs`, `RendererRecoveryInstrumentedTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harnesses | T4 | `RendererRecoveryBudget.onLoss` is replayed three times: `FinitePolicyTraces` (complete count/time classes), `recovery-vad-conformance.mjs:104-139` (Quint states through the same `onLoss`, `delay`, `homeChoiceAction`) and the MainActivity coordinator. | Delete the RendererRecovery half of `recovery-vad-conformance.mjs` and its test (FinitePolicyTraces covers the same classes); keep FinitePolicyTraces + coordinator. | low |
| 2 | 123-131, 147-157, 143-146, 159-164 | — | Two recreation paths (`dispatchRecreation`+`recreationCompleted` for MainActivity's posted `recreate()`, `recreateCallback` as an atomic summary) and two reload paths (`requestReload`, `reload`). The atomic ones are used by `FinitePolicyTraces.java:62` for helper-level traces; the detailed ones by `MainActivityRecoveryTraces.java:209-254`. Legitimate two abstraction levels, but undocumented. | Add one comment saying which harness uses which. | none |
| 3 | 94-122, 238 | C5 | Assistant-surface fields (`assistOpen` … `assistDecision`) duplicate `RendererBackgroundRebuild`. | See owner question in `RendererBackgroundRebuild.qnt.md`. | medium |
| 4 | 312-314 | — | `doubleCountCanaryTest` writes state directly to prove the invariant can fail. Canary, keep. | none | — |
| 5 | 36-45 | — | `budgetInit` is the `additionalProofInit` (`scripts/check-quint.ts:177,185`); live. | none | — |

## Proposed end state
Model unchanged except a comment for finding 2. Product sources (`RendererRecoveryBudget.java`, `MainActivity.java`,
`AlphaAssistActivity.java`) live; tie is compile-and-run Java, no text slicing. Coverage consolidated to two harnesses
(finite helper table + MainActivity coordinator). If Stage F splits `MainActivity`, the coordinator's
`MainActivityPorts` and source list move with it.
