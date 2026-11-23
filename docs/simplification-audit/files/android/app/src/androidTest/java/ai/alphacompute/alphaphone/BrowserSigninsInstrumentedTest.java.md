# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserSigninsInstrumentedTest.java
- Lines: 285 | Role: normal-tab sign-in persistence, Clear browsing data, target=_blank/pop-up profiles, tel/app-link handoff, cold-restart sign-in phases | Verdict: SIMPLIFY
- Importers: none. Registry `BrowserSignins` and default class (`scripts/android-instrumentation.ts:154,354`); `signinProcessRestartPhase` driven by `scripts/test-native-restart.ts` (signin). Text/path pins: `test/android-instrumentation-runner.test.mjs` (class name), `scripts/test-native-restart.ts` (method name and `signinPhase` argument), `test/browser-tab-host-identity.test.mjs:60-73`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 79-105 | T5 / T3 | `externalLinkIntentsAreImplicitBrowsableAndNeverTargetAlpha` is a pure static test of upstream `BrowserExternalHandoff.intentFor/fallback/external` (no Activity, no UI), packaged as instrumentation. Upstream already has `plugin-native-browser-surface/test/native-host/BrowserPageHandoffsTest.java`. The only Alpha input is `AlphaBrowserStores.HOST_SCHEMES`. | Move the cases upstream (or into a host-JVM test); keep one assertion that `alphaphone` intent URIs are refused if Alpha wants a product pin. −27 lines. | Low |
| 2 | 81-101 | C6 (local) | `own,AlphaBrowserStores.HOST_SCHEMES` repeated 14×. | Local `Intent handoff(String uri)` if kept. | Low |
| 3 | 174-182 vs 194-202 | C3 (local) | Identical handoff wait loop (PAUSED/STOPPED stage scan or "No app on this device" toast) written twice; `mainIn(Stage...)` (63) already does the stage scan. | `private boolean awaitHandoff()` using `mainIn(Stage.PAUSED,Stage.STOPPED)`. −10 lines. | Low |
| 4 | 31-48 | C3 / NEW | `new BrowserFlowInstrumentedTest()` for `child()`; `host/ready/button/click/app/address/page/tabs` duplicate BrowserWebFeatures:50-62 line for line. | `BrowserTestDriver`. | Low |
| 5 | 49-59 | C3 | `collect` + `tap(selector)` (real touch on child page) — 4 copies (BrowserWebFeatures:111-120, BrowserFlow, PasswordBrowserFill). | `BrowserTestDriver.tapChild(selector)`. | Low |
| 6 | 75-77, 208-215 | C3 | Reflection into `BrowserTabHostPlugin.tabs` (5 files). | `BrowserTestDriver.tabs()`. | Low |
| 7 | 120 | NEW (opaque assertion) | `assertEquals("Native page hidden behind the confirmation","null",browser.child("true"))` relies on `child()` returning `"null"` when no child is shown — and `child()` then *clicks "Not now"* on the startup panel as a side effect. | Assert visibility via a `BrowserTestDriver.childShown()` query without side effects. | Low |
| 8 | 245 | B2 | `androidx.webkit.WebViewFeature.isFeatureSupported(DELETE_BROWSING_DATA)` branch — legitimate provider capability check; keep. | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host/ready/button/click/app/address` | helpers | 32-43 | BrowserWebFeatures:50-61 (identical), BrowserShare, BrowserFlow, BrowserDownload, BrowserContinuity, PasswordBrowserFill | `BrowserTestDriver` |
| `page(url)` | helper | 44-47 | BrowserWebFeatures.page(title):62, BrowserFlow | `BrowserTestDriver.childLoaded(predicate)` |
| `tabs(count)` | helper | 48 | none | keep |
| `collect/tap` | helpers | 49-59 | 4 files | `BrowserTestDriver.tapChild` |
| `fixtureLink` | helper | 60-62 | none | keep |
| `mainIn/returnToAlpha` | helpers | 63-74 | `CalendarExternalEditor.returnToAlpha:126` (different mechanism) | keep |
| `liveTabs/ephemeralProfiles` | helpers | 75-77, 208-215 | 5 reflection sites | `BrowserTestDriver` |

## Proposed end state
Five journey methods (sign-in persistence, pop-ups, tel link, blank app link, restart phases) on shared drivers; the
pure upstream intent-parsing cases move upstream; one `awaitHandoff`. Est. ~220 lines.

## Verification
`node scripts/android-instrumentation.ts --classes BrowserSignins` (default class); `node scripts/test-native-restart.ts signin`;
`node --test test/android-instrumentation-runner.test.mjs test/browser-tab-host-identity.test.mjs`.
