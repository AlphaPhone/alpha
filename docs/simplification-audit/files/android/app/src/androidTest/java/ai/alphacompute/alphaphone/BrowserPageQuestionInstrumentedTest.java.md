# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserPageQuestionInstrumentedTest.java
- Lines: 451 | Role: J05 native boundary — page excerpt bound to the committed document, sensitive pages refused, excerpt reaches only the composer, web-source note reopens its address. | Verdict: SIMPLIFY (and absorb JourneyJ05)
- Importers: `JourneyJ05InstrumentedTest.java:32-49` uses `assumeIsolatedReading`, `BASE`, `ARTICLE`, `Pages`, `openBrowser`, `askAboutPageUpToSend`, `leaks`, `cleanup`, `restoreNativeCalls`, `sourceNoteSurvivesRecreationAndReopens`.
- Text/path pins: `scripts/android-instrumentation.ts:220` (`args: {browserPageQuestion:"1"}`) — runner test requires gate text at line 61; `scripts/ci/emulator-suite.ts:12,37` (READING_CLASSES, CI lane); `test/ci-emulator-evidence.test.mjs:224`; `test/android-instrumentation-runner.test.mjs:84,215,642-643` (gate args; no `example.com|www.google.com` in source).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 340-349, 399-413 vs JourneyJ05 | T4 | `reviewedExcerptReachesOnlyTheComposerAndNothingIsSentWithoutAnAgent` and `noteWithAWebSourceKeepsItAcrossRecreationAndReopensThatAddress` run `askAboutPageUpToSend` and `sourceNoteSurvivesRecreationAndReopens`; `JourneyJ05InstrumentedTest` runs exactly the same two helpers in sequence (flag-off only, `journeyJ05` gate, not in CI per grep). | Delete `JourneyJ05InstrumentedTest.java`, its registry entry (`scripts/android-instrumentation.ts:238`) and runner-test refs (`test/android-instrumentation-runner.test.mjs:628-643`); then make the shared helpers private here. | Low. |
| 2 | 71-75, 76-81 | C3 | `js`, `waitFor`, `invoke/result/call` promise-JSON poll — copies of ActionJournal:25-37, AppInfo:27-31. | `WebViewTestDriver.call` / `until`. | Low. |
| 3 | 92-104, 121-126 | NEW (reflection into upstream internals) | Reflection into `BrowserTabHostPlugin.reading`, `BrowserReviewedReading.dialog`, `BrowserTabHostPlugin.tabs`, tab `web`. | `BrowserHostProbe`. | Medium. |
| 4 | 117-142 | C3/C4 | `Pages` (in-memory routes on the tab's WebViewClient, request counter, AutoCloseable restore) is the best instance of a mechanism re-written in BrowserFlow:380-396, BrowserExternalHandoff:62-71, BrowserCookiePolicy:50-58. | Promote to `BrowserTestDriver.serveFromMemory` and reuse. | Low. |
| 5 | 148-161 | T6 | Monkey-patches `Capacitor.nativePromise/nativeCallback` in-page to record native calls (the leak oracle). Same technique in AndroidShade.COUNT_PULLS. | Keep (it is the only witness that nothing leaves before Send) but share one `NativeCallRecorder` JS snippet. | — |
| 6 | 166-176 | C3 | Address-bar typing variant #5 (handles both "Edit address" and "Search or type address" labels — the robust one). | Becomes `BrowserTestDriver.address`. | None. |
| 7 | 167-169, 354-356, 417-418 | D8 | Mixed indentation (helpers bodies indented 5 vs 2). | Formatter pass. | None. |
| 8 | 442-450, 406-411 | C3 | `primary.addSuppressed` cleanup boilerplate (also BrowserCookiePolicy, AllViewAgentContext, BrowserIsolatedReading via fixture). | Small `Cleanup.after(primary, ThrowingRunnable)` helper. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `BASE`, `ARTICLE`, `START`, `OMITTED`, `page()` | const/helper | 54-56, 143-145, 163 | BrowserFlow `SAME`/`sameDocumentPage` | keep local (private after J05 removal) |
| `js/waitFor/invoke/settled/result/call` | helper | 71-81 | ActionJournal:25, AppInfo:27 | `WebViewTestDriver` |
| `resumedActivity` | helper | 82-85 | BrowserFlow:37 inline stage scan | `BoundedActivityScenario`/driver |
| `text(View)` | helper | 86-90 | BrowserFlow `containsNativeText` | driver |
| `currentDialog/awaitDialog/dialogText/press` | helper | 92-114 | BrowserDialogLifecycle `listing` | `BrowserHostProbe` |
| `Pages` | type | 117-142 | BrowserFlow:380-396, BrowserExternalHandoff:62-71, BrowserCookiePolicy:50-58 | `BrowserTestDriver.serveFromMemory` |
| `recordNativeCalls/leaks/restoreNativeCalls` | helper | 148-161 | AndroidShade.COUNT_PULLS | `NativeCallRecorder` |
| `letters(UUID)` | helper | 329-333 | none | keep |
| `visibleButton/tap` | helper | 334-337 | BrowserFlow `click`, AllViewAgentContext `click/label` | driver |

## Proposed end state
~400 lines: four @Test methods (gate text unchanged), helpers private, shared driver/probe/route-wrapper used; JourneyJ05 deleted (-~55 lines there).

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes BrowserPageQuestion` on a provider with isolated-world injection (flag-off pair, offline); CI reading lane (`scripts/ci/emulator-suite.ts`). Host: `node --test test/android-instrumentation-runner.test.mjs test/ci-emulator-evidence.test.mjs`.
