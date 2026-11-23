# android/app/src/androidTest/java/ai/alphacompute/alphaphone/RotationInstrumentedTest.java
- Lines: 103 | Role: rotates Home (with a composer draft) and the required sign-in page; landscape on standalone, portrait-lock on launcher; checks no primary control is clipped. Exposes `CLIPPED`, `clipped()`, `orientation()`, `awaitOrientation()` to `AccessibilityLifecycleInstrumentedTest`. | Verdict: SIMPLIFY
- Importers: `AccessibilityLifecycleInstrumentedTest:149,153` (`awaitOrientation`, `clipped`), comment ref :36. Registry `Rotation: {}` (`scripts/android-instrumentation.ts:178`). Text/path pins: `test/android-instrumentation-runner.test.mjs:29` uses the class name as fixture data only; comments in `test/browser/home-landscape.spec.ts:3`, `test/launcher-orientation.test.mjs:6`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-27 | C3 / T7 | `js()` and `until()` are the 71st copy of the poll-a-JS-condition helper (`for(int i=0;i<200;i++){if("true".equals(js("Boolean("+code+")")))…`). | Add `WebViewTestDriver.until(String condition,String label)` and delete the local copies (here and in ~70 files). | None. |
| 2 | 39-45 | D8 / D11 | `CLIPPED` is a 2,000-char JS program in a Java string and is shared with AccessibilityLifecycle; the browser lane has its own geometry audit (`test/browser/accessibility-audit.ts`). | Move the script to an androidTest asset (`assets/clipping-check.js`) read by a `LayoutChecks.clipped()` helper used by both classes. | Low. |
| 3 | 47-60 vs 92-97 | C3 | The launcher-vs-standalone rotate-and-check sequence is written twice (`rotateAndCheck` and inline in `requiredSignInSurvivesRotation`). | Make `rotateAndCheck(device, readyCondition)` take the "page still there" predicate and use it in both tests. | None. |
| 4 | 71 | C3 | Composer value set via `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,…)` — same snippet in 21 androidTest files. | `AppNavigation.setComposer(text)`. | None. |
| 5 | 49, 94 | T8 | `SystemClock.sleep(1500)` before asserting the launcher did **not** rotate. | Acceptable negative wait; keep but name the constant. | None. |
| 6 | 86 | C6 | `readCredentialSlot("cloud:production")` literal (32× in main, research P6). | Use the owning constant once one exists. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`, `until` | helper | 26-27 | ~70 androidTest copies | `WebViewTestDriver` |
| `orientation`, `awaitOrientation` | helper | 28-29 | used by AccessibilityLifecycle | `LayoutChecks` (or keep here) |
| `CLIPPED`, `clipped()` | const/helper | 39-45 | browser `accessibility-audit.ts` geometry audit (different implementation) | asset + `LayoutChecks` |
| `DRAFT` | const | 25 | SettingsRoles `DRAFT` | keep |

## Proposed end state
Two tests over one `rotateAndCheck`, shared poller/composer setter from the driver, clipping script in an asset. ~70 lines.

## Verification
`node scripts/android-instrumentation.ts --classes Rotation` on both variants (flag-off pair for the sign-in method, test-mocks pair
for Home); `AccessibilityLifecycle` must still compile and run (`--test-mocks --classes AccessibilityLifecycle`).
