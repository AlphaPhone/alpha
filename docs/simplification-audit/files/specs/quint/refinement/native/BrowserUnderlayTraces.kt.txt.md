# specs/quint/refinement/native/BrowserUnderlayTraces.kt.txt
- Lines: 106 | Kind: Kotlin template for a source-transplant refinement driver (stub Android `View`/`MotionEvent` + `// LAYER_BODY`/`// ROUTER_BODY` placeholders filled with text slices of upstream `BelowHostLayer.kt`) | Verdict: PORT
- Covers: browser-underlay touch routing: missing geometry refuses page input, outside/host touches stay on host, a page gesture keeps ownership across a second finger, hide/pause/dispose sends exactly one CANCEL and consumes later motion, resume needs fresh geometry. Duplicates: none in this repo. Callers: `native/browser-underlay.mjs:28-51` (slices `vendor/eliza/plugins/plugin-native-browser-surface/android/.../BelowHostLayer.kt` between `'    private var touchTarget:'` and `'    override fun dispatchHoverEvent'`, plus `internal fun takesPageInput(` to the next blank line and `internal enum class SurfaceLayer` by brace matching).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38, 40 + harness | T10 / T2 | Production code enters only as text slices at literal anchors in an **upstream** file; any upstream reformat or member reorder breaks the replay, and the `Router` class wrapping the slice is not the production class. | PORT: compile the whole real `BelowHostLayer.kt` against stub `android.view.{View,ViewGroup,MotionEvent}` sources (this template's lines 2-27 become those stubs in package `android.view`), instantiate the production router class, and keep only `Fixture` + `main` here as `BrowserUnderlayTraces.kt`. Needs the production router and `takesPageInput` to be reachable (internal is fine within one compilation unit). | Medium: may need an upstream change to make the router constructible without a WebView (D14 follow-up). |
| 2 | 28-37 | — | `OccludingSurfaceLayout` geometry is a controlled port; documented. | Keep as stub. | — |
| 3 | 67-105 | — | Hand-built JSON strings for traces. | Use the same `Trace`-style helper as the Java drivers or `org.json` (already on the classpath). | Low |
| 4 | scope | — | Models upstream-only code (plugin-native-browser-surface) that ships in this APK. | Keep while shipped; candidate to move upstream with its model (D14). | — |

## Proposed end state
A real `.kt` driver (`BrowserUnderlayTraces.kt`) with only fixture and scenarios; Android view stubs in their own files; the production `BelowHostLayer.kt` compiled unmodified.
`browser-underlay.mjs` loses `declaration()` and all `indexOf` anchors.
