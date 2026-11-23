# specs/quint/refinement/native/browser-underlay.mjs
- Lines: 61 | Kind: Quint refinement driver (Node; slices upstream Kotlin `BelowHostLayer.kt`, fills `BrowserUnderlayTraces.kt.txt` template, compiles with kotlinc, runs on the JVM) | Verdict: KEEP (path-gated); PORT if upstream exposes the router
- Covers: model `BrowserUnderlay`: touch ownership of the native browser surface under the host WebView (page selection, coordinate forwarding, exactly one CANCEL on withdrawal). Duplicates: `test/quint-...` wrapper not found for this driver; runs from the native aggregate. Callers: `index.mjs:67`.

## Text anchors (T10)
- `vendor/eliza/.../browsersurface/BelowHostLayer.kt`: `'    private var touchTarget:'` .. `'    override fun dispatchHoverEvent'`; `'internal fun takesPageInput('` .. first blank line; brace-matched `'internal enum class SurfaceLayer'`.
- Template placeholders `// LAYER_BODY`, `// ROUTER_BODY` in `BrowserUnderlayTraces.kt.txt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-43 | T10 / P6 | Models upstream-only code (all product sources are under `vendor/eliza`); anchors change only on a pin bump. Kotlin compile is the slowest native setup (kotlinc jars). | Gate on `upstream.lock.json`, `patches/eliza/**` and this directory; propose upstream to host the model and to make the router a separate class (D14). | Low |
| 2 | 12-23 | C5 | Own brace-matcher `declaration()`; other harnesses have `between`/`exact` twins. | Shared `refinement/support/source-slice.mjs` until ports remove slicing. | Low |
| 3 | 31 | B5 | `android/gradle/verification-metadata.xml` in sources only to pin kotlin jars. | Keep (it is the jar pin). | — |

## Proposed end state
Unchanged campaign, run only when the upstream pin or the driver changes; candidate for an upstream follow-up.
