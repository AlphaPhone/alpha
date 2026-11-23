# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserFlowInstrumentedTest.java
- Lines: 456 | Role: Browser journeys (upload, stop/reload, HTTP error retry, HTTPS history/tabs/private isolation, search, same-document navigation, autofill eligibility) AND, de facto, the shared child-WebView driver for 12 other classes. | Verdict: SPLIT (driver → new `BrowserTestDriver.java`; journeys stay)
- Importers: `new BrowserFlowInstrumentedTest()` in BrowserContinuity:20, BrowserDownload:23, BrowserPageQuestion:57, BrowserReadingFixture:25, BrowserReadingLive:18, BrowserShare:14, BrowserSignins:31, BrowserWebFeatures:40, PasswordBrowserFill:39, ConnectionChooser:20, DeviceAction:109 (via BrowserSensitiveReading through `reading.child`) — 91 `browser.child(` calls, 7 `diagnostics()` calls.
- Text/path pins: `scripts/android-instrumentation.ts:155` (`liveArgs: {browserFlowLive:"1"}`) and `DEFAULT_CLASSES` (:353-354); `test/ci-emulator-evidence.test.mjs:250-258` (default class: at least one @Test body not gated by `assumeTrue(...ELIZA_DEV_ALLOW_TEST_MOCKS)`); `test/instrumentation-outcome-status.test.mjs:4,19` (status key `browserFlowSearch` = `results|provider-check`, line 324); `test/android-instrumentation-runner.test.mjs:642-643` (BrowserPageQuestion/J05 contact no public host — not this file).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-73, 98-105, 251-273, 335-358 | D3/D7 | A JUnit test class is instantiated as a helper library by 12 classes (`browser.child(...)`, `browser.diagnostics()`); its `@Before requireSignedInViews` does not run in that use, so callers silently depend on package-private methods of a test. | Move `collect`, `child`, `diagnostics`, `host`, `until`, `click`, `address`, `presentedTab`, `presentedTabObject`, `tabState`, `childUrl`, `requestedAddress`, `field` into `BrowserTestDriver` (static or instance); update the 12 callers (`browser.child` → `BrowserTestDriver.child`). | Medium: many files, mechanical. |
| 2 | 145-154, 173-181, 195-203 | C3/C5 | Three hand-written loopback HTTP servers in this file (plus BrowserDownload and 9 more files with `ServerSocket(0`). Each swallows handler errors (`catch(Exception error){if(server.isClosed())return;}`, `catch(Exception expectedOnCancellation){}`). | `LoopbackHttpFixture` with routes, a hold latch and first-error capture. | Low-medium. |
| 3 | 75, 126, 157, 164, 188, 207, 211 | C3 | Seven `boolean x=false;for(i<150){if("true".equals(child(...))){x=true;break;}sleep}` loops. | `BrowserTestDriver.untilChild(predicate, message)`. | None. |
| 4 | 263-268 | A8/D11 | Misplaced javadoc: the block describing `submittedSearchUsesRealProviderAndRejectsExecutableAddress` ("By default this asserts what the product submits...") sits above `requestedAddress()`, followed by that method's own javadoc. | Move the comment onto the @Test at :279. | None. |
| 5 | 102, 335-354 | NEW (reflection into upstream internals) | Reads private `presentedId`, `tabs`, tab fields `web/url/committed/loading/error/autofillEnabled` and invokes private `canAutofill` on upstream `BrowserTabHostPlugin`. | `BrowserHostProbe` (one place for all Browser* reflection) or an upstream test accessor. | Medium. |
| 6 | 380-396 | C3 | Intercepting WebViewClient that forwards 12 callbacks to `original`; near-copies in BrowserPageQuestion:127-139, BrowserExternalHandoff:62-71, BrowserCookiePolicy:50-58. | `BrowserTestDriver.serveFromMemory(web, Map<String,String> routes)` returning AutoCloseable (BrowserPageQuestion.Pages is the best existing instance). | Low. |
| 7 | 46 | A6-like | `child()` silently clicks the startup-permission "Not now" when no page is shown — a side effect inside a read helper. Callers already call `AppNavigation.declineStartupAccess()` after opening Browser. | Remove the click from `child()`; rely on `declineStartupAccess()`. | Medium: check emulator timing (the panel can open late). |
| 8 | 141, 170, 194 | — | Three loopback methods are test-mocks only; the default flag-off run executes the HTTPS and search methods (pin #ci-emulator-evidence keeps that true). | Keep gating text exactly. | — |
| 9 | 117, 122 | C3 | Two "is MainActivity in stage X" polls posting raw `Handler` runnables; `BoundedActivityScenario.main` exists for this. | Use `BoundedActivityScenario.main`. | None. |
| 10 | 160 | T8 | `SystemClock.sleep(1000)` before asserting the presented tab survives stop. | Poll for 1 s that `presentedTab()` stays equal (keeps intent, no blind sleep) — or keep with comment. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host/until/click/address` | helper | 23-32 | BrowserContinuity:21-32, BrowserDownload:24-33, BrowserDialogLifecycle:16-19, BrowserPageQuestion:171-176 | `BrowserTestDriver` |
| `collect` | helper | 33 | same view-tree walk inside `child`, `diagnostics`, `tapChildInput`, `childUrl`, `requestedAddress`, `chooserInactiveBoundaries` (6 inline uses) | `BrowserTestDriver.shownChild(main)` |
| `child(js)` | helper | 34-48 | BrowserCookiePolicy `evaluate(WebView,..)`, Assistant `evalAssist` | `BrowserTestDriver.child` |
| `diagnostics()` | helper | 50-73 | none | `BrowserTestDriver` |
| `presentedTab`/`presentedTabObject`/`tabState`/`field` | helper | 98-105, 335-358 | BrowserContinuity snapshot, BrowserPageQuestion Pages, BrowserExternalHandoff get/set | `BrowserHostProbe` |
| `containsNativeText`/`nativeText` | helper | 78-81, 137-139 | AndroidShade.text, BrowserDownload.nativeNode (accessibility-tree variant) | keep (View-tree variant) in driver |
| loopback servers | inline | 145-203 | 12 files | `LoopbackHttpFixture` |
| `SAME`/`sameDocumentPage` | const/helper | 330-334 | BrowserPageQuestion `BASE`/`page()` | keep |

## Proposed end state
`BrowserFlowInstrumentedTest` ~300 lines holding only its 9 @Test methods; new `BrowserTestDriver.java` ~110 lines (child/host/address/click/until/diagnostics/serveFromMemory), `BrowserHostProbe.java` ~50 lines (all reflection), `LoopbackHttpFixture.java` ~60 lines replacing ~12 inline servers. Gate texts (`browserFlowLive`, test-mocks assumeTrue) and status key `browserFlowSearch` unchanged.

## Verification
Default flag-off run (`--classes BrowserFlow`, offline) and `--test-mocks --classes BrowserFlow`, `--live-network` once; then every class that used `browser.child` (BrowserContinuity, BrowserDownload, BrowserPageQuestion, BrowserReading*, BrowserShare, BrowserSignins, BrowserWebFeatures, PasswordBrowserFill, ConnectionChooser). Host: `node --test test/ci-emulator-evidence.test.mjs test/instrumentation-outcome-status.test.mjs test/android-instrumentation-runner.test.mjs`.
