# test/browser/browser-video.spec.ts
- Lines: 108 | Kind: Playwright, chromium, 8 tests + 1 loop (9 runs); 6 tests module-in-page against `browserCamera` (real MediaRecorder/IndexedDB), 2 rendered UI tests | Verdict: MERGE into `journeys/camera-photos.spec.ts`
- Covers: video recording with mic audio saves exactly once and decodes after reload; late mic permission/stop races release tracks; mic denial and size overflow save nothing; quota failure saves nothing; rendered Video mode saves on Home and plays in Photos; saved-video seek/elapsed/mute controls. Duplicates: zoomed recording in `camera-controls.spec.ts`; the saved-video seek/mute controls have no other coverage (git grep "Video position" finds only this file). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-60, 72-89 | T6 | `import('/src/prototype/browser-camera.ts')` and direct `startRecording/stopRecording` calls; six of eight tests never touch a control. `browserCamera` is the web stand-in for the native camera plugin. | Keep the observable outcomes through the Camera UI (Start/Stop recording, Photos list); drop pure stand-in races. | Medium: double-Stop idempotency and late-permission release are only here. |
| 2 | 75, 77, 120 | P3 | `window.MediaRecorder` replaced with throwing / never-stopping classes. | Acceptable boundary (browser API); keep at most "recorder unavailable shows error, mic released". | Low |
| 3 | 56 | P3 | `IDBObjectStore.prototype.add` throws `QuotaExceededError`. | Use CDP `Storage.overrideQuotaForOrigin` via harness. | Low |
| 4 | 65 | P2 | `window.dispatchEvent(new Event('launcher-home'))` instead of the Home control. | Harness `goHome()` that uses the visible control. | Low |
| 5 | 102, 106 | P2 | Grabs `video.onerror` and invokes it after navigation to prove retirement. | Keep only if the owner wants the retired-source guard; otherwise drop. | Low |
| 6 | 21, 31, 55, 92 | T8 | Fixed sleeps 750 ms, 500 ms, 2,200 ms. | Poll `getRecordingState().fileSize>0` or the visible timer. | None |

## Proposed end state
`journeys/camera-photos.spec.ts` video section (synthetic `getUserMedia` canvas+oscillator stream in the harness): rendered Video mode records, Home saves once, Photos plays it after reload with audio track; seek/mute/elapsed controls; mic denial shows the message and a retry records; storage quota failure saves nothing and leaves Stop idempotent. About 50 lines. Delete this file.
