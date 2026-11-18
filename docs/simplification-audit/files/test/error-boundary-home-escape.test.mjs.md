# test/error-boundary-home-escape.test.mjs
- Lines: 93 | Kind: integration of one real module (esbuild-bundles `apps/app/src/runtime/error-boundary.tsx`, renders it with real React in jsdom; only `@capacitor/core` is stubbed) plus one source-text case | Verdict: KEEP (lines 1-90), MERGE into `test/integration/shell-settings.test.ts`; DELETE the last case
- Covers: the startup and render recovery screens show "Switch Home" only on a native launcher build, the tap asks `DeviceApps.openHomeChooser`, and Reload keeps working when the chooser fails. Duplicates: `test/browser/accessibility-resilience.spec.ts:318-352` opens the same screen via `page.evaluate(import('/src/runtime/error-boundary.tsx'))` (T6) but only checks focus, not the Home button; `RendererRecoveryInstrumentedTest` covers the native escape view, not this renderer screen. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 93 | T1 | `fs.readFileSync(AlphaDeviceAppsPlugin.java)` and regex for `LateLaunch.ask(call,()->`: a source-text pin on Java. | Delete. The foreground fence is covered by `test/native-plugin-teardown.test.mjs` / instrumentation. | Low |
| 2 | 12-19 | D7 / B4 | Hand-installs jsdom globals and restores them; `define:{'import.meta.env':'{}'}` exists so Node can bundle a renderer file. | Keep while it lives in node:test; it is the platform boundary. If the shell-settings integration file grows a shared jsdom fixture, use it. | Low |
| 3 | 26-40 | test design | A Proxy stands in for every Capacitor plugin; only `ElizaSystem.getBuildInfo` and `DeviceApps.openHomeChooser` matter. This is a platform stub, not a mock of product code, so the test exercises real module behaviour. | Keep; type the two plugin answers explicitly instead of a catch-all Proxy. | Low |
| 4 | 61-90 | ok | Three cases x two screens: launcher build offers Home, non-launcher/web/unavailable keep Reload alone, chooser failure leaves Reload working. These are the behaviours worth carrying. | Carry all three. | Low |

## Proposed end state
The 90-line harness becomes one block in `test/integration/shell-settings.test.ts` (bundle once, reuse the jsdom
globals fixture). Delete line 93. Optionally fold the focus assertions from
`accessibility-resilience.spec.ts:318-352` into the same block and drop that `page.evaluate` import case, so the
recovery screen is covered once.
