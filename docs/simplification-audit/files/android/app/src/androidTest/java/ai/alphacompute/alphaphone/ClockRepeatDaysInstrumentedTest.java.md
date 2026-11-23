# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ClockRepeatDaysInstrumentedTest.java
- Lines: 53 | Role: repeat days reach `AlarmClock.EXTRA_DAYS`: validation of upstream `ClockHandoff.intent`/`ClockDays`, product `ClockAgentReview.validate/intent`, and one intercepted launch. | Verdict: SIMPLIFY (merge)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:197` (`ClockRepeatDays: {}`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-31 | T3 / T5 | `setIntentCarriesExactRepeatDaysOnlyForSet` exercises only vendored `ClockHandoff`/`ClockDays` (pure Java, no device behaviour) | Delete here; belongs to upstream plugin-native-system tests. `test/clock-repeat-days.test.mjs` already covers the host contract | Low |
| 2 | 32-38 | T3 | `agentReviewValidatesDaysAndBuildsTheSameIntent` is a pure-function check of `ClockAgentReview.validate/intent` (no Android state beyond `Intent`) | Fold into `ClockAgentReviewInstrumentedTest` (one `set` operation with `days` and assert `EXTRA_DAYS` on the intercepted intent) | Low |
| 3 | 39-52 | T4 | `launchedSetIntentIsInterceptedWithRepeatDays` starts an intent the test built itself and intercepts it — proves Android passes extras through, not product behaviour | Delete; the EXTRA_DAYS assertion moves onto the product path in ClockAgentReview (#2) | Low |
| 4 | 42 | C3 / C5 | Fifth AlarmClock `ActivityMonitor` copy | (deleted with #3) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| anonymous `ActivityMonitor` | helper | 42 | ClockAgentReview, ClockHandoff, RealClock | `ClockIntents.intercept` |

## Proposed end state
Delete the file and its `ClockRepeatDays: {}` registry entry; add one `EXTRA_DAYS` assertion to the `set` iteration of
`ClockAgentReviewInstrumentedTest`. Estimated 53 -> 0 lines (+~3 in ClockAgentReview).

## Verification
After the move: `clock-agent-review` phase (pending-recovery-ui.py); `node --test test/android-instrumentation-runner.test.mjs test/clock-repeat-days.test.mjs test/clock-native-contract.test.mjs`.
