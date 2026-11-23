# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AndroidShade.java
- Lines: 174 | Role: test helper that observes, opens, collapses and taps rows of Android's own notification shade via UiAutomation. | Verdict: SIMPLIFY
- Importers: AccessibilityInstrumentedTest (ALPHA_SHADE_ABSENT, useAutomationFlags, waitOpen, collapse, COUNT_PULLS, pullOnHome, pullCount), NotificationsInstrumentedTest (openWithoutAlpha, waitText, tap, isOpen, collapse), NotificationChannelsInstrumentedTest (openWithoutAlpha, waitText). Comment refs: RealClockInstrumentedTest.
- Text/path pins: none (no test or manifest reads this file).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-30 | D3 | `private static volatile int automationFlags` + `useAutomationFlags(int)` is mutable global state set and reset by AccessibilityInstrumentedTest:130,185. The same "use the caller's flags" need is already met elsewhere by reading `androidx.test.uiautomator.Configurator.getInstance().getUiAutomationFlags()` (AccessibilityViews:41, AccessibilityLifecycle:64), which AccessibilityInstrumentedTest already sets. | `ui()` returns `getUiAutomation(Configurator.getInstance().getUiAutomationFlags())`; delete `automationFlags`/`useAutomationFlags` and both calls. Callers that never touch Configurator get flags 0, as today. | Low. |
| 2 | 17, 33-47, 95-121, 133-142 | A7 (visibility) | `SYSTEM_UI`, `ROW_ID`, `text`, `ownRow`, `holdsRows`, `waitClosed` have no caller outside this file (grep `AndroidShade.<name>`: 0 hits). | Make them `private`. | None. |
| 3 | 36-47, 108-112 | C3 | Three copies of the deadline poll (`waitOpen`, `waitClosed`, `waitText`). | One `private static <T> T poll(long ms, long step, Supplier<T>)`. | None. |
| 4 | 95-106, 133-142 | C3 | Two bounded BFS walks over `AccessibilityNodeInfo` children; BrowserDownloadInstrumentedTest:35-45,46-57,62-70 has three more and AppInfo/TalkBackOrder walk trees too. | One `AccessibilityNodes.find(root, limit, predicate)` helper in androidTest. | Low. |
| 5 | 65 | C3 | `executeShellCommand("cmd statusbar collapse")` drained inline — another shell-read copy. | Shared `shell()` (see AccessibilityInstrumentedTest report). | None. |
| 6 | 84-86 | T8 | `pullOnHome` sleeps 500 ms then 1500 ms per attempt (5 attempts) before checking the touch counter. | Poll `pullCount("touches") > before` for up to 1.5 s instead of sleeping. | Low-medium. |
| 7 | 10-14, 55-60, 69-74, 147-156 | A8 | Long measurement narratives ("measured on the API 36 emulator...", "1 of 3 runs with Alpha as HOME"). The why is useful; the run history is not. | Trim each to the rule and its reason in one sentence. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `automationFlags`/`useAutomationFlags` | state/helper | 28-29 | Configurator flags (AccessibilityViews:41, Lifecycle:64) | delete |
| `text(value)` BFS | helper | 95-106 | BrowserDownload `nativeNode` :35-45, `nativeClickDescription` :62-70 | `AccessibilityNodes.find` |
| `waitOpen`/`waitClosed`/`waitText` | helper | 36-47, 108-112 | ~180 poll loops | private `poll` |
| `COUNT_PULLS` | const (JS) | 75-77 | monkey-patches `Capacitor.nativePromise` like BrowserPageQuestion:148-153 `recordNativeCalls` | keep (T6 note: wraps product bridge in-page) |

## Proposed end state
~150 lines: no static mutable flags, private internals, one poll helper, one BFS helper (shared), shorter comments.

## Verification
Accessibility (test-mocks pair, launcher pull), Notifications and NotificationChannels instrumentation classes on both variants.
