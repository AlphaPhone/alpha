# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentModelResponseContract.java
- Lines: 27 | Role: validates one recorded resident model call: non-empty text, or a normalized `tool-calls` result with unique ids/names/object arguments. | Verdict: MERGE into `android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentTestFixture.java`
- Importers: 1 — `ResidentServiceInstrumentedTest.java:79` (`ResidentModelResponseContract.valid(c)`), plus its own unit test `ResidentModelResponseContractTest`. Text/path pins: `scripts/android-instrumentation.ts:340` names only the Test class.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-27 | D7 / T5 | A one-method class split out so a unit test can test it; the only production-of-test caller is ResidentService's trace check. | Move `valid(JSONObject)` into `ResidentTestFixture` as `static boolean validModelCall(...)`; delete this file and `ResidentModelResponseContractTest`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `valid(JSONObject)` | helper | 10-26 | none | `ResidentTestFixture.validModelCall` |

## Proposed end state
File deleted; ~17 lines added to `ResidentTestFixture`. 0 lines here.

## Verification
`ResidentServiceInstrumentedTest` via `scripts/android-resident-instrumentation.ts`.
