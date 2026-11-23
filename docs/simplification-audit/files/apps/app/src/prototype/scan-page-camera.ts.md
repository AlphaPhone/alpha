# apps/app/src/prototype/scan-page-camera.ts
- Lines: 73 | Role: Capture one document page: either over Camera's live native viewfinder (`captureBoundPage`, borrowing Camera's capture) or in its own dialog with cloned preview tracks / `getUserMedia` and a canvas JPEG. | Verdict: SIMPLIFY
- Importers: `scan-document.ts:8` (`captureScanPage`, `type ScanPageCamera`), `camera-adapter.ts`, `scan-review.ts:9` (type). Test: `test/scan-page-camera.test.mjs:21` strips imports and turns `export function` into `function`, then runs the text (T2).
- Text/path pins: `specs/quint/services/manifest.json:4598,4646-4762` symbols `visibilitychange, captureScanPage, retake`; `specs/quint/refinement/services/scan.mjs`, `scan-source-conformance.mjs`; `test/scan-document-drafts.test.mjs`; `scan-document.ts:106` finds this dialog by aria-label `"Capture document page"`; `test/support/feature-parity.mjs:415`; `test/browser/scan-page-camera.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41 | NEW (copy bug) | Status after a bound capture reads `'Captured Nothing is saved to Photos.'` — missing sentence break (compare line 14 "…then capture. Nothing is saved to Photos."). | Owner: change to `'Captured. Nothing is saved to Photos.'` (grep shows no test pins the current text). | Low (user-visible copy). |
| 2 | 24, 59 | C3 | Two copies of the `button` helper in one file (plus 5 elsewhere). | Shared `scanButton`. | None. |
| 3 | 12-31, 58-67 | C4 | Two hand-written dialog lifecycles (listeners for abort/alpha-back/pagehide/visibilitychange, `finish`, append to `.os`, `showModal`). | Shared `openScanDialog` (see scan-correction-review report); keep a `visibilitychange` listener registration in this file (manifest symbol). | Medium. |
| 4 | 58, 67 | D8 | Lines 58, 61, 67, 71 each hold 10-30 statements (61 ≈ 900 chars). | Format; extract `captureFrame(video)` (canvas scale-to-2048 + `toBlob`). | None. |
| 5 | 58, 71 | D12 | Inline video/preview styles incl. `background:#111` and an inline dashed outline set on play. | CSS classes in `scan-dialog.css`. | Low. |
| 6 | 69-70 | B2 | `navigator.mediaDevices?.getUserMedia(…)` inside `try{}catch{}` and then `if(!request)` — two guards for one condition. `mediaDevices` is undefined only on insecure origins (dev http). | Keep the `?.` (real web case) and drop the `try/catch` (getUserMedia rejects, it does not throw synchronously) — fold both into the `.then(…, reject)` path. | Low. |
| 7 | 63-64, 61 | C5 | `stream?.getVideoTracks().some(t=>t.readyState==='live')` written at 61 and as `live()` at 63. | Define `live()` first, use it in capture. | None. |
| 8 | 66 | — | 15 s `deadline` only changes status to "Waiting…"; keep (specified). | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ScanPageCamera` | interface | 3-7 | implemented in `camera-adapter.ts` | here |
| `button` ×2 | helper | 24, 59 | 5 other files | shared scan dialog module |
| `finish` ×2 | helper | 25-29, 60 | all scan dialogs, `source-review-dialog.ts` | `openScanDialog` |
| `live` | helper | 63 | inline copy at 61 | here |

## Proposed end state
~65 lines formatted: bound capture and own-camera capture both on the shared dialog shell, a `captureFrame` helper, CSS classes instead of inline styles, copy fix. `test/scan-page-camera.test.mjs` (source transplant) must be updated or replaced by the existing browser spec.

## Verification
`node --test test/scan-page-camera.test.mjs test/scan-document-drafts.test.mjs`; `npm run test:browser -- scan-page-camera scan-document`; Quint services scan replay.
