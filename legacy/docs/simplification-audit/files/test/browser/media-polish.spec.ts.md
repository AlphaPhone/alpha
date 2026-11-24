# test/browser/media-polish.spec.ts
- Lines: 104 | Kind: grab-bag of Playwright tests; most open dialogs by importing product modules (`openScanDocument`, `openVideoEditReview`, `reviewContentQuestion`, `validateVideoEdit`, `browserCamera`) (T6); project `chromium`, 9 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (and one case into `journeys/chat.spec.ts`)
- Covers: empty scan offers capture/import, not disabled export; video editor time labels, compact tools, no idle redraws, exact original bounds; camera error notice timing and centring; failed video load disables save; recording timer without success banner; Photos tabs stable between Library/Albums and Select only in grids; image question review stages only reviewed text; trim minimum span. Duplicates: `video-edit.spec.ts` (13 tests on the same editor), `photos-clean-controls.spec.ts` (Photos controls), `browser-camera.spec.ts` (camera) (T4). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 21, 46, 83, 95 | T6 | Opens the scan, video-edit and content-question dialogs by importing and calling the module, not from Camera/Photos. | Reach each dialog from its UI entry (Camera scan mode, Photos video > Edit, image > Ask). | Medium: the video needs a fixture video in the Photos library (the shared photos bridge helper) |
| 2 | 98 | T3 | Calls `validateVideoEdit` directly inside a UI test: a unit check. | Drop; the UI save of the minimum span covers it. | none |
| 3 | 37, 57 | T6 | Replaces `browserCamera.setZoom`, `startRecording`, `stopRecording`, `getRecordingState` and `browserPhotoLibrary.list/read` in-page. | Fail zoom and record through the media fake (`getUserMedia`/MediaRecorder stubs) or the shared camera fixture. | Medium |
| 4 | 25, 33 | T8 | `waitForTimeout(1200)` and `(150)` to count idle canvas draws. | Use `page.clock` to advance time, or count draws across `requestAnimationFrame` ticks. | Low |
| 5 | 12, 31 | T1-like | Asserts the font family contains "Denton" and the border radius is `0px`. | Drop style-constant checks; keep the on-screen bounds check. | none |
| 6 | 18, 93 | C3 | Same 6-line canvas+MediaRecorder video synthesiser written twice. | One `makeSyntheticVideo(page)` harness helper (also used by `video-edit.spec.ts`). | none |
| 7 | 16-34, 91-104 | T4 | Video-editor cases overlap `video-edit.spec.ts`. | Merge into one video-edit block; keep only cases `video-edit` does not have (idle redraws, exact original bounds, minimum span). | Low |

## Proposed end state
The file goes. Scan, camera notice, recording and Photos tab cases become steps of `journeys/camera-photos.spec.ts`,
reached from the Camera/Photos UI. The video cases move into the video-edit block shared with `video-edit.spec.ts`. The image
question review moves to `journeys/chat.spec.ts` (attachment question). One synthetic-video helper. No direct
module calls or style-constant assertions.
