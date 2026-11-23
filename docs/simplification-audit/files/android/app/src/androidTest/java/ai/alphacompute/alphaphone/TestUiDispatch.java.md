# android/app/src/androidTest/java/ai/alphacompute/alphaphone/TestUiDispatch.java
- Lines: 38 | Role: posts a test action to the main (or given) looper with a deadline-bound `DispatchClaim`, so an expired queued action never runs and a started one is reported "result unknown"; dumps a redacted queue summary on timeout. | Verdict: KEEP (minor simplify)
- Importers: 5 — `BoundedActivityScenario:88`, `WebViewTestDriver:19,81`, `BrowserFlowInstrumentedTest:36`, `WorkflowNoticeTapInstrumentedTest:26`, `UiDispatchInstrumentedTest:18,22`. Depends on `DispatchClaim` (androidTest, 11 lines, only user). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | A7 | `started()` has no caller (grep: only the declaration and `DispatchClaim.started` it forwards to). | Delete `started()` here and `DispatchClaim.started()`. | None. |
| 2 | 10 | C4 | `DispatchClaim` is a separate 11-line file used only here. | Nest it as a private static class. | None. |
| 3 | 19 | D7 | `postForFixture` exists so `UiDispatchInstrumentedTest` (a test of this helper) and `WorkflowNoticeTap` can pass their own handler. | Keep one factory `post(Handler, action, timeoutMs)`; `post(action)` delegates. | None. |
| 4 | 34-35 | B1 | `catch(RuntimeException error){return "unavailable";}` around `Looper.dump`. | Keep (diagnostic only). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DispatchClaim` (separate file) | class | 10 | upstream main has `DeletionDispatchClaim` (unrelated: deletion journal) | nested here |
| `queueSummary` | helper | 31-37 | none | keep |

## Proposed end state
~40 lines including the nested claim; `DispatchClaim.java` deleted (−11).

## Verification
Every instrumentation class (all UI dispatch goes through it via `WebViewTestDriver`/`BoundedActivityScenario`); compile in `npm run android:build:local`.
