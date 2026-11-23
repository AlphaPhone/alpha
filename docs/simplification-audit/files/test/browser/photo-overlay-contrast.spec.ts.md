# test/browser/photo-overlay-contrast.spec.ts
- Lines: 40 | Kind: Playwright, chromium, `?mode=mock&start=photos` fixture run-mode; computed-style contrast maths in page | Verdict: MERGE into `journeys/accessibility.spec.ts` (contrast section)
- Covers: photo media/favorite/selection badges and the compact video Play/Pause control keep ≥4.5:1 contrast over white images in light and dark; Back closes the viewer. Duplicates: `media-polish.spec.ts` (video controls), `photos-clean-controls.spec.ts` (viewer). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-12 | T5, C3 | Hand-written WCAG luminance/contrast calculation (a second copy of what `accessibility-audit.ts` does). | One contrast helper in the harness (or axe's `color-contrast` rule if adopted). | Low. |
| 2 | 16, 27 | D5 | Uses the `?mode=mock&start=photos` run mode. | Seed photos with the shared helper and navigate; drop dependence on `start=` if the flag zoo is reduced. | Low. |
| 3 | 32 | T6 | Paints the viewer image white by inline style to get the worst case. | Seed a white image instead. | None. |
| 4 | 14 | T7 | Two themes × two tests. | Keep both themes in one loop of one case. | None. |

## Proposed end state
One case in `journeys/accessibility.spec.ts`: for light and dark, seed a white photo and a white video; badges, selection badge and Play/Pause meet 4.5:1 via the shared contrast helper. Delete this file.
