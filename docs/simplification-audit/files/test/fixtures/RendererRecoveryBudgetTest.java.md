# test/fixtures/RendererRecoveryBudgetTest.java
- Lines: 99 | Kind: Java fixture, single-class unit of a state machine (`RendererRecoveryBudget`) | Verdict: MERGE into the Gradle JVM shell suite
- Covers: WebView renderer-death recovery: three immediate recreates per 60 s window, then backoff; while HOME the fourth loss shows the native escape view instead of looping; background reclaims are rebuilt on start and not counted; launcher and assistant surfaces count one death once; HOME detection order; Settings button intents. Duplicates: device `RendererRecoveryInstrumentedTest` (real renderer kill, fewer branches). Callers/importers: `test/renderer-recovery-budget.test.mjs:10` (research: its second case regexes `MainActivity.java`, drop it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 59 | D7 | The saturation case sets the private `lossesInWindow` by reflection. | Drive it with a long loop instead, or drop the case ("retained from the reviewed release" is history, A8). | Low |
| 2 | all | ok | A boot-loop on a HOME-role launcher bricks the phone for the owner; this branch table cannot be reached from Playwright. | Carry all branches. | High if deleted |
| 3 | 84-95 | scope | Settings/Home-chooser intent selection belongs with the `HomeSettings` helper that cross-file-actions extracts from this class. | Move those rows with the helper. | Low |

## Proposed end state
Gradle `RendererRecoveryBudgetTest` with methods per scenario (window, HOME escape, reclaim, shared deaths, HOME
detection), no reflection, no history comments. Node wrapper deleted (its MainActivity regex too).
