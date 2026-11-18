# specs/quint/native/VideoEditReview.qnt
- Lines: 78 | Kind: Quint model (live) | Verdict: KEEP; trim manifest pins, drop the duplicate wrapper
- Covers: video trim editor: clamped trim, one save per editor (busy until reopened), hidden/closed editor aborts and drops a late result, trim clock never shows `:60`. Duplicates: replay runs twice: `refinement/native/forward-replays.mjs:28` (native aggregate) and `test/quint-video-edit-review.test.mjs` (T4). Callers/importers: `quint:check`, `refinement/native/video-edit-review.mjs`, those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `symbols` | T10 | Six regex symbol pins (`openVideoEditReview`, `trim`, `commit`, `dispose`, `validateVideoEdit`, `drawEditedVideo`). The harness already imports `openVideoEditReview` through `loadProductModule` (esbuild bundle), so the pins add nothing but rename friction; `trim`/`commit`/`dispose` are local identifiers. | Delete `symbols`; keep `sources` (file pins). | Low |
| 2 | manifest `sources` | T10 | `apps/app/src/browser/video-edit.ts` is listed, but bundling `video-edit-review.ts` already hashes it transitively. | Keep or drop; harmless. | – |
| 3 | harness | T10 | `test/quint-video-edit-review.test.mjs` mutation cases rewrite source by literal string (`'loaded=false;video.pause();updateControls();'`, `"busy=true;video.pause();…"`). They break on any reformat (D9 Prettier). | Delete the mutation cases (they test that the harness can fail, T5); keep the one replay in the aggregate. | Low: replay itself still enforces the invariants. |
| 4 | harness | T4 | Same 600-trace replay in `forward-replays.mjs` and the standalone test. | Keep one: the per-model test wrapper if the aggregate is retired (research §2.4 prefers per-model files for lane scoping), otherwise the aggregate entry. | Low |
| 5 | 52-53 | – | `ClockSecondsBelowSixty` is a pure boundary check inside a model; fine. | None. | – |

## Proposed end state
Model unchanged. Manifest keeps file `sources`, loses `symbols`. One replay of 600 traces via
`loadProductModule` (import, not text) in the Media lane; string-rewrite mutation cases deleted.
