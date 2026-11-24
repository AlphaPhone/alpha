# specs/quint/refinement/native/video-edit-review.mjs
- Lines: 115 | Kind: Quint trace replay against the **real imported module** in JSDOM | Verdict: KEEP
- Covers: model `VideoEditReview` (live) — trim/rotate/crop/play/pause/save/close/visibility of `openVideoEditReview` (`apps/app/src/prototype/video-edit-review.ts`), observed through the DOM (handle `aria-valuenow`, pressed state, status text, save callback, animation frames left running). Duplicates: `forward-replays.mjs` (600 traces) and `test/quint-video-edit-review.test.mjs` (600 traces + two 600-trace mutation runs) execute the same replay (T4). Callers/importers: `forward-replays.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-17 | – | `loadProductModule` bundles the real module; three stubs (`media-review-controls`, `video-transcode`, `video-codecs`). | Keep. | – |
| 2 | 11,13 | T10 | `rewrite` passthrough exists for the test's mutation canaries, which replace literal substrings of the product (`'loaded=false;video.pause();updateControls();'`, `"busy=true;video.pause();…"`); they block the Prettier commit (cross-file NEW-SUBSTRING-MUTATION). | Delete the two mutation cases in the test and the `rewrite` option here (mutation testing is not a product behaviour); the replay already requires `sourceError` while playing and single-save behaviour via `reached`/projection. | L |
| 3 | 32-49 | – | Saves and restores `globalThis` descriptors around JSDOM; patches `HTMLMediaElement` prototype for play/pause state. Needed port. | Keep. | – |
| 4 | – | runtime | 600 traces × up to 16 steps, ~3 runs per verify (forward-replays + test + mutations): notable. | One run (forward-replays). | – |
| 5 | – | D11 | Renderer model filed under native. | Leave. | – |

## Proposed end state
Unchanged replay minus `rewrite`; executed once from `forward-replays.mjs`; delete `test/quint-video-edit-review.test.mjs`
or keep it as the single runner and drop the forward-replays registration (pick one).
