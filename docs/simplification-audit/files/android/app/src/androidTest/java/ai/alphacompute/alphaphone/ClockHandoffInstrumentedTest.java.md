# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ClockHandoffInstrumentedTest.java
- Lines: 46 | Role: Calendar "Clock alarms" UI -> four standard AlarmClock intents (intercepted) with encrypted receipt check; plus a pure validation test of upstream `ClockHandoff.intent`. | Verdict: SIMPLIFY
- Importers: none. Uses `ClockHistoryFixture`.
  Text/path pins: `scripts/android-instrumentation.ts:196` (`ClockHandoff: { args: { clockHandoff: "1" } … }`); `test/android-instrumentation-runner.test.mjs:144-150` requires the source to contain `"1".equals(InstrumentationRegistry.getArguments().getString("clockHandoff")` (gate text pin); `:169` instrumentArgs.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-45 | T3 / T5 | `invalidIntentDoesNotBecomeAnotherAlarmRequest` only calls upstream `ai.eliza.plugins.system.clock.ClockHandoff.intent(...)` with invalid input — a unit test of a vendored class run on a device; also overlaps `ClockRepeatDaysInstrumentedTest.setIntentCarriesExactRepeatDaysOnlyForSet` (validation of the same method) | Delete this method (upstream owns `ClockHandoff` validation; host test `test/clock-native-contract.test.mjs` covers the contract) | Low |
| 2 | 21-23 | C3 / T7 | Private `js`, `until`, `click` | Shared driver helpers | Low |
| 3 | 27-29 | C3 / C5 | AlarmClock interception monitor (4th copy) | `ClockIntents.intercept` | Low |
| 4 | 34 | D8 / D9 | Nested ternary `action.equals("Set alarm")?"set":action.equals("Show alarms")?"show":…` | Iterate a `Map.of("Set alarm","set",…)` / String[][] pairs | None |
| 5 | 11 | A7 | Unused `import java.util.ArrayList;` | Delete | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`/`until`/`click` | helper | 21-23 | ~77 copies | `WebViewTestDriver`/`AppNavigation` |
| anonymous `ActivityMonitor` | helper | 27-29 | ClockAgentReview:47, ClockRepeatDays:42, RealClock | `ClockIntents.intercept` |

## Proposed end state
Keep the UI journey test (it is the only device check that the Calendar Clock panel builds the four intents and writes
the encrypted receipt). Delete the upstream-validation method and the unused import; use shared helpers and a label->action
table. Estimated 46 -> ~32 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes ClockHandoff`; `node --test test/android-instrumentation-runner.test.mjs` (gate text pin must still match).
