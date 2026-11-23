# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentModelResponseContractTest.java
- Lines: 33 | Role: JUnit unit test of the test helper `ResidentModelResponseContract.valid` (packaged as instrumentation). | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:340` `NOT_RUN_BY_A_RUNNER.ResidentModelResponseContractTest` ("plain contract test without the InstrumentedTest suffix; it runs under --all ..."); must be removed together (`test/android-instrumentation-runner.test.mjs:204`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-33 | T5 / T3 | Tests a test helper, not product behaviour; runs only under `--all`. | Delete with the registry exclusion entry; the helper's behaviour is exercised by ResidentService's real trace assertion. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `tool()` / `response()` | helper | 9-14 | none | deleted |

## Proposed end state
File removed. 0 lines.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
