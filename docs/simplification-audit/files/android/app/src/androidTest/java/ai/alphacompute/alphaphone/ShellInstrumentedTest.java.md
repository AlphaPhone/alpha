# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ShellInstrumentedTest.java
- Lines: 104 | Role: smoke: bundled renderer mounts offline and three `ElizaSystem` bridge calls answer; HOME qualification follows the variant; signed-in composer stays above the real IME; `ElizaSystem.launchApp` resumes Android Settings. | Verdict: SIMPLIFY
- Importers: none. Registry `Shell: {}` and `DEFAULT_CLASSES` (`scripts/android-instrumentation.ts:147,354`) → runs in the CI `instrumentation` emulator lane (`scripts/ci/emulator-suite.ts`). Text/path pins: `test/android-instrumentation-runner.test.mjs:30,66-67,344,353,469,511` (class name as fixture data and default list).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-18 | D4 | `evaluate(scenario, js)` ignores `scenario` and forwards to `WebViewTestDriver.evaluate`. | Call the driver directly. | None. |
| 2 | 22-26, 30, 49, 53, 62-69 | C3 | Five hand-written poll loops (`for(int i=0;i<100;i++){…SystemClock.sleep(100);}`). | Shared `until` / `poll`. | None. |
| 3 | 28-32 | C3 | Promise → `document.body.dataset.nativeResult` → poll — the ~30th promise helper. | `WebViewTestDriver.awaitPromise`. | None. |
| 4 | 76-100 | C3 | Inline `dumpsys activity activities` read + Settings-task detection (11 files scan this dump). | `TestShell.awaitTopResumedPackage("com.android.settings")` keeping the task-visibility rule. | Low. |
| 5 | 9-11, 8 | NEW (dead imports) | `CountDownLatch`, `TimeUnit`, `AtomicReference`, `JSONObject` imported, unused. | Delete. | None. |
| 6 | 55 | C3 | Composer setter snippet (21 copies). | `AppNavigation.setComposer`. | None. |
| 7 | 35, 38 | C6 | `"ai.alphacompute.alphaphone"` literal twice. | `BuildConfig.APPLICATION_ID`. | None. |
| 8 | 56, 71 | T8 | Fixed `sleep(200)`, `sleep(500)` before layout reads. | Wait on `visualViewport.height` change instead. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `evaluate(scenario,js)` | helper | 16-18 | `SelectedDocumentInstrumentedTest.eval:33` (same unused param) | delete |

## Proposed end state
~70 lines: two tests over shared poll/promise/shell helpers. Class/method names unchanged (default-class list and runner test).

## Verification
`npm run test:android:instrumentation` default classes (both variants) — the CI instrumentation lane.
