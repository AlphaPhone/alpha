# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserWebFeaturesInstrumentedTest.java
- Lines: 319 | Role: loopback-fixture journeys for downloads (private, cookie scoping, redirects), blob/data captures, HTTP auth prompt, site permissions, find-in-page, fullscreen | Verdict: SIMPLIFY
- Importers: none. Registry `BrowserWebFeatures` (`requiresTestMocksBuild`, `scripts/android-instrumentation.ts:224`). Text/path pins: `test/browser-tab-host-identity.test.mjs:74-75` **regex-pins the text of `field(...)` at line 95** (T1); `test/browser-web-features.test.mjs:7` (comment); `test/browser-tab-host-identity.test.mjs:60-73` (source scan).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 65-90 | C3 | Accessibility helpers `nativeNode/hinted/nativeVisible/nativeAbsent/nativeClick/nativeType` (26 lines); `BrowserDownloadInstrumentedTest` has the same `nativeNode`, and BFS walks recur in CalendarAgentCrud:22,42-49, CalendarCrud:71-72, CalendarDeletionReview:24-45, CameraFlow:117-128. | One `NativeUiDriver` (androidTest): `find(text,exact)`, `findHinted`, `awaitVisible`, `click`, `setText`. | Low |
| 2 | 95 | T1 pin / C3 | `field(owner,name)` superclass-walking reflection; twins in BrowserReadingNavigation:20, CalendarUpgrade:39. Its exact text is regex-asserted by `test/browser-tab-host-identity.test.mjs:74-75`. | Move to `TestReflection.field`; delete the source-text assertion (T1) in the same change. | Low |
| 3 | 40, 50-63 | C3 / NEW | `new BrowserFlowInstrumentedTest()` for `child()`; `host/ready/button/click/app/address/page/childUntil` = BrowserSignins:32-47 copies. | `BrowserTestDriver`. | Low |
| 4 | 111-120 | C3 | `collect` + `tap` — 4th copy. | `BrowserTestDriver.tapChild`. | Low |
| 5 | 159 | B1 | `}catch(Exception cancelled){}` in each fixture connection handler swallows any server-side failure (bad request parsing, write errors), so a broken fixture shows up only as a timeout. | Record failures in a list and assert it is empty in `stop()`; keep ignoring only `SocketException` after `close()`. | Low |
| 6 | 164, 166 | B1 | `catch(Exception ignored){}` around saved-file deletion and DownloadManager cleanup in `@After`. | Acceptable best-effort cleanup; add the one-line reason comment, or let it throw so leaked files are visible. | Low |
| 7 | 109, 168 | C6 | `"alpha-browser-downloads"` / `"owned"` literals; the main source only names them in a comment (`AlphaBrowserStores.java:31`). | Expose `DOWNLOAD_PREFERENCES` in `AlphaBrowserStores` (or upstream config) and reference it; `BrowserDownloadInstrumentedTest` also uses the literal. | Low |
| 8 | 142 | D8 | Server accept loop + per-connection handler + routing on one 400-char line and nested lambdas. | Extract `serve(ServerSocket,String tag)` and `route(request,cookie,auth,out)`. | Low |
| 9 | 186-222 | D9 | `privateDownloadsStayOut…AndCookiesStaySameOrigin` asserts five behaviours in one 40-line method. | Split into same-origin/redirect/cross-origin/private/clear methods sharing `openFixture`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host/ready/button/click/app/address` | helpers | 50-61 | BrowserSignins:32-43 (identical) | `BrowserTestDriver` |
| `page(title)/childUntil` | helpers | 62-63 | BrowserSignins.page, BrowserSensitiveReading:96 | `BrowserTestDriver` |
| `nativeNode…nativeType` | helpers | 65-90 | BrowserDownload, Calendar*, CameraFlow | `NativeUiDriver` |
| `plugin/field/downloadEntries/pluginString/fullscreenActive` | helpers | 93-108 | `field` 3 twins | `TestReflection` + keep plugin-specific readers |
| `persistedDownloads` | helper | 109 | BrowserDownload | keep (with constant) |
| `collect/tap` | helpers | 111-120 | 4 files | `BrowserTestDriver` |
| `respond/fixturePage/start/stop` | fixture | 123-171 | `BrowserReadingFixture.Server` | keep (loopback HTTP fixture) |

## Proposed end state
Same six journeys on shared `BrowserTestDriver`/`NativeUiDriver`/`TestReflection`, a readable loopback server whose
errors fail the test, the download store name as a constant. Est. ~250 lines.

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes BrowserWebFeatures`;
`node --test test/browser-tab-host-identity.test.mjs test/browser-web-features.test.mjs` (after deleting the line-74 assertion).
