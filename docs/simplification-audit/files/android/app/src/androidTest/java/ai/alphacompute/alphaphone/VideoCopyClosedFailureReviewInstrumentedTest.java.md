# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VideoCopyClosedFailureReviewInstrumentedTest.java
- Lines: 53 | Role: operator-only "recovery entry": finds the registered `AlphaPhotosPlugin` in a resumed MainActivity and calls the package-private `preserveClosedVideoCopy(operationId, recordSHA256, call)` with a fake `PluginCall`, for one reviewed failed video copy. | Verdict: DELETE (with the main-code hook; owner decision)
- Importers: none. Listed in `NOT_RUN_BY_A_RUNNER` (`scripts/android-instrumentation.ts:337`: "native-only preservation operator … Never a generic or bulk campaign"). Args `videoCopyPreservation`, `approvedMainLifecycle`, `operationId`, `recordSHA256`, `expectedOwnerUID` are set by nothing in the repo (grep). Text/path pins: the `NOT_RUN_BY_A_RUNNER` entry (runner test fails if it outlives the class).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-53 | A7 / T9 | A support/operator tool packaged as a JUnit test, run by no runner and documented as manual. Its only effect is to call production code. | Delete the file and its `NOT_RUN_BY_A_RUNNER` entry. | Loses a manual recovery procedure; owner must confirm no pilot device needs it. |
| 2 | 46 | D7 / A7 | The only caller of main `AlphaPhotosPlugin.preserveClosedVideoCopy` (`AlphaPhotosPlugin.java:30-31`, comment "Native-only reviewed recovery; deliberately absent from the Capacitor/JS API"). grep: no other caller in apps/android/scripts/test. | Delete the main method together with this test (cross-file). The upstream `preserveClosedFailure` stays upstream. | Same as 1. |
| 3 | 25-30 | C1 | Local `PluginCall` subclass capturing resolve/reject — VideoCopy-style fake calls also appear in other androidTest classes (e.g. hosted results lifecycle). | (moot if deleted) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Result extends PluginCall` | type | 25-30 | other fake `PluginCall` captures in androidTest | delete |

## Proposed end state
Deleted (−53), plus `AlphaPhotosPlugin.java:30-31` (−2) and one `NOT_RUN_BY_A_RUNNER` line.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; `npm run android:build:local` (main + androidTest compile);
`test/native-plugin-teardown.test.mjs` / `test/context-selection.test.mjs` read `AlphaPhotosPlugin.java` text — re-run them after the main edit.
