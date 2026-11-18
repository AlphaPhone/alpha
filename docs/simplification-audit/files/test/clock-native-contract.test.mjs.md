# test/clock-native-contract.test.mjs
- Lines: 43 | Kind: JVM integration (test 1: compiles the real upstream `ClockDays.java` with `test/fixtures/ClockContractTest.java`, feeds outputs of the real upstream `validateClockOperation`) + source-text (test 2: 9 regexes over `DailyAppsPlugin.java`, upstream `ClockHandoff.java`, `ClockAgentReview.java`) | Verdict: KEEP test 1 (move to the Gradle JVM lane or the upstream suite); DELETE test 2
- Covers: repeat days the upstream contract admits (unordered, empty) are normalised natively, never refused; plugin wiring passes `days` through to the shared launch. Duplicates: `test/clock-repeat-days.test.mjs` (TS side of the same contract), `test/browser/agent-clock-handoff.spec.ts`, `clock-repeat.production.spec.ts`, androidTest `ClockHandoffInstrumentedTest.java`. Callers/importers: `npm test` glob; `test/fixtures/ClockContractTest.java` (only importer: this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-24 | - | Cross-language contract check between upstream TS validator and upstream Java normaliser. Both are upstream code (`vendor/eliza`), so this is an upstream test (T5). | Propose upstream as a follow-up (D14); keep here until it lands. | Low |
| 2 | 26-43 | T1 | Regexes pin exact Java statements (`call.getString("timeZone"),ai.eliza.plugins.system.clock.ClockDays.strict(...)`), plus ENOENT checks that Alpha keeps no copy of two files. | Delete; `ClockHandoffInstrumentedTest` and the Clock journey prove the wiring. | Low |

## Proposed end state
Only the JVM contract case remains (or moves upstream with its fixture). Plugin wiring is proven by the Android
instrumentation test and `journeys/reminders.spec.ts` (Clock handoff).
