# test/video-capture-limit.test.mjs
- Lines: 62 | Kind: transplant (type-stripped `apps/app/src/browser/video-capture.ts` and `video-edit.ts` imported as `data:` modules with `./sensor-policy`, `./camera-frame`, `./video-transcode`, `./video-codecs` replaced by string stubs; fake `MediaRecorder`/`MediaStream`/`document`) | Verdict: DELETE (carry two cases into `journeys/camera-photos.spec.ts`)
- Covers: recording size limit (keep chunks that fit, stop on overflow, fail when nothing fits), trim clock formatting never showing 60.0 s, edited-copy duration. Duplicates: `test/browser/video-edit.spec.ts` (real recording, trim, decoded duration), `browser-video.spec.ts`/`camera-controls.spec.ts` touch `maxFileSize`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T2 | Imports a text-rewritten copy of two product modules; any new import or renamed specifier breaks it silently into a different module graph. | Delete. | Low |
| 2 | 15-20, 50-55 | T3 | Exhaustive arithmetic sweeps of `admitVideoChunk` and `videoClock` (pure helpers). | Drop; the visible behaviour is what matters. | Low |
| 3 | 32-48 | T3 | Size-limit stop is tested against a stand-in recorder. This is real user-visible behaviour with no clear journey assertion today. | Carry: "a recording that reaches the size limit is saved shortened" as a camera journey case with a small `maxFileSize` from the dev fixture. | Medium |
| 4 | 56-62 | T3 | `editedVideoDuration` with an early-ending source. `video-edit.spec.ts` already asserts decoded duration of edited copies. | Drop. | Low |

## Proposed end state
File deleted. `journeys/camera-photos.spec.ts` gains one case: record past a small size limit and assert the saved clip
exists, is shorter than the recording time and no error is shown; plus one case that a limit too small for any chunk
shows "Video exceeded the size limit." Needs the existing browser camera fixture (`browser-camera.ts`).
