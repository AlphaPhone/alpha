# apps/app/src/browser/camera-frame.ts
- Lines: 12 | Role: draws the zoomed/mirrored centre crop of a video frame onto a canvas for photos and video encoding. | Verdict: KEEP
- Importers: 2 (`browser/video-capture.ts`, `prototype/browser-camera.ts`). Text/path pins: `test/browser-camera-storage.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | B3 | `zoom<1\|\|zoom>8` and dimension checks on values from the in-process camera adapter. Zoom is user-controlled via the adapter's own clamp. | Keep the dimension cap (memory guard); the zoom range check may stay as the single source of the 1×-8× rule. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CameraTransform` | type | 1 | `{zoom,mirror}` in `camera-focus.ts:14` options | keep; `camera-focus` can reuse it |

## Proposed end state
Unchanged. Not merged with `camera-focus.ts` (different importers and concerns).

## Verification
`test/browser-camera-storage.test.mjs`, camera specs.
