# specs/quint/native/VideoRecorder.qnt
- Lines: 107 | Kind: Quint model (live) | Verdict: KEEP; trim manifest pins, drop the duplicate wrapper
- Covers: browser video recording: size limit truncates (never discards) and stops, empty/error/deadline fail, one settle, leaving finalises before the preview stops. Duplicates: replay runs twice: `refinement/native/forward-replays.mjs:26` and `test/quint-video-recorder.test.mjs` (T4). Camera journey coverage lives in Playwright camera specs (`journeys/camera-photos.spec.ts` target). Callers/importers: `quint:check`, `refinement/native/video-recorder.mjs`, those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `symbols` | T10 | Seven regex pins (`BrowserVideoCapture`, `maxFileSize`, `settled`, `ondataavailable`, `finalizing`, `recordingStarting`, `stopRecording`) across `video-capture.ts` and `camera-adapter.ts`. The harness imports `video-capture.ts` via esbuild; the camera-adapter half is *not* executed (driver supplies the calls), so the adapter pins assert names of code nothing runs. | Delete `symbols`. Keep `video-capture.ts` as a source; drop `camera-adapter.ts` unless the adapter half gets a real replay. | Low |
| 2 | 1-5 (harness) | – | Model state includes the adapter half (`adapter`, `finalizing`, `leaving`, `previewStopped`) that the replay only simulates. Invariant `LeaveFinalisesBeforePreviewStop` is therefore model-only for the adapter. | Owner/formal question: either replay `camera-adapter.ts` (needs exported finalise/stop seam after the `model.js`/adapter split) or state it in the obligation. No model change. | Low |
| 3 | test wrapper | T10 / T5 | `test/quint-video-recorder.test.mjs` mutation cases do literal `text.replace("if(admitted.stop){full=true;stop();}", …)`; they fail on any reformat. | Delete the mutation cases; keep one replay. | Low |
| 4 | – | T4 | 400-trace replay runs in both aggregate and wrapper. | Keep one (same rule as VideoEditReview). | Low |

## Proposed end state
Model unchanged. Manifest: `sources: [apps/app/src/browser/video-capture.ts]`, no `symbols`. One 400-trace
replay by import. The camera-adapter ordering claim stays a model-level contract until the adapter exposes a
seam the replay can call.
