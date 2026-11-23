# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BoundedActivityScenario.java
- Lines: 144 | Role: ActivityScenario replacement with bounded waits (launch, recreate, close) and the launcher single-MainActivity hand-off adoption. | Verdict: SIMPLIFY
- Importers: very wide (`launch` in most classes; `main(...)` 34 files/107 hits; `recreate()`/`getState()` ~56/38 files; `launchRetainingBrowserSession` 4 files; `launch(Intent)` 6 files; `diagnosticCheckpoint` 1 external caller: ReminderOneOffInstrumentedTest:48).
- Text/path pins: `ActivityInstanceSelectionInstrumentedTest` reflects on private members `observer`, `activity`, `stage`, `recreating` and the private constructor (delete that test, see its report). No source-text test.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-62, 116, 129-139 | A4/B5 | Diagnostics are gated on instrumentation arg `lifecycleDiagnostics=1`; whole-repo grep finds no script, workflow or test that passes `lifecycleDiagnostics` (only this file). So `lifecycleEvents`, `record`, `events`, `diagnoseClose` (stack dump + SIGQUIT), `diagnosticCheckpoint` (window snapshot thread), `finishState`, and the `captured` branch in `close()` never run. | Delete lines 27-62, the `record(...)` call (68), `diagnosticCheckpoint` call (116), `finishState` writes (133) and the capture branch (135-138). Delete the two `scenario.diagnosticCheckpoint(...)` calls in `ReminderOneOffInstrumentedTest.java:48`. | Low (dead under every runner). |
| 2 | 124-127 | — | `getState()` maps `Stage` to `Lifecycle.State` for ActivityScenario-like callers (38 files). | Keep. | — |
| 3 | 66-84 | D8 | Observer lambda body is un-indented relative to its braces. | Formatter pass. | None. |
| 4 | 86-91 | — | `main(Runnable)` posts to the UI thread through `TestUiDispatch` with a bounded await — shared and correct. | Keep. | — |
| 5 | 92-101 | — | `launch` clears `AlphaBrowserStores.session` for MainActivity by product decision; `launchRetainingBrowserSession` opts out (4 restart tests). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `lifecycleEvents`/`record`/`events`/`diagnoseClose`/`diagnosticCheckpoint`/`finishState` | state/helpers | 27-62 | none | delete |
| `main(Runnable)` | helper | 86-91 | `WebViewTestDriver.withActivity`, `TestUiDispatch.post` | keep |

## Proposed end state
~100 lines: launch / launchRetainingBrowserSession / launch(Intent) / recreate / getState / close / main, plus the hand-off adoption rule in the observer. No diagnostic plumbing.

## Verification
Any instrumentation run; specifically Shell, StartupReadiness, ReminderOneOff (recreate), launcher-variant classes (hand-off adoption), and the restart campaigns (`scripts/test-native-restart.ts`).
