# test/fixtures/camera-preview-port.mjs
- Lines: 91 | Kind: Playwright helper (synthetic getUserMedia with held streams; wraps camera module `onLeave`) | Verdict: MERGE into the camera journey fixture
- Covers: leaving Camera while preview streams are pending/ready ends every track, no microphone request, preview bound to the current session token. Duplicates: camera rapid-leave Playwright coverage, if any (tests-browser). Callers/importers: `test/camera-rapid-leave.test.mjs` (research: move to test/browser), live Quint `camera-preview-retirement.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-48 | T6 | Reads `window.quintMountedCamera()` (exists only through the source rewrite in `calendar-mounted-editor.mjs`) and monkey-patches `module.onLeave`. | Observe through the DOM (`video.srcObject`, track readyState) and the fake stream registry only. | Medium |
| 2 | 4-31 | - | The synthetic stream (canvas `captureStream`, held resolve) is a good reusable fake camera. | Keep as the harness's camera fake. | - |
| 3 | 26-29 | T8 | 80 ms interval painting; cleared when tracks end. | fine | - |

## Proposed end state
`fakeCamera` fixture on the shared Playwright harness (held/released streams, track status), used by `journeys/camera-photos.spec.ts` and the camera-preview-retirement Quint replay; no `quintMountedCamera` hook.
