# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CombinedAgentRestartInstrumentedTest.java
- Lines: 156 | Role: the CombinedAgent journey split into prepare / verify-after-both-processes-restart / cleanup phases with a checkpoint file. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:330` `NOT_RUN_BY_A_RUNNER.CombinedAgentRestart` ("compiled, never executed"); `test/android-instrumentation-runner.test.mjs:203-205` (entry must match an existing class). Fixture `combined-agent-restart-fixture.json`: no writer in the repo.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | P20 / A7 | "compiled, never executed" per the runner itself | Delete file + `NOT_RUN_BY_A_RUNNER.CombinedAgentRestart` | None |
| 2 | 1-82 | C5 / T4 | Verbatim copy of `CombinedAgentInstrumentedTest.java:1-82` (diff: class name only); 83-108 repeat its test body with two extra assertions | Removed | — |
| 3 | whole file | A3 (P15) | Paired remote agent (`remote:`+ORIGIN) — PRD excludes hosted-agent pairing | Removed | — |
| 4 | 89 | A7 | `boolean … paired=false` assigned (99) but never read | Removed | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| all helpers 20-82 | helpers | 20-82 | identical in CombinedAgentInstrumentedTest | deleted |
| `stateFile`/`loadCheckpoint` | helper | 123-124 | checkpoint helpers in CrossAppNotificationsRestart:15-23 | deleted |

## Proposed end state
File deleted with its NOT_RUN entry. 156 -> 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
