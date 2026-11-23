# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PasswordBrowserFillInstrumentedTest.java
- Lines: 291 | Role: real WebView autofill boundary for the integrated password provider: top-level form refused (or offered when engine-attested `BrowserLoginFields` is supported) and a cross-origin iframe never offered; real touches, real IME commits | Verdict: KEEP (SIMPLIFY helpers)
- Importers: none. Uses `BrowserFlowInstrumentedTest` **as a helper object** (`new BrowserFlowInstrumentedTest()`, l.39) for `child(js)` / `diagnostics()`; upstream `BrowserLoginFields`, `BrowserTabHostPlugin` (private field `autofillCallback` via reflection, l.227), `PasswordVaultAccess`.
  Text/path pins: `scripts/android-instrumentation.ts:208` (`PasswordBrowserFill: {}`); `scripts/owner/emulator-campaign-check.ts:45` (Browser group); `test/support/login-surfaces.mjs:40` (describes this test's expectations in prose); runner test `:647-655` (no forbidden labels).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39, 57, 104, 142-148, 173-174 | NEW (test class as helper library) / C4 | `private final BrowserFlowInstrumentedTest browser=new BrowserFlowInstrumentedTest();` — 11 androidTest classes instantiate another @Test class to reuse `child()`/`diagnostics()` (BrowserContinuity, BrowserPageQuestion, BrowserReadingFixture, BrowserShare, BrowserWebFeatures, BrowserDownload, BrowserReadingLive, BrowserSignins, ConnectionChooser, DeviceAction, this). | Move `child`/`diagnostics` to a `BrowserChildDriver` utility (non-test class) and import it. | Low. |
| 2 | 62-68 | C3 | `shell(command)` bounded read of `executeShellCommand`; `PasswordVaultFixture.shell` (l.32-36) and `AccessibilityViewsInstrumentedTest`, `AccessibilityInstrumentedTest`, `AppInfoInstrumentedTest` define their own (25 androidTest files call `executeShellCommand`). | One `DeviceShell.run(cmd)` (bounded) in androidTest. | None. |
| 3 | 69-84 | C3 | Cross-window accessibility BFS (`roots`, `find(Match)`, `withText`) — same idea as `PdfViewerInstrumentedTest.find` (l.16-26), `NotificationAccessTestDriver.access` (l.42-43), `NotificationChannelsInstrumentedTest.toggle` (l.22-23). | `A11yTree.find(predicate, allWindows)` shared helper; `interface Match` → `java.util.function.Predicate<AccessibilityNodeInfo>`. | Low. |
| 4 | 75, 92 | C1 | Local functional interfaces `Match`, `DocumentPoint` re-declare `Predicate` / `Callable<double[]>`. | Use JDK types. | None. |
| 5 | 182, 258 | D8 | Form HTML injected as 1,000+-character string literals. | Keep content; split into named constants. | None. |
| 6 | 249, 269 | T8 | Fixed `SystemClock.sleep(2500)` / `sleep(3000)` to prove absence of a Save sheet / offer. | Keep (negative proof), name the constants. | — |
| 7 | 223, 261-262 | KEEP | Loads `https://example.com/` and frames `https://example.org` (live network). Registry note does not say so; the default run of PasswordBrowserFill needs network. | Owner: document network need in the registry note or serve the pages from a loopback fixture. | Medium (flaky offline). |
| 8 | 103-119 | KEEP | `screenPoint` comment documents a real race (IME resize); dense but justified. | Formatter only. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OFFER` | const | 38 | `PasswordVaultFillInstrumentedTest.FILL_OFFER` (l.42), same text | shared `PasswordUi.FILL_OFFER` |
| `host`/`waitHost`/`click`/`address` | helper | 44-56 | `BrowserFlowInstrumentedTest`, other Browser* tests (address bar typing) | `BrowserChildDriver` / `WebViewTestDriver` |
| `childReady`/`page` | helper | 57-58 | Browser* classes | `BrowserChildDriver` |
| `shell` | helper | 62-68 | PasswordVaultFixture:32-36, 3 more | `DeviceShell` |
| `roots`/`find`/`withText`/`Match` | helper/interface | 69-84 | PdfViewer:16-26, NotificationAccessTestDriver:42-43, NotificationChannels:22-23 | `A11yTree` |
| `collect`/`visibleChild` | helper | 86-91 | Browser* tests (child WebView lookup) | `BrowserChildDriver` |
| `DocumentPoint` | interface | 92 | none | `Callable<double[]>` |

## Proposed end state
Same single test; generic shell/a11y/browser-child helpers move to shared androidTest utilities; the class no longer
instantiates another test class. Estimated 291 → ~240 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes PasswordBrowserFill` (emulator only, network);
`node scripts/owner/emulator-campaign-check.ts` Browser group.
