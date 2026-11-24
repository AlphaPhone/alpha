# specs/quint/refinement/application/media-copy-intent.mjs
- Lines: 76 | Kind: Quint ITF trace replay (imports the real module, `MediaCopyIntent`, live) | Verdict: KEEP (drop the `rewrite` hook)
- Covers: one pending saved-copy request — compare-and-set admission, exact acknowledgement (browser by revision, Android by token), recovery after renderer restart (`apps/app/src/runtime/media-copy-intent.ts`). Duplicates: none. Callers/importers: `test/quint-media-copy-intent.test.mjs` only (not in the aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 29-32 | — | Loads the real module through `loadProductModule` (esbuild bundle + two port stubs: `@capacitor/core`, `../browser/documents`). Target pattern. | Keep. | — |
| 2 | 10-12 | T5/T1 | `rewrite` exists only for the wrapper's second test, which replaces the literal `if(JSON.stringify(decode(archive))!==JSON.stringify(expected))throw` in product source and expects the replay to fail — a test of the test, pinned to minified source text that Prettier (D9) will change. | Delete the `rewrite` option and the mutation test (and the `rewrite` support in `notes-files-media-itf.mjs` if no other caller). | L |
| 3 | 27-28 | B4 | Sets/deletes `globalThis.localStorage` per trace; the A1 legacy-key seed at `media-copy-intent.ts:14` is being removed (B299); the model never modelled it. | Re-run after B299; no harness change. | L |
| 4 | 4 | C5 | ITF helpers come from `notes-files-media-itf.mjs`, a second copy of `services/maps-model-traces.mjs`' `modelTraces/replayTraces`. | Merge the two ITF helper modules. | L |

## Proposed end state
Replay unchanged (400 traces × 20 steps); no source rewriting; shared ITF helper; run by the manifest runner.
