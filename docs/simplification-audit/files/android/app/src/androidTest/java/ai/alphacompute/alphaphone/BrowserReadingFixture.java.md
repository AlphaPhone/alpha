# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserReadingFixture.java
- Lines: 120 | Role: shared helper for the reading journeys (synthetic article in a real HTTPS child, loopback paired-speech server, native review dialog, cleanup chain) | Verdict: SIMPLIFY
- Importers: 4 test classes — `BrowserReadingInstrumentedTest`, `BrowserSensitiveReadingInstrumentedTest`, `BrowserIsolatedReadingInstrumentedTest`, `BrowserUnsupportedReadingInstrumentedTest` (git grep `BrowserReadingFixture`). Text/path pins: none by name; `test/browser-tab-host-identity.test.mjs:60-73` regex-scans every androidTest `.java` (forbids `new BrowserReading(`, `AlphaBrowserPlugin.class.getDeclared*`) — keep the reflection on `BrowserTabHostPlugin`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25, 61, 65, 78, 92, 116 | C3 / NEW (test class used as a library) | `final BrowserFlowInstrumentedTest child=new BrowserFlowInstrumentedTest();` — a whole @Test class is instantiated only to call its package-private `child(js)`; 11 androidTest files do the same (`grep -l "new BrowserFlowInstrumentedTest()"` = 11). | Move `child()` and `diagnostics()` from `BrowserFlowInstrumentedTest` into a new `BrowserTestDriver` (androidTest) and call `BrowserTestDriver.child(...)`. | Low |
| 2 | 28-33 | C3 | `js()` wrapper over `WebViewTestDriver.evaluate`, `resumedActivity()` (same 3-line loop in `BrowserReadingLiveInstrumentedTest:20-23`, `BrowserPageQuestionInstrumentedTest`), `waitFor()` 300×100 ms poll (13+ private copies repo-wide). | `resumedActivity()` → `BrowserTestDriver.resumedMain()`; `waitFor` → `WebViewTestDriver.until(condition, timeoutMs)`; drop `js()` and call `WebViewTestDriver.evaluate` directly. | Low |
| 3 | 39 | C3 | `dialog()` reflects `BrowserTabHostPlugin.reading` then `BrowserReviewedReading.dialog`; the same two-hop reflection exists in 5 files (`BrowserReadingLive:26`, `BrowserSensitiveReading:76`, `BrowserReadingNavigation:93`, `BrowserPageQuestion`). | One `BrowserTestDriver.readingDialog()` returning the dialog or null; `dialog()` here becomes the waiting wrapper. | Low |
| 4 | 40-47, 48, 67-70, 76-82, 94-96 | A3 / P15 (owner) | Loopback `Server` speaks `PairedSpeechContract.TTS_PATH` with bearer `browser-reading-synthetic`; `writeSpeechToken` writes a `remote:<origin>` paired-agent credential slot; `synthesizeBrowserReading` is the paired path (`apps/app/src/runtime/paired-voice.ts:42`). PRD line 17 says "No hosted-agent pairing". The production read-aloud path is the resident `synthesizeLocalBrowserReading` (`native-reading-voice.ts:24`). | If the owner removes paired agents (research android P15): delete `Server`, `wav()`, `binding()`, `writeSpeechToken`, the `slot` cleanup branch, and switch `cancelThenApproveOnce` to the resident binding already used by `BrowserReadingInstrumentedTest.residentReadingTokenIsSingleUseAndBound`. ~35 lines. | Medium (product scope) |
| 5 | 44 | D8 | One 1,000+ character line holds the whole HTTP server loop (header read, auth check, header parse twice, body read, response). | Split into `readHeaders`, `header(name)`, `respond` (same shape as `BrowserWebFeaturesInstrumentedTest.respond:123`). | Low |
| 6 | 57-59 | C3 | Address-bar entry snippet `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(...)` — this setter snippet appears in 27 androidTest files; the full `address(url)` routine in 7. | `BrowserTestDriver.address(url)` + `WebViewTestDriver.setValue(selector,value)`. | Low |
| 7 | 99-102, 109-119 | KEEP | `attemptCleanup` / `cleanup` collect suppressed failures correctly; this is the one good cleanup chain in the Browser tests (BrowserShare, BrowserReadingLive hand-roll the same). | Promote `attemptCleanup` to `BrowserTestDriver` so BrowserShare/BrowserReadingLive reuse it. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `resumedActivity` | helper | 29-32 | `BrowserReadingLiveInstrumentedTest:20-23`, `BrowserPageQuestionInstrumentedTest` | `BrowserTestDriver.resumedMain()` |
| `waitFor` | helper | 33 | ~13 private `waitFor/until/ready` copies (BrowserShare:16, BrowserSignins:33, BrowserWebFeatures:51, Calendar*:until) | `WebViewTestDriver.until(cond, ms)` |
| `text(View)` | helper | 37 | `BrowserFlowInstrumentedTest.containsNativeText` | `BrowserTestDriver` |
| `dialog()` | helper | 39 | 5 files (see #3) | `BrowserTestDriver.readingDialog()` |
| `Server` | class | 42-47 | `BrowserWebFeaturesInstrumentedTest` loopback server (123-160) | delete with P15, else keep here |
| `Cleanup` / `attemptCleanup` | interface/helper | 99-102 | hand-rolled in BrowserShare:38-44, BrowserReadingLive:53-56, Calendar*:finally blocks | `BrowserTestDriver` (or a `TestCleanup` util) |

## Proposed end state
Reading-only fixture: `ARTICLE/SECRET/MARKUP/SENSITIVE_PAGES`, `openExample`, `installBody`, `captureArgs`,
`sensitivePagesRefused`, `cancelThenApproveOnce`, `cleanup`. Generic helpers (child, resumedMain, until, address,
readingDialog, attemptCleanup) move to `BrowserTestDriver`/`WebViewTestDriver`. If paired agents are removed, the
loopback speech server and token slot go and approval is checked on the resident binding. Est. ~85 lines (≈55 with P15).

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes BrowserReading,BrowserSensitiveReading,BrowserIsolatedReading`
(CI lane `ci-reading-test-mocks` in `scripts/ci/emulator-suite.ts:38`), plus `node --test test/browser-tab-host-identity.test.mjs`.
