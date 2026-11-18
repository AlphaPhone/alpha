# test/fixtures/ClockContractTest.java
- Lines: 41 | Kind: Java fixture, unit of upstream `ai.eliza.plugins.system.clock.ClockDays` (staged unmodified from the pin) with cases produced by upstream `validateClockOperation` | Verdict: DELETE (with `test/clock-native-contract.test.mjs`; upstream follow-up)
- Covers: strict and agent repeat-day admission for alarms, and that every day list upstream's validator admits normalises without refusal. Duplicates: upstream plugin-native-system tests (the fixture itself says the shared intents and receiver are tested upstream). Callers/importers: `test/clock-native-contract.test.mjs:23`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | Both sides of the contract (`ClockDays` and `validateClockOperation`) are upstream code; Alpha changes neither. | Move to upstream plugin-native-system as a cross-language contract test. | Low |
| 2 | 15 | A8 | "exactly as before" narrates history. | Goes with the file. | Low |

## Proposed end state
Fixture and importer deleted; upstream follow-up "ClockDays agrees with validateClockOperation". Alarm creation stays
covered by the clock journey and the Clock hand-off instrumentation (`ClockHandoffInstrumentedTest`).
