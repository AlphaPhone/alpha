# android/app/src/testMocks/androidTest/java/ai/alphacompute/alphaphone/BrowserAutofillInstrumentedTest.java
- Lines: 220 | Role: test-mocks instrumentation journey: real framework Autofill fills only a visible, committed HTTPS child WebView; overlay cancels the suggestion; cleartext pages never reach the provider. | Verdict: SIMPLIFY
- Importers: none (test). Runner: `scripts/android-instrumentation.ts:160` (`BrowserAutofill: { testMocks: true }`), `scripts/owner/emulator-campaign-check.ts:45,59` (h31-test-mocks), `test/android-instrumentation-runner.test.mjs:87,132` (rejects it without `--test-mocks`; scans this root). Source set: `consumer-host.json:95`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | NEW (test class as helper library) | `private final BrowserFlowInstrumentedTest browser=new BrowserFlowInstrumentedTest();` to reach its package-private `child(js)` and `diagnostics()`; the same construction appears in 12 androidTest files (BrowserReadingLive, DeviceAction, BrowserReadingFixture, BrowserWebFeatures, BrowserShare, BrowserDownload, ConnectionChooser, BrowserSignins, BrowserPageQuestion, PasswordBrowserFill, BrowserContinuity, this). | Extract a `BrowserTestDriver` (androidTest) holding `child`, `diagnostics`, `click`, `address`, `visibleChild`, `childReady`, `waitHost`; use it here. | Low |
| 2 | 23-57 | C3 / T7 | Private copies of helpers that exist near-verbatim elsewhere: `waitHost`/`click`/`address`/`childReady`/`collect`/`visibleChild`/`shell` in `PasswordBrowserFillInstrumentedTest.java:45-87`, `BrowserSigninsInstrumentedTest.java:35-49`, `BrowserWebFeaturesInstrumentedTest.java:53-111`, `BrowserFlowInstrumentedTest.java:25-33`; bounded `shell(command)` in 10 androidTest files. `host(js)` is a one-line alias of `WebViewTestDriver.evaluate`. | Delete lines 23-57 here after the driver extraction (~35 lines). | Low |
| 3 | 116-131 | T6 / T5 | `tabAutofillEnabled` reflects into upstream `BrowserTabHostPlugin` private fields `tabs`, `web`, `autofillEnabled` (`getDeclaredField(...).setAccessible(true)`) — tests upstream internals and breaks on any upstream rename. | Ask upstream for a test-visible accessor (or `BrowserAutofillEligibility` query), or assert only observable outcomes (suggestion present/absent, provider counters) which the test already checks. | Medium (eligibility semantics for attested fields) |
| 4 | 166-173 | B4 | After `if(popup==null){ … fail(...); }`, line 173 `assertNotNull("Real suggestion exists before overlay cycle "+cycle,popup);` can never fail. | Delete line 173. | None |
| 5 | 159 | D11 | `int previousRequests=SyntheticAutofillService.accepted.get()` holds the accepted count (and `requests` is a different counter). | Rename `previousAccepted`. | None |
| 6 | 181-188 | C3 | Inline loopback HTTP server (`new java.net.ServerSocket(0,8,…)` + executor + hand-written response); 12 androidTest files open their own `ServerSocket(0`. | Shared `LoopbackHttpFixture.serve(html)` (AutoCloseable) in androidTest. | Low |
| 7 | 196 | T8 | `form();tapUsername();SystemClock.sleep(5000);` fixed wait for a negative assertion. Documented (193-194) and inherent to "nothing arrives"; keep but it is 5 s per run. | Keep; optionally reduce once provider latency is measured. | — |
| 8 | 25, 48, 84, 102, 112, 171 | D8 | Dense one-line loops/conditions (112: nested ternary over eligibility constants; 102: whole form HTML in one string). Fully-qualified `java.util.concurrent.atomic.AtomicInteger/AtomicBoolean` (109, 168-169) although `AtomicReference` is imported. | Formatter; import the atomics; split 112 into a named `effectiveEligibility(child)` helper. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host(js)` | helper | 23 | `WebViewTestDriver.evaluate` (alias) | delete; call driver |
| `waitHost` | helper | 24-26 | `PasswordBrowserFillInstrumentedTest.java:45`; 13 private `waitFor(` copies (android research P20) | `BrowserTestDriver` |
| `click(label)` | helper | 27-30 | `PasswordBrowserFill:46`, `BrowserSignins:35`, `BrowserWebFeatures:53`, `BrowserFlow:25` | `BrowserTestDriver` |
| `address(value)` | helper | 31-37 | `PasswordBrowserFill:50`, `BrowserSignins:37`, `BrowserWebFeatures:55`, `BrowserFlow:26` | `BrowserTestDriver` |
| `collect` / `visibleChild` | helper | 38-46 | `PasswordBrowserFill:86-87`, `BrowserSignins:49`, `BrowserWebFeatures:111`, `BrowserFlow:33` | `BrowserTestDriver` |
| `childReady` | helper | 47-49 | `PasswordBrowserFill:57` | `BrowserTestDriver` |
| `shell(command)` | helper | 50-57 | `PasswordBrowserFill:62` + 9 more `String shell(` in androidTest | `DeviceShell.run` (androidTest util) |
| `tapUsername` / `form` / `suggestion` / `suggestionGone` / `selectSuggestion` / `eligibility` | helper | 58-115 | `PasswordBrowserFill:180` has its own `form(boolean)` | keep local (autofill-specific) |
| inline HTTP server | helper | 181-188 | 12 androidTest files with `ServerSocket(0` | `LoopbackHttpFixture` |

## Proposed end state
~150 lines: the single `@Test` plus autofill-specific helpers (`tapUsername`, `form`, `suggestion`, `suggestionGone`, `selectSuggestion`, `eligibility`), using a shared `BrowserTestDriver`, `DeviceShell` and `LoopbackHttpFixture`; no reflection into upstream once an accessor exists; dead `assertNotNull` removed.

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes BrowserAutofill` on an emulator with a test-mocks debug build (this is the only runner; CI does not run it unless the h31-test-mocks campaign is invoked). Re-run the other browser instrumentation classes that adopt the extracted driver.
