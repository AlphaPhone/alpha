# specs/quint/refinement/legacy/camera-session.mjs
- Lines: 168 | Kind: Quint refinement harness, historical comparison (mounted Chromium renderer, synthetic `getUserMedia` canvas streams) | Verdict: DELETE
- Covers: Camera open/first frame, back zoom then lens flip resets zoom, late preview after Leave is stopped, scan review open/close, conversation cover grace then fresh preview — compared with historical `legacy/CameraSession.qnt`. Duplicates: live application model `CameraPreviewRetirement` (`specs/quint/application/manifest.json:3316`) and its harness cover late-stream retirement; `test/browser/camera-controls.spec.ts` drives zoom/lens controls. Callers: `legacy/index.mjs:166`, `test/quint-historical-camera-session.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 12, 155-161 | P6 / D11 | Historical Design profile comparison; obligations are permanently open. | Delete file and its test; retire `legacy/CameraSession.qnt`. | Low |
| 2 | 18-46 | T6 | Replaces `navigator.mediaDevices.getUserMedia` in-page with a canvas stream port. This is the right fake for a camera journey. | If `journeys/camera-photos.spec.ts` lacks a synthetic stream helper, lift `installMediaPort` into a shared Playwright fixture. | Low |
| 3 | 142-153 | coverage | Conversation cover over Camera: preview stays during grace, is released at grace end, Back restarts preview. Check `CameraPreviewRetirement` covers this; if not, add one case to `journeys/camera-photos.spec.ts`. | Verify before deleting. | Medium |
| 4 | 132-141 | coverage | Scan review open/close over a ready camera — check an existing scan-review spec covers it. | Verify. | Low |

## Proposed end state
Deleted with `camera-session.md`, `legacy/index.mjs`, `test/quint-historical-camera-session.test.mjs`, `legacy/CameraSession.qnt`.
The synthetic media port, if still needed, becomes a helper in the Playwright harness used by `journeys/camera-photos.spec.ts`.
`test/fixtures/camera-calendar-review.mjs` is deleted if this was its last importer.
