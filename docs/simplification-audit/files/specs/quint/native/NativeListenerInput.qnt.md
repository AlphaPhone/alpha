# specs/quint/native/NativeListenerInput.qnt
- Lines: 130 | Kind: Quint model (live, `native` manifest; upstream-only sources) | Verdict: KEEP (D7; upstream lane)
- Covers: the always-on listener's frame/recognition path: policy classification, epoch read tickets, playback quiet guard, lease loss suppresses frames, late wake action after destroy cannot invoke. Duplicates: siblings `NativeListenerService` and `NativeListenerStore` model other parts of the same upstream service (no overlap of invariants); `AlwaysOnListener.qnt` is the renderer side. Callers/importers: `native/manifest.json` (6 tests, 4 invariants, no `bounds`), harness `refinement/native/listener-input.mjs` + `listener-input-platform.mjs`; `test/quint-listener-input.test.mjs`; native aggregate; README `:446`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Eight sources, all upstream `sense/*.java`. | Upstream-pin lane. | L |
| 2 | harness | - | `listener-input-platform.mjs:14-55` `.replace`s anchors in **fixture stubs** (AudioRecord/AudioManager stubs, `NativeAsr` stub) to add hooks, not product code. | None (fixture text; could be written directly as stub files). | L |
| 3 | 1-130 | D9 | Long single-line `act`/`frames` updates; acceptable. | None. | - |
| 4 | test wrapper | T4 | Run twice. | One runner. | L |

## Proposed end state
Unchanged; upstream-pin lane. Optional later (§2.11): one `NativeListener` module with three sections, if the listener
models are moved upstream together.
