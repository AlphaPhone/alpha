# specs/quint/refinement/native/video-recorder.mjs
- Lines: 92 | Kind: Quint trace replay against the **real imported module** | Verdict: KEEP
- Covers: model `VideoRecorder` (live) — `BrowserVideoCapture` (`apps/app/src/browser/video-capture.ts`) chunks, size limit, track end, recorder stop/error, 5 s stop deadline, finalisation and cancel, with synthetic MediaRecorder/track/timers. Duplicates: `forward-replays.mjs` (400 traces) and `test/quint-video-recorder.test.mjs` run the same replay (T4); `test/video-capture-limit.test.mjs` overlaps on the size limit. Callers/importers: `forward-replays.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-18 | – | Real module via `loadProductModule`; stubs `sensor-policy`, `camera-frame`. | Keep. | – |
| 2 | 10,45 | B-ish | Maps failure causes by regex on error **messages** (`/Recording contains no video|Video exceeded the size limit/` …). Couples the replay to user copy. | Prefer an error `code` on the product errors; until then keep. | L |
| 3 | 40-41 | – | Fake `setTimeout` keeps zero-delay timers real and captures delayed ones (negative ids). Deterministic. | Keep. | – |
| 4 | – | T4 | Two runners. | Keep one. | L |

## Proposed end state
Unchanged replay, run once; switch cause mapping to error codes if the product adds them.
