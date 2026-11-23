# apps/app/src/browser/video-edit.ts
- Lines: 108 | Role: video trim/rotate/crop rendering with transcode fast path and real-time fallback; LemmaScript-verified helpers | Verdict: SIMPLIFY
- Importers: 3 (video-transcode.ts, prototype/browser-camera.ts, prototype/video-edit-review.ts). Text/path pins: LemmaScript-files.txt; specs/quint/native/manifest.json; test/video-capture-limit.test.mjs (strips types), test/browser-camera-storage.test.mjs; video-edit.spec.ts, media-polish.spec.ts, video-timestamp-boundaries.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 85, 101 | C3 | FileReader→data URL promise written twice (twin prototype/browser-camera.ts). | lib `blobToDataUrl`. | None. |
| 2 | 67-74 | A1 | "Older recordings could lose their MIME at stop time" sniffing of `data:application/octet-stream` — legacy data recovery. | Delete if owner confirms no pre-fix recordings (video-capture now rejects unknown MIME at line 66). | Owner sign-off. |
| 3 | 71 | B1 | `try{header=atob(...)}catch{}`. | Goes with the legacy branch. | - |
| 4 | 2 | D4 | video-codecs.ts single-use module. | Inline it here. | None. |
| 5 | 78, 86 | C3 | Two hand-written abortable-wait-with-timeout promises. | lib `withTimeout(promise,ms,signal)` (C3 abort/timeout race). | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| readAsDataURL promise | helper | 85,101 | prototype/browser-camera.ts | lib/bytes.ts blobToDataUrl |

## Proposed end state
Verified helpers unchanged; one data-URL helper; codecs generator inlined; legacy MIME sniffing removed on sign-off. Estimated lines after: 95 (current 108).

## Verification
LemmaScript, test/video-capture-limit.test.mjs, video-edit.spec.ts, video-timestamp-boundaries.spec.ts, media-polish.spec.ts.
