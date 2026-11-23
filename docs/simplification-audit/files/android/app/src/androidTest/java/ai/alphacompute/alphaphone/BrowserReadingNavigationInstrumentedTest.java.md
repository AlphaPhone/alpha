# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserReadingNavigationInstrumentedTest.java
- Lines: 159 | Role: isolated-world reading on a standalone WebView — provider without isolated world refuses honestly; with it, an old document can never be adopted | Verdict: SIMPLIFY
- Importers: none. Registry `BrowserReadingNavigation` (`scripts/android-instrumentation.ts:207`); CI lane `READING_CLASSES` (`scripts/ci/emulator-suite.ts:37`, flag-off). Text/path pins: `test/ci-emulator-evidence.test.mjs:224,232`, `test/instrumentation-outcome-status.test.mjs:5,16` (status `browserReadingProvider`), `test/browser/reading-capability.spec.ts:3` (comment), `test/browser-tab-host-identity.test.mjs:60-73`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55-66 vs 125-134 | C3 (local) | The WebView+`BrowserReadingWorld`+intercepting `WebViewClient` setup is written twice (only the `onPageFinished` latch differs). | `private static Pair<WebView,BrowserReadingWorld> syntheticPage(CountDownLatch finished)` used by both methods. | Low |
| 2 | 31-33 | C3 | `host/until/click` — the 150×100 ms poll and `[data-screen] button` click are the same as BrowserSignins:33-35, BrowserWebFeatures:51-53, BrowserShare:16-17. | `WebViewTestDriver.until` / `BrowserTestDriver.click`. | Low |
| 3 | 20, 139-140 | C3 | `field(target,name)` reflection helper; `BrowserWebFeaturesInstrumentedTest:95` has a superclass-walking twin. | One `TestReflection.field(owner,name)` (walks superclasses). Note `test/browser-tab-host-identity.test.mjs:74-75` regex-pins the BrowserWebFeatures copy's text — delete that assertion (T1) when moving. | Low |
| 4 | 90-93 | T5 | Calls package-private upstream `BrowserReviewedReading.reviewQuestion` by reflection to check the refusal; Alpha testing upstream internals. | Keep only the product-surface half (101-115: `readingSupport()` answer, menu note, toast); move the reflective refusal check upstream (plugin-native-browser-surface native-host tests). ~12 lines. | Medium |
| 5 | 48-117 vs `BrowserUnsupportedReadingInstrumentedTest` | T4 | Both prove "no isolated world → review refuses before extraction, nothing sent". This one runs in CI on the flag-off pair; the other needs a test-mocks build and is in no CI lane. | Keep this one; delete `BrowserUnsupportedReadingInstrumentedTest`. | Low |
| 6 | 56, 126 | C3 | `ActivityLifecycleMonitorRegistry...RESUMED).iterator().next()` — a third resumed-activity lookup. | `BrowserTestDriver.resumedMain()`. | Low |
| 7 | 71-74 | D9 | Nested poll loops with an inner 50×100 ms callback wait. | One helper `evaluateOn(web, js)` that blocks on the callback. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `field` | helper | 20 | `BrowserWebFeaturesInstrumentedTest:95`, `CalendarUpgradeInstrumentedTest:39` | `TestReflection` (androidTest) |
| `ready(world)` | helper | 21-23 | none | keep |
| `provider()` | helper | 25-30 | none | keep (status contract pinned by instrumentation-outcome-status test) |
| `host/until/click` | helpers | 31-33 | see #2 | shared drivers |
| `RecordedCall` | class | 35-41 | none | keep (or delete with #4) |

## Proposed end state
One setup helper for the synthetic page, shared polling/click helpers, reflection helper from a shared util. If #4
moves upstream, the provider-without method keeps the in-page and product-surface assertions only. Est. ~135 lines (≈120 with #4).

## Verification
`node scripts/android-instrumentation.ts --classes BrowserReadingNavigation` on both provider kinds (SDK emulator WebView 133 = no isolated world);
`node --test test/instrumentation-outcome-status.test.mjs test/ci-emulator-evidence.test.mjs`.
