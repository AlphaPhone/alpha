# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ChatContinuityInstrumentedTest.java
- Lines: 174 | Role: unsent chat draft survives real IME, KEYCODE_BACK steps (full -> sheet -> rest), HOME and activity recreation. | Verdict: SIMPLIFY (move shared statics out)
- Importers: `alphaIsHome(Context)` is called by `DailyAppsInstrumentedTest:309`, `AccessibilityHomeRoleInstrumentedTest`, `AccessibilityLifecycleInstrumentedTest`, `LauncherHomeInstrumentedTest` (4 call sites); `showKeyboard`/`assertComposer`/`assertNotPosted` are package-visible statics.
  Text/path pins: `scripts/android-instrumentation.ts:233` (registry note), `scripts/owner/emulator-campaign-check.ts:42,57`, `test/android-instrumentation-runner.test.mjs:551` (`ChatContinuity` must be in the registry without a campaign).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 99-103 | NEW (test class used as helper library) | `static boolean alphaIsHome(Context)` is a RoleManager query used by four other test classes | Move to `AppNavigation.alphaIsHome` (non-test helper) and update the 4 callers | Low |
| 2 | 31-46 | C3 / T7 | Private `eval`, `until(condition,message)`, `click(label)` copies | Shared `WebViewTestDriver.until` / `AppNavigation.clickLabel` | Low |
| 3 | 47-53 | C3 | `pressKey(int)` builds and injects KeyEvents through UiAutomation; `WebViewTestDriver.pressBack()` (49) and `AccessibilityLifecycleInstrumentedTest.pressHome` do the same | One `WebViewTestDriver.pressKey(code)`; `pressBack()` delegates | Low |
| 4 | 115 | C3 | React value-setter for the composer (also in CameraScan:95, DeviceAction:32, Combined*:32) | `AppNavigation.setValue` | Low |
| 5 | 152-159 | D9 / T8 | Three hand-rolled lifecycle poll loops `for (int i = 0; i < 100 && scenario.getState() != …; i++) SystemClock.sleep(100);` (also DailyApps:316,321) | `BoundedActivityScenario.awaitState(state, ms)` | Low |
| 6 | 19-25, 91-98 | A8 | Javadoc narrates the emulator campaign of 2026-10-14 ("In the emulator campaign of 2026-10-14 the launcher run then took the HOME branch…") | Keep the one-sentence reason (resolver is hidden by package visibility); drop the history | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DRAFT`, `CONVERSATION` | const | 28-29 | `[data-alpha-layer="conversation"]` selector also in DeviceAction:112, Combined*:99 | `AppNavigation.CONVERSATION` |
| `chatState()` | helper | 37-40 | none | keep |
| `pressKey` | helper | 47-53 | `WebViewTestDriver.pressBack`, `AccessibilityLifecycleInstrumentedTest.pressHome` | `WebViewTestDriver.pressKey` |
| `imeVisible`/`awaitIme`/`showKeyboard` | helper | 54-77 | none found | keep (or `ImeDriver` if a second user appears) |
| `assertComposer`/`assertNotPosted` | helper | 79-90 | none | keep |
| `alphaIsHome` | helper | 99-103 | used by 4 other classes | `AppNavigation` |

## Proposed end state
One @Test kept unchanged in behaviour. `alphaIsHome` and `pressKey` move to shared drivers; private poll/click helpers
are replaced by shared ones; lifecycle waits use one `awaitState`. Estimated 174 -> ~140 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes ChatContinuity` on both variants (launcher with
`--home-role`, standalone), plus the four classes that call `alphaIsHome`; `node --test test/android-instrumentation-runner.test.mjs test/owner-emulator-campaign-check.test.mjs`.
