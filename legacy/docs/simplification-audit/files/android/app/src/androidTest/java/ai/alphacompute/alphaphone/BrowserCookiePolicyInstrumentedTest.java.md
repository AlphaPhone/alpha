# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserCookiePolicyInstrumentedTest.java
- Lines: 115 | Role: P-19 third-party cookie policy on product child WebViews (normal shared profile vs private), popups inherit, host stays strict. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:153`; comment ref `test/browser-web-features.test.mjs:112`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-22, 26-41 | NEW (reflection into upstream internals) | Invokes private upstream `BrowserTabHostPlugin.build(String,boolean,String)` and writes private fields `tabs`, `id`, `web`, `committed`, `presentedId` by reflection to fabricate a committed opener. | Route through one `BrowserHostProbe` (shared with the other Browser* classes) or an upstream test accessor; this is upstream behaviour (cookie policy lives in `ai.eliza.plugins.browsersurface`), so the bulk of this class arguably belongs upstream (T5 "tests of upstream"). | Medium. |
| 2 | 42-46 | C3 | Own `evaluate(WebView, code)` latch helper; BrowserFlow:34-48 `child()` and Assistant:105-111 `evalAssist` are siblings. | `BrowserTestDriver.evaluate(WebView, code)`. | Low. |
| 3 | 61-62 | C3 | Poll loop for `window.result`. | Driver `until`. | None. |
| 4 | 84-113 | D8 | Nested try/finally with suppressed-exception bookkeeping, un-indented. | Formatter pass; a small `cleanupAfter(primary, Runnable)` helper is used in 6+ Browser files (`primary.addSuppressed`). | None. |
| 5 | 17 | — | No `@RunWith` (default runner applies). | Add for consistency or leave. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `build` (reflection) | helper | 18-22 | BrowserExternalHandoff:59-60 (same private `build` call) | `BrowserHostProbe.buildTab` |
| `popup` | helper | 26-41 | none | keep (uses probe) |
| `evaluate(WebView,..)` | helper | 42-46 | BrowserFlow `child`, Assistant `evalAssist` | `BrowserTestDriver` |
| `frame` | helper | 47-63 | intercepting WebViewClient wrappers in BrowserFlow:380-396, BrowserExternalHandoff:62-71, BrowserPageQuestion:127-139 | `BrowserTestDriver.serveFromMemory(web, routes)` |

## Proposed end state
~100 lines; reflection moved behind `BrowserHostProbe`; shared in-memory route wrapper; flat cleanup.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes BrowserCookiePolicy` (private method needs DELETE_BROWSING_DATA provider).
