# android/app/src/androidTest/java/ai/alphacompute/alphaphone/UiDispatchInstrumentedTest.java
- Lines: 27 | Role: tests the test helper `TestUiDispatch` on a disposable `HandlerThread`: an expired queued effect never runs; a started one is reported unknown. | Verdict: DELETE
- Importers: none. Registry `UiDispatch: { args: { uiDispatch: "1" } }` (`scripts/android-instrumentation.ts:257`). Not in any CI lane. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-27 | T5 | "Real Android queue regression" of `TestUiDispatch`/`DispatchClaim`, both androidTest-only helpers; no product code runs. The brief: delete tests of test machinery unless they gate a release — this one is in no lane. | Delete the file and the `UiDispatch` registry entry. | None for product. |
| 2 | 16, 22 | D8 | Whole fixture on single lines. | (moot) | — |

## Local types and helpers
None.

## Proposed end state
Deleted (−27 lines, −1 registry line). `TestUiDispatch.postForFixture` then has one caller (`WorkflowNoticeTapInstrumentedTest`).

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; androidTest compile.
