# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AccessibilityInstrumentedTest.java
- Lines: 188 | Role: 200% font checks of Home/Settings/composer, Android shade entry points, and the P-43 required sign-in page. | Verdict: SIMPLIFY
- Importers: none (leaf). Named in comments of AndroidShade.java:25, TalkBackOrder.java:19,26, AccessibilityViews:27,33.
- Text/path pins: `scripts/android-instrumentation.ts:170` (registry, no gates); `scripts/owner/emulator-campaign-check.ts:46,57`. No source-text test reads this file.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43-47 | C3 | Own `automation()` + `shell()` (ParcelFileDescriptor read) duplicating `AccessibilityViewsInstrumentedTest.shell` (:40-45, which already reads Configurator flags) and 9 other `shell(` copies in androidTest. Both tests set `configurator.setUiAutomationFlags(AUTOMATION_FLAGS)` before any shell call (lines 98, 126), so the shared Configurator-based shell gives the same connection. | Use the shared `AccessibilityFixture.shell` (moved from AccessibilityViews). | Low. |
| 2 | 99, 102, 115 / 131, 134, 183 | C3 | Font-scale save/set/restore written twice in this file (`shell("settings put system font_scale 2.0")`, restore with `previous.isEmpty()||"null".equals(previous)?"1.0":previous`), and without `--user` while `AccessibilityViewsInstrumentedTest.fontScale` (:47-51) is per-user (secondary-user safe). | Use `AccessibilityFixture.fontScale/restoreFontScale`; one try/finally helper `withFontScale("2.0", flags, body)` for both tests. | Low; behaviour change is only that the setting becomes per-user (correct). |
| 3 | 73-76 | C3/C6 | `requiredSignIn()` re-derives P-43 (`readCredentialSlot("cloud:production")==null`), same predicate as `AppNavigation.assumeNoRequiredSignIn` (AppNavigation.java:56-61) and `AccessibilityLifecycleInstrumentedTest.requiredSignIn` (:215-217). `"cloud:production"` literal appears in 16 androidTest files. | Add `AppNavigation.requiredSignIn()` (boolean) and use it in all three; one `CLOUD_SLOT` constant. | Low. |
| 4 | 108-109, 142-143 | C6 | `--alpha-text-scale` expression written 4× in this file. | `AccessibilityFixture.TEXT_SCALE` + `measuredScale()` helper. | Low. |
| 5 | 49 | C3 | `until(code)` poll with fail — another copy. | `WebViewTestDriver.until`. | Low. |
| 6 | 24, 145-146, 150 | A8 | History in comments: "(#416, #417 ...)", "Round 7 saw the Home card title printed over...". | Keep the rule, drop issue numbers and round narration. | None. |
| 7 | 160 | T8 | `SystemClock.sleep(500)` after shade collapse with no condition. | Wait on the condition the next assertion needs (Alpha window front + page idle), or drop: line 159 already waits for Alpha in front. | Low-medium (flake). |
| 8 | 96-98, 124-126, 116, 184 | C3 | Configurator flag save/restore duplicated in both tests. | Fold into the `withFontScale` helper (#2). | Low. |
| 9 | 130, 185 | D3 | `AndroidShade.useAutomationFlags(AUTOMATION_FLAGS)` / `(0)` sets static mutable state on a helper. If AndroidShade reads `Configurator.getInstance().getUiAutomationFlags()` (as AccessibilityViews.automation and AccessibilityLifecycle.pressHome already do), both calls disappear. | See AndroidShade report #1. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `AUTOMATION_FLAGS` | const | 43 | AndroidShade.automationFlags (state) | `AccessibilityFixture` |
| `automation()` / `shell()` | helper | 44-47 | AccessibilityViews:40-45, AppInfo:32-35, SettingsFlow:22, SettingsRoles:32, SettingsSystemFacts:22, PasswordVaultFixture:32, CameraFlow:129, CameraScan:88, PasswordBrowserFill:62 | `AccessibilityFixture.shell` (or `WebViewTestDriver.shell`) |
| `js`, `until`, `open` | helper | 48-50 | AccessibilityLifecycle:47-52 (`open` identical) | `WebViewTestDriver` / `AppNavigation.open(view)` |
| `unquote` | helper | 56 | `new JSONTokener(x).nextValue()` inline in ActionJournal:33, AppInfo:29, BrowserPageQuestion:80,179 etc. | `WebViewTestDriver.unquote` |
| `requiredSignIn` | helper | 73-76 | AccessibilityLifecycle:215-217, AppNavigation:56-61 | `AppNavigation.requiredSignIn()` |
| `HOME_TEXT_OVERLAP`, `HOME_LABELS_SPLIT`, `SIGN_IN_UNREACHABLE` | const (JS) | 62-86 | none | keep |

## Proposed end state
~150 lines: two @Test methods sharing one `withFontScale` setup, shared shell/fontScale/TEXT_SCALE from `AccessibilityFixture`, `AppNavigation.requiredSignIn()`, no history comments, no fixed sleep, no AndroidShade flag juggling.

## Verification
Flag-off signed-out default run (requiredCloudSignInAtDoubleFontScale) and test-mocks pair (homeShadeSettingsAndComposerAtDoubleFontScale) on both variants: `npm run test:android:instrumentation -- --owned-emulator --classes Accessibility` and with `--test-mocks`. Emulator evidence only.
