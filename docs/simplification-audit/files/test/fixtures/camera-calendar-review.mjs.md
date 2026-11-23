# test/fixtures/camera-calendar-review.mjs
- Lines: 40 | Kind: Playwright helper (scan review dialog to Calendar) | Verdict: MERGE into the camera/calendar journey helpers
- Covers: Camera denied, then a scan review opened programmatically from a canvas JPEG, filling the event fields, "Review in Calendar". Duplicates: scan-review Playwright specs (`scan-page-camera`, `scan-event` pairs in research). Callers/importers: `fixtures/calendar-draft-handoff.mjs` (re-export), live Quint `canonical-calendar-draft-handoff.mjs`, legacy `specs/quint/refinement/legacy/camera-session.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-24 | T6 | `openMountedCameraReview` imports `/src/prototype/scan-review.ts` in-page and calls `openScanReview` with the camera API from `window.quintMountedCalendar`: a backdoor around capture. | Use a fake camera stream (as `camera-preview-port.mjs` does) and the real shutter + scan path. | Medium |
| 2 | 26 | T8 | 90 s click timeout (OCR). | Keep a single documented OCR budget in the harness. | Low |
| 3 | 4-11 | - | Denies getUserMedia then opens review anyway: scenario mixes two journeys. | Split. | Low |

## Proposed end state
Becomes a `scanToCalendar()` step in `journeys/camera-photos.spec.ts`/`calendar.spec.ts` helpers, driven through the real capture path with a synthetic stream.
