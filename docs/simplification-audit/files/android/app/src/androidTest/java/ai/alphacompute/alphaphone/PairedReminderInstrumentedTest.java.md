# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedReminderInstrumentedTest.java
- Lines: 84 | Role: paired-host agent proposes five reminder actions (read/update/snooze/complete/cancel) for a selected reminder; approval, native journal and upstream reminder receipt are checked | Verdict: DELETE
- Importers: none. Uses upstream `ai.eliza.plugins.reminders.ReminderTestAccess`. Text/path pins: `scripts/android-instrumentation.ts:335` `NOT_RUN_BY_A_RUNNER.PairedReminder` ("needs a real paired host (pairedReminder=1); no runner pairs one"); reachability test `test/android-instrumentation-runner.test.mjs:186-216`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A7 / P20 / A3 | Never run by any runner; reads `files/paired-reminder-fixture.json` that no script writes (grep: only this file); paired host contradicts PRD. | Delete the file and `NOT_RUN_BY_A_RUNNER.PairedReminder`. | None. |
| 2 | 25-26 | A7 | `voice()`, `field()` unused (1 occurrence each). | Gone with #1. | — |
| 3 | 19, 27-30 | C3 | `canonical`, `hash`, `arrayHash`, `credential` identical to PairedMaps:18,27-30. | Gone with #1. | — |
| 4 | 47-50 | C3 | "Local development agent" connect + History restore routine (PairedMaps:66-71). | Gone with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `canonical`/`hash`/`arrayHash`/`credential` | helper | 19, 27-30 | PairedMaps:18,27-30 | delete |
| `until`/`click`/`activity`/`store`/`voice`/`field`/`open`/`send` | helper | 21-32 | PairedMaps:21-37 | delete |
| `ORIGIN` | const | 20 | PairedMaps:20 | delete |

## Proposed end state
File deleted (0 lines), with its `NOT_RUN_BY_A_RUNNER` entry.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
