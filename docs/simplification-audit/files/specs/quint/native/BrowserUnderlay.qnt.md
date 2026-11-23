# specs/quint/native/BrowserUnderlay.qnt
- Lines: 54 | Kind: Quint model (live; models upstream-only Kotlin) | Verdict: KEEP for now; MOVE upstream (D14 follow-up) and run only when `upstream.lock.json` changes
- Covers: below-host browser page input admission and gesture ownership: a host-started gesture never becomes a page gesture, no page gesture without host rects, a withdrawn/paused/disposed page consumes the rest of its gesture (CANCEL once). Duplicates: none in this repo. Callers/importers: `quint:check` (5 runs); `specs/quint/refinement/native/browser-underlay.mjs` + template `BrowserUnderlayTraces.kt.txt`, run from `refinement/native/index.mjs:199`; obligation `index.mjs:202`; `specs/quint/pixel-native-review-20261109.md` (stale note).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` | §2.9 / P6 | Both sources are `vendor/eliza/plugins/plugin-native-browser-surface/.../BelowHostLayer.kt` and `BrowserSurfacePlugin.kt`. The model can only change result on a pin bump, yet runs on every `quint:check` and its harness (kotlinc compile, ~30 s) on every native refinement run. | Gate this model and harness on `upstream.lock.json` (and its own files) in the CI path matrix; list it as an upstream follow-up (move model + harness into `vendor/eliza` upstream). | Low |
| 2 | harness `browser-underlay.mjs:12-43` | T10 | Text surgery on upstream Kotlin: brace-matched `internal enum class SurfaceLayer`, `internal fun takesPageInput(` up to the next blank line, and `    private var touchTarget:` … `    override fun dispatchHoverEvent`, spliced into `// LAYER_BODY` / `// ROUTER_BODY` placeholders. Cannot be ported here because exporting a seam means editing `vendor/eliza` (AGENTS.md). | Upstream follow-up: make the touch router a separate internal class upstream so the harness compiles the file whole. Until then keep as is. | Low |
| 3 | 22, 36 | — | `secondFinger` is `s' = s` (documents that split fingers keep the owner); `up` resets. Fine as model documentation. | None. | — |
| 4 | 39 | — | `TypeOK` only checks the `target` enum. Fine. | None. | — |

## Proposed end state
Model unchanged. CI runs it (and the Kotlin harness) only when `upstream.lock.json` or its own files change. Listed in
`cross-file-actions.md` upstream follow-ups: move model + harness to the upstream plugin, with the router extracted
into its own class so no text slicing is needed.
