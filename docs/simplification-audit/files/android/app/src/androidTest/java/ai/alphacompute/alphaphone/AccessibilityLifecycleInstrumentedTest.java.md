# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AccessibilityLifecycleInstrumentedTest.java
- Lines: 218 | Role: AP-15 at 200% font across repeated HOME, rotation and process death (phased). | Verdict: SIMPLIFY
- Importers: `AccessibilityHomeRoleInstrumentedTest.java:62,65` calls `pressHome()` and `oneMainActivity()`.
- Text/path pins: `scripts/android-instrumentation.ts:173` (`requiresTestMocksBuild`); `scripts/test-native-restart.ts:95` (`testClass: "AccessibilityLifecycleInstrumentedTest"`, method `processRestartPhase`, gate `accessibilityPhase`); `test/accessibility-coverage.test.mjs:177-178` (regex `AccessibilityViewsInstrumentedTest\.VIEWS`); `test/android-instrumentation-runner.test.mjs:156` (needs `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text); `scripts/owner/emulator-campaign-check.ts:46,59`; comment refs in RotationInstrumentedTest:20,40, TalkBackOrder:20, `test/browser/accessibility-lifecycle.spec.ts:10`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-52 | C3 | `js`, `until(code,tenths)`, `open(view)` identical to AccessibilityHomeRole:29-33 and AccessibilityInstrumentedTest:48-50. | `WebViewTestDriver.until` + `AppNavigation.open(view)`. | Low. |
| 2 | 63-85 | D3 | `pressHome()` and `oneMainActivity()` are package-private statics another test class calls. | Move to `AccessibilityFixture` (shared by HomeRole). | Low. |
| 3 | 53-62 | C4 | `foreground()` parses `dumpsys activity activities` with a regex and polls it; `AppInfoInstrumentedTest.foregroundPackage` (:36) reads the active window package through UiAutomation instead. Two mechanisms for "which app is in front". | Keep one: `UiAutomation.getRootInActiveWindow().getPackageName()` polled, in `AccessibilityFixture.awaitForeground(pkg)`. | Medium: verify HOME transition timing on emulator. |
| 4 | 86-87 | C6 | `SCALE` expression duplicate (see HomeRole #2). | `AccessibilityFixture.TEXT_SCALE`. | Low. |
| 5 | 95-96 | B4 | `assumeViews` wrapper redundant with `AppNavigation.assumeNoRequiredSignIn` (already returns on test-mocks). Text pin for `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` also satisfied by line 216. | Delete wrapper, call AppNavigation directly. | Low. |
| 6 | 215-217 | C3/C6 | `requiredSignIn(context)` duplicates AccessibilityInstrumentedTest:73-76 and AppNavigation:56-61 with the `"cloud:production"` literal. | `AppNavigation.requiredSignIn()`. | Low. |
| 7 | 103, 107, 130, 137, 141, 163, 182-184, 210 | C3 | Font-scale save/set/restore via `AccessibilityViewsInstrumentedTest.fontScale` repeated per test. | `AccessibilityFixture.withFontScale("2.0", body)`. | Low. |
| 8 | 152 | T8 | `SystemClock.sleep(400)` after rotation reached and view selected. | Wait on `RotationInstrumentedTest.clipped()` being stable or drop. | Low-medium. |
| 9 | 178-213 | — | Process-death phases (prepare/verify/cleanup) driven by `scripts/test-native-restart.ts accessibility`; fixture JSON `accessibility-restart-fixture.json` written and read only here. | KEEP (real process-death coverage, AP-15). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `TOP` | const (regex) | 46 | none; replace mechanism (#3) | delete |
| `js`/`until`/`open` | helper | 47-52 | AccessibilityHomeRole:29-33, AccessibilityInstrumentedTest:48-50, AccessibilityViews:67,89 | `WebViewTestDriver.until`, `AppNavigation.open` |
| `foreground`/`awaitForeground` | helper | 53-62 | AppInfo:36 `foregroundPackage` | `AccessibilityFixture.awaitForeground` |
| `pressHome` | helper | 63-68 | none (HomeRole calls it) | `AccessibilityFixture` |
| `oneMainActivity` | helper | 70-85 | none (HomeRole calls it) | `AccessibilityFixture` |
| `SCALE`/`scale()` | const/helper | 86-87 | 4 other files | `AccessibilityFixture.TEXT_SCALE` |
| `start()` | helper | 88-93 | same steps in HomeRole:54-57, AccessibilityViews:120-127 | `AccessibilityFixture.startAtDoubleFont()` |
| `requiredSignIn` | helper | 215-217 | AccessibilityInstrumentedTest:73, AppNavigation:56 | `AppNavigation.requiredSignIn()` |

## Proposed end state
~180 lines: three @Test methods (repeated HOME, rotation, process-death phases) on `AccessibilityFixture` helpers; no static helpers exported to other tests; no dumpsys regex; no fixed sleep.

## Verification
`--test-mocks --classes AccessibilityLifecycle` on both variants; `node scripts/test-native-restart.ts accessibility` (process-death phases); host `node --test test/accessibility-coverage.test.mjs test/android-instrumentation-runner.test.mjs` (pins).
