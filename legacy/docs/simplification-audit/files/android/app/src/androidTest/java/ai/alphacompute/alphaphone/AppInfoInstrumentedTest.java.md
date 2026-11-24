# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AppInfoInstrumentedTest.java
- Lines: 61 | Role: `ElizaSystem.openAppInfo` opens Settings' App details for exactly the named package and refuses absent/foreign/self/malformed input. | Verdict: SIMPLIFY (minor)
- Importers: none. Text/path pins: `test/aosp-image-capability.test.mjs:156` regex `/com\.android\.settings/` on this file (T1); `scripts/android-instrumentation.ts:246` (`secondaryUser: true`); `test/android-instrumentation-runner.test.mjs:177-180` (secondary-user class list).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-31 | C3 | `call(input)` promise-to-JSON poll; same shape as ActionJournal:25-37, Assistant:21-30, BrowserPageQuestion:76-81. | `WebViewTestDriver.call(...)`. | Low. |
| 2 | 32-35 | C3 | Private `shell()` copy (10 copies in androidTest). | Shared `shell()`. | None. |
| 3 | 36, 53-55 | C4 | `foregroundPackage()` + poll — second "which app is in front" mechanism next to AccessibilityLifecycle's dumpsys regex. | Shared `awaitForeground(pkg, ms)` (see AccessibilityLifecycle #3). | Low. |
| 4 | 44 | C3 | Bridge-ready poll `Boolean(window.Capacitor?.Plugins?.ElizaSystem)` — same as Assistant:22. | `WebViewTestDriver.awaitPlugin(name)` or fold into `call`. | None. |
| 5 | — | T1 | `test/aosp-image-capability.test.mjs:156` only asserts the file contains `com.android.settings` ("App info has a device test"). | Delete that assertion; the registry + runner test already prove the class exists and runs. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 27-31 | ActionJournal:25, Assistant:21, BrowserPageQuestion:76 | `WebViewTestDriver.call` |
| `shell` | helper | 32-35 | 9 other `shell(` copies | shared `shell()` |
| `foregroundPackage` | helper | 36 | AccessibilityLifecycle:53-62 | `AccessibilityFixture.awaitForeground` |

## Proposed end state
~50 lines: one @Test using shared call/shell/foreground helpers; refusal codes and copy (`not-installed`, `profile-unavailable`, "Choose an installed app") asserted unchanged.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes AppInfo` (secondary-user phase). Host: `node --test test/aosp-image-capability.test.mjs test/android-instrumentation-runner.test.mjs`.
