# test/browser/camera-overlay-contrast.spec.ts
- Lines: 16 | Kind: Playwright, chromium (`?mode=mock&start=camera`), 1 test (loop of one); computed-style contrast maths (s0 r0) | Verdict: MERGE into the contrast sweep of `journeys/accessibility.spec.ts` (use `accessibility-audit.ts` `contrast:true`)
- Covers: the four Zoom chips over the camera feed keep ≥ 4.5:1 contrast when composited over a white pixel. Duplicates: contrast/luminance maths also in `map-label-contrast.spec.ts:14-15` and `accessibility-audit.ts:63-64` (WCAG 1.4.3 option). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 4, 14 | A7 / B4 | `for(const state of ['camera'])` with a dead `'Save to Files'/'Open link'` branch and `?4:2` count for a state that is never run. | Remove the loop and branch. | None |
| 2 | 8-12 | C3 / T5 | Hand-written relative-luminance formula, third copy. | Use `accessibility-audit` contrast check with a white backdrop option. | Low: the audit must support "composite over white" (add the option if missing). |
| 3 | 3 | D5 | Uses the `?mode=mock&start=camera` run mode. | Use the harness fake camera and open Camera normally. | None |
| 4 | 15 | B5 | Screenshot with no consumer. | Drop. | None |

## Proposed end state
One entry in the accessibility contrast sweep: "Camera controls over a white feed" (fake camera painting white), asserted by the shared audit. Delete this file.
