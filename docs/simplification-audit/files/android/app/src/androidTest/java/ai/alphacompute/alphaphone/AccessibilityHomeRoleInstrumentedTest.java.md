# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AccessibilityHomeRoleInstrumentedTest.java
- Lines: 77 | Role: launcher variant holding HOME at 200% font: HOME from every view lands on accessible Alpha Home. | Verdict: SIMPLIFY
- Importers: none (leaf test). Calls statics of three other test classes (`AccessibilityViewsInstrumentedTest.fontScale/VIEWS/FOCUS_PROBLEM/restoreFontScale`, `AccessibilityLifecycleInstrumentedTest.pressHome/oneMainActivity`, `ChatContinuityInstrumentedTest.alphaIsHome`).
- Text/path pins: `scripts/android-instrumentation.ts:174` (`homeRole:"held"`, `requiresTestMocksBuild`, `grant:["CAMERA"]`); `test/android-instrumentation-runner.test.mjs:151-160` requires the source to contain `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` and `BuildConfig.IS_LAUNCHER` and NOT `add-role-holder|remove-role-holder|set-home-activity`; `test/accessibility-coverage.test.mjs:177-178` regex-requires `AccessibilityViewsInstrumentedTest\.VIEWS` in this file; `scripts/owner/emulator-campaign-check.ts:46,60`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-33 | C3 | Private `js()` and `until(code, tenths)` poll copied verbatim in AccessibilityLifecycle:47-51 and AccessibilityViews:67,89-92 (and ~180 `js/eval/until/ready/waitFor` copies across androidTest). | Add `WebViewTestDriver.until(String js, int tenths)` (boolean) and use it; delete the local pair. | Low. |
| 2 | 34 | C6 | `SCALE` = `Number(getComputedStyle(...).getPropertyValue('--alpha-text-scale'))` repeated in AccessibilityLifecycle:86, AccessibilityViews:125, AccessibilityInstrumentedTest:108,109,142,143. | One `TEXT_SCALE` constant in a shared `AccessibilityFixture`. | Low. |
| 3 | 40-41 | B4 | `assumeViews` = `if (!BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS) AppNavigation.assumeNoRequiredSignIn(journey)` but `AppNavigation.assumeNoRequiredSignIn` (AppNavigation.java:57) already returns when the flag is set. Same wrapper in AccessibilityLifecycle:96 and AccessibilityViews:99. | Call `AppNavigation.assumeNoRequiredSignIn` directly. The runner-test pin needs the text `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` in the file (currently satisfied by this javadoc/wrapper); keep the javadoc line or change the pin in `test/android-instrumentation-runner.test.mjs:156`. | Low; pin-sensitive. |
| 4 | 47-74 | D3 | Test classes used as a helper library: statics reached on `AccessibilityViewsInstrumentedTest`, `AccessibilityLifecycleInstrumentedTest`, `ChatContinuityInstrumentedTest`. | Move `VIEWS`, `fontScale`, `restoreFontScale`, `FOCUS_PROBLEM`, `pressHome`, `oneMainActivity`, `alphaIsHome` into a non-test `AccessibilityFixture` (or `HomeRole`) class; update the regex in `test/accessibility-coverage.test.mjs:178` (or delete that T1 assertion). | Medium: cross-file + text pin. |
| 5 | 25 | A8 | Javadoc carries a usage command line; fine, but "Emulator evidence, not boot-time HOME..." duplicates the registry note at `scripts/android-instrumentation.ts:174`. | Keep one sentence. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js` | helper | 29 | AccessibilityLifecycle:47, AccessibilityViews:67, AccessibilityInstrumentedTest:48, ~180 more in androidTest | `WebViewTestDriver.evaluate` directly |
| `until(code,tenths)` | helper | 30-33 | AccessibilityLifecycle:48-51, AccessibilityViews:89-92 (identical) | `WebViewTestDriver.until` |
| `SCALE` | const | 34 | AccessibilityLifecycle:86, AccessibilityViews:125, AccessibilityInstrumentedTest:108,142 | `AccessibilityFixture.TEXT_SCALE` |
| `TEST_NAVIGATION_SETTLED` | const | 37 | literal `window.__alphaTestNavigation?.status==='complete'` in BrowserFlow:110, BrowserDialogLifecycle:19, BrowserPageQuestion:167,419, AllViewAgentContext:113, BrowserContinuity:147 | `AppNavigation.SETTLED` |
| `assumeViews` | helper | 41 | AccessibilityLifecycle:96, AccessibilityViews:99 | delete; `AppNavigation.assumeNoRequiredSignIn` |

## Proposed end state
~60 lines: one @Test using `AccessibilityFixture` (font scale, VIEWS, pressHome, oneMainActivity, FOCUS_PROBLEM, TEXT_SCALE) and `WebViewTestDriver.until`, `AppNavigation.SETTLED`. No calls into other test classes.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --variants launcher --home-role --test-mocks --classes AccessibilityHomeRole` (emulator HOME-role evidence only). Host: `node --test test/android-instrumentation-runner.test.mjs test/accessibility-coverage.test.mjs`.
