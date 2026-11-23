# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserExternalHandoffInstrumentedTest.java
- Lines: 117 | Role: "Open in another browser" hand-off: generic-HTTPS filter rule, stale/unresolvable refusals, private review, exact chooser intent. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:151`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-46 | T3/T5 | `publicResolvedFiltersExcludeAppLinksAndConstrainedHandlers` is a pure unit test of upstream `BrowserExternalHandoff.genericHttps(IntentFilter)` with hand-built filters; no Activity, no Alpha code. | Move upstream (vendor/eliza plugin tests) and delete here. | Low. |
| 2 | 28-30, 58-60, 77-79, 92-104 | NEW (reflection into upstream internals) | Generic `declared/set/get` field walker writes upstream private state (`session`, `presentedId`, `externalBrowserResolver`, tab `url/navigation/committed/loading/error/frame`) and calls private `build`. The test fabricates the plugin's state rather than reaching it through the UI. | Collect in `BrowserHostProbe`; ask upstream for a test seam for `externalBrowserResolver` (a constructor/package setter) so the fixture needs no reflection. | Medium. |
| 3 | 31-37 | — | `Call extends PluginCall` fake with null bridge to drive `openExternalBrowser` directly (T6-ish: plugin method called without the renderer). | Keep while the probe approach stays; otherwise drive "Menu → Open in browser". | — |
| 4 | 62-71 | C3 | Intercepting WebViewClient wrapper (4th copy). | `BrowserTestDriver.serveFromMemory`. | Low. |
| 5 | 47 | D8 | 500-character one-line `browser(pkg, browser)` ResolveInfo builder. | Formatter pass. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `declared/set/get` | helper | 28-30 | BrowserFlow:335 `field`, ActivityInstanceSelection:18-19 | `BrowserHostProbe` |
| `Call` | type | 31-37 | none | keep |
| `browser(pkg,browser)` | helper | 47 | BrowserInstalledResolver filter logic (real resolver) | keep |

## Proposed end state
~95 lines: the two exercise-based @Test methods remain; the filter unit test moves upstream; reflection behind `BrowserHostProbe`; shared in-memory route wrapper.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes BrowserExternalHandoff`; upstream plugin unit tests for `genericHttps` once moved.
