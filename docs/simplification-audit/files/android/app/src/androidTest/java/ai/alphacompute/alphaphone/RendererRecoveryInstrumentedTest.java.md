# android/app/src/androidTest/java/ai/alphacompute/alphaphone/RendererRecoveryInstrumentedTest.java
- Lines: 126 | Role: killing the host WebView renderer recreates exactly one resumed MainActivity with the page in a new renderer, twice within the budget window. | Verdict: KEEP
- Importers: `LauncherHomeInstrumentedTest` uses its static `killHostRenderer`, `awaitRecovered`, `finishRecreated`, `mainActivityStages`. Text/path pins: `scripts/android-instrumentation.ts:231` (`RendererRecovery: { note: ... }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-41 | C3 | `live()` re-implements the stage scan in `WebViewTestDriver.withActivity` (`:22-27`). | Expose `WebViewTestDriver.liveActivity(Class)` (nullable) and use it in both. | none |
| 2 | 44-125 | D10 | Static helpers used by another test live on this test class. | Move `killHostRenderer/awaitRecovered/finishRecreated/mainActivityStages` to a `RendererTestDriver`; both tests import it. | none |
| 3 | 107 | C3 | Inline 150x100 ms poll for `activeView`. | `WebViewTestDriver.until`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `MARKER` | const | 30 | none | keep |
| `live()` | helper | 33-41 | `WebViewTestDriver.java:22-27` | `WebViewTestDriver.liveActivity` |
| `mainActivityStages` / `killHostRenderer` / `awaitRecovered` / `finishRecreated` | helper | 44-125 | used by `LauncherHomeInstrumentedTest` | `RendererTestDriver` |

## Proposed end state
Test unchanged; shared helpers moved to a support class and `live()` folded into `WebViewTestDriver`. ~40 lines here, ~80 in the driver (net ~120).

## Verification
`--classes RendererRecovery` on both variants; `LauncherHome` under `--home-role`.
