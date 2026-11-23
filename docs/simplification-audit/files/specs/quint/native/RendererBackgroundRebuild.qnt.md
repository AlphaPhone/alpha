# specs/quint/native/RendererBackgroundRebuild.qnt
- Lines: 218 | Kind: Quint model (live) | Verdict: KEEP (owner question: merge with RendererRecovery)
- Covers: renderer loss while a surface is hidden: uncounted background reclaim vs counted crash, rebuild deferred to the next `onStart`, shared launcher/assistant renderer and one recovery budget, hidden escape view when Alpha is HOME, an overtaken WebView spending nothing. Duplicates: partly `RendererRecovery.qnt` (same `RendererRecoveryBudget`, same two surfaces, same "one loss per renderer death" and "assistant never escapes" invariants: `DeathCountedAtMostOnce`/`EscapeOnlyWhileHome` here vs `OneLossPerRendererDeath`/`AssistantNeverEscapes` there). Callers/importers: manifest; `refinement/native/renderer-background-rebuild.mjs` (+ `RendererBackgroundRebuildReplay.java`) run from `forward-replays.mjs:15,34`; per-model wrapper `test/quint-renderer-background-rebuild.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — | Tie compiles the real `MainActivity.java`, `RendererRecoveryBudget.java`, `NavigationOpenRequest.java` with ports (`MainActivityPorts.java`, `main-activity-platform.mjs`) and replays ITF traces. No product-text slicing (it writes a stub `androidx.lifecycle.Lifecycle`). | none | — |
| 2 | whole file | C5 / T4 | Two models of one budget: this one (hidden/visible, reclaim vs crash, deferred rebuild) and `RendererRecovery` (window/backoff timing, Settings fallbacks, handoff, task restore, async recreation). Both model shared-death counting and the assistant surface. | Owner question: fold this model's `started`/`reclaim`/`pendingRebuild` dimension into `RendererRecovery` and delete the assistant-surface fields there, or keep both and remove the overlap from `RendererRecovery` (`openAssist`…`assistRecreated`). Not required for 100 % passing. | medium (proof engineering) |
| 3 | forward-replays.mjs:42-44 | B5 | Exact trace-count assertion (`RendererBackgroundRebuild: 65`) makes every model edit a two-file change. | Assert `> 0` and all required actions reached. | low |
| 4 | test wrapper | T4 / T9 | `test/quint-renderer-background-rebuild.test.mjs` runs the same campaign that `forward-replays.mjs` runs in the native aggregate. | Keep one runner (the aggregate, path-scoped in CI). | low |
| 5 | 363-391 (comments) | — | Field comments are current and useful. | none | — |

## Proposed end state
Model kept as is. Product code (`RendererRecoveryBudget.java`, `MainActivity.java` deferred rebuild at
`MainActivity.java:445`) is live. Run once (aggregate), count assertion relaxed. Decide with the owner whether the two
renderer models merge; if they do, the merged model keeps this file's surface record (`Surface` type) and
`RendererRecovery`'s timing/window and handoff state.
