# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserContinuityInstrumentedTest.java
- Lines: 221 | Role: tabs/bookmarks/history survive app navigation, Activity recreation, host reload, mock round-trip and process death (phased). | Verdict: SIMPLIFY
- Importers: none (uses `new BrowserFlowInstrumentedTest()` for `child()`/`diagnostics()`).
- Text/path pins: `scripts/android-instrumentation.ts:157` (`requiresTestMocksBuild`, note), `:350` comment; `scripts/test-native-restart.ts:29` (`testClass: "BrowserContinuityInstrumentedTest"`, `method: "bookmarkProcessRestartPhase"`, `gate: "bookmarkPhase"`) and `test/android-instrumentation-runner.test.mjs:128` regex-pins that block; runner test requires `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text (line 131); `test/fixtures/isolated-native-campaign.mjs:18`; storage names `alpha-browser-bookmarks`, `alpha-browser-session`, `browser-bookmark-restart-fixture`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-32 | C3 | `host`, `ready`, `button`, `click`, `app`, `address` are copies of BrowserFlow:23-32, BrowserDownload:24-33, BrowserDialogLifecycle:16-19 (address-bar typing is identical in three files; BrowserPageQuestion:171-176 has a fourth, more robust variant). | Extract `BrowserTestDriver` (see BrowserFlow report) and call it. | Low. |
| 2 | 75-87, 99-101 | NEW (reflection into upstream internals) | Reads private fields of upstream `ai.eliza.plugins.browsersurface.BrowserTabHostPlugin` (`namespace`, `tabs`, `retiredProfiles`) and of its private tab class (`profile`, `frame`) by name. A rename upstream breaks these tests silently at runtime. Same technique in BrowserFlow:102,335-354, BrowserCookiePolicy:20-36, BrowserDialogLifecycle:23-24, BrowserExternalHandoff:28-30,59-104, BrowserPageQuestion:97-98,123-125, BrowserSensitiveReading, BrowserSignins, BrowserWebFeatures. | Ask upstream for a package-visible test accessor (`BrowserTabHostPlugin.TestView` returning namespace/tab profiles/presentedId/retired state), or collect all reflection in one `BrowserHostProbe` class so a rename is fixed once. | Medium: upstream PR per AGENTS.md. |
| 3 | 41, 179, 211 | C3 | `ephemeralOnly(names)` defined (:41) and used once (:211) while :179 inlines the same loop. | Use `ephemeralOnly` at :179 too. | None. |
| 4 | 147-153 | C3 | Mock-mode enter/exit sequence (Settings → Agent connection → Mock mode → Enter mock mode → banner exit) duplicated in BrowserDialogLifecycle:42-46. | `AppNavigation.enterMockMode()` / `exitMockMode()`. | Low. |
| 5 | 22, 35 | C3 | Fail messages call `browser.diagnostics()`; same pattern in Download/PageQuestion. | Driver's `until` appends diagnostics itself. | None. |
| 6 | 105-121 | — | Independent storage witness reopening a retired WebView profile — real deletion evidence; keep. | Keep. | — |
| 7 | 43-74, 130-156 | D8 | Lines of 300-600 characters with 5-10 statements. | Formatter pass. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host/ready/button/click/app/address` | helper | 21-32 | BrowserFlow:23-32, BrowserDownload:24-33, BrowserDialogLifecycle:16-19, BrowserPageQuestion:171-176 | `BrowserTestDriver` |
| `page(url)` | helper | 33-36 | BrowserFlow:74-77 `page(suffix)` (example.com load wait) | `BrowserTestDriver.awaitChild(predicate)` |
| `savedTabs`, `saved` | helper | 37-42 | none | keep local |
| `BrowserSnapshot` + `snapshot()` | type/helper | 75-87 | reflection in 9 Browser* files | `BrowserHostProbe` |
| `ephemeralOnly` | helper | 41 | inline loop :179 | keep, reuse |

## Proposed end state
~185 lines: three @Test methods unchanged in behaviour (including the `bookmarkPhase` gate text and method name the runner pins), using `BrowserTestDriver`, `BrowserHostProbe` and `AppNavigation.enterMockMode/exitMockMode`.

## Verification
`--test-mocks --classes BrowserContinuity` (both variants); `node scripts/test-native-restart.ts bookmark`; host `node --test test/android-instrumentation-runner.test.mjs`.
