# android/app/src/androidTest/java/ai/alphacompute/alphaphone/StartupReadinessInstrumentedTest.java
- Lines: 23 | Role: after live mode, reloads the WebView and requires `StartupDocumentProbe` to reach live readiness on the replacement document. | Verdict: KEEP
- Importers: none. Registry `StartupReadiness: { args: { startupReadiness: "1" } }` and `DEFAULT_CLASSES` (`scripts/android-instrumentation.ts:148,354`) → CI instrumentation lane. Text/path pins: `test/android-instrumentation-runner.test.mjs:66-67,92-94` (class name, `startupReadiness` arg).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T9 | Opt-in gate `startupReadiness=1` although the runner always passes it (default class); the gate only matters for `--all`. | Keep (cheap), or drop the gate and the registry arg together. | None. |
| 2 | 11 | — | `BoundedActivityScenario` variable `activity` unused except for try-with-resources. | Fine. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged (~23 lines).

## Verification
CI instrumentation lane default classes.
