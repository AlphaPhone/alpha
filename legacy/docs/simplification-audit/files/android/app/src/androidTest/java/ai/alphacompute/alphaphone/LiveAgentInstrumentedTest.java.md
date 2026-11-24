# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LiveAgentInstrumentedTest.java
- Lines: 128 | Role: opt-in (`-e liveAgent true`) real-provider journeys: the model proposes a note / reminder and the user approves it. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:333` (`NOT_RUN_BY_A_RUNNER.LiveAgent`); `test/android-instrumentation-runner.test.mjs` (consistency of that list); comment in `PrototypeFlowInstrumentedTest.java:18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18, 45, 95 | T9/A7 | Listed in `NOT_RUN_BY_A_RUNNER`: "needs a running loopback host with a real provider key, adb reverse and a provisioned bearer (liveAgent=true)". No script passes `liveAgent` (grep over scripts/.github: 0 hits outside the runner list). | Delete the class, the `NOT_RUN_BY_A_RUNNER` entry, and the reference in `PrototypeFlowInstrumentedTest.java:18`. | Low |
| 2 | 2, 123-124 | T5 | Imports upstream test accessor `ai.eliza.plugins.reminders.ReminderTestAccess` (package-private upstream internals, android research §5). | Gone with the file. | - |
| 3 | 21-23 | D4 | `eval(scenario, js)` ignores `scenario` and forwards to `NotesSecureFixture.evaluate`. | Gone with the file. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/waitFor/click/navigate` | helper | 21-40 | many | delete |
| `nativeReminders/findReminder` | helper | 85-93 | `Reminder*InstrumentedTest` | delete |

## Proposed end state
File deleted (0 lines). If a live-model approval journey is wanted, it belongs in the resident campaign (`scripts/android-resident-instrumentation.ts`), which already provisions a provider key.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; androidTest compile.
