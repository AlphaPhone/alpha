# specs/quint/refinement/native/TextScaleLifecycleTraces.java
- Lines: 225 | Kind: Quint refinement harness (whole product `MainActivity.java`, `RendererRecoveryBudget.java` + **text-extracted** `AlphaDevicePlugin` appearance/timeout members from `text-scale-platform.mjs`, `MainActivityPorts`) | Verdict: KEEP harness; driver PORT (stop slicing `AlphaDevicePlugin`)
- Covers: in-app text size: valid 75-150 % requests queue on the exact Activity, configuration changes and resume re-apply the WebView text zoom with the current font scale (including tiny/zero/NaN/negative/infinite scales), late/finishing/destroyed owners, refused/visible-only commits and process restart, missing WebView; accessibility recommended timeout (API gate, single lookup, input validation). Duplicates: Playwright settings/accessibility specs see the renderer slider only. Callers/importers: `text-scale-lifecycle.mjs` (`checkNativeTextScaleLifecycle`) <- `index.mjs`, `test/quint-native-text-scale-lifecycle.test.mjs`.
- Model live: `specs/quint/native/NativeTextScaleLifecycle.qnt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `text-scale-platform.mjs:10-50` | T10 | Slices `AlphaDevicePlugin.java` from `' static int textScalePercent('` to `' @PluginMethod public void snapshot('` (member order pin) and Capacitor `PluginCall.getInt` text (with `@Nullable` rewrites). | PORT: move text-scale and recommended-timeout members out of `AlphaDevicePlugin` into a `TextScale.java` helper (part of the D1 split); compile it whole. Capacitor stub: write the stub directly instead of slicing `PluginCall.java`. | medium |
| 2 | 100-117 | — | Classifies by exact error copy (`"Text size must be 75 to 150 percent."`, `"Alpha view is unavailable"`, `"Text size could not be saved"`, `"Base timeout must be 1 to 600000 ms."`). User-visible contract. | Keep. | none |
| 3 | 160 | — | `require(f.zoom==113, ...)` documents Java float half-rounding of 75 % x 1.5. Real behaviour assertion. | Keep. | none |
| 4 | 30-32 | — | Mutates static stub state (`BuildConfig.IS_LAUNCHER`, `Context.appearance`, `Build.VERSION.SDK_INT`, `Context.accessibility`). One scenario per JVM. | none | none |
| 5 | test | B5 | `traces === 8`, `observedFields.length === 7`. | Assert `passed`. | low |

## Proposed end state
Same eight scenarios against whole `MainActivity.java` and a whole `TextScale.java`, no member slicing.
Path filter: `MainActivity.java`, `AlphaDevicePlugin.java` / `TextScale.java`, `RendererRecoveryBudget.java`, `NativeTextScaleLifecycle.qnt`, `text-scale*.mjs`, `main-activity-platform.mjs`, `MainActivityPorts.java`.
