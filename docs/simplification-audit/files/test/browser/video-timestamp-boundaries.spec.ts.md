# test/browser/video-timestamp-boundaries.spec.ts
- Lines: 28 | Kind: Playwright chromium, 1 test; module-in-page: builds a WebM with three colour/tone segments using the `mediabunny` bundle read from `node_modules` and served by route, then calls `renderVideoEdit` and decodes the result (s1 r0) | Verdict: DELETE
- Covers: trimming 0.25-0.75 s keeps only the green frames and the 880 Hz tone (duration 0.48-0.56 s), rotated to portrait. Duplicates: `video-edit.spec.ts` duration/rotation checks (coarser). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-24 | T6 / P7 | Calls `renderVideoEdit` from `/src/browser/video-edit.ts` directly. That encoder is the browser stand-in (Android uses `nativeLibrary.saveVideoEdit`, `camera-adapter.ts:289`). | Delete. | Medium: only frame/tone-accurate trim check of the web encoder. |
| 2 | 3, 5 | — | Reads `mediabunny/bundles/mediabunny.mjs` from `node_modules` at test load and routes it into the page. Couples the spec to a dependency's internal bundle path. | Gone with the file. | None |
| 3 | 18, 25 | T8 | Two reloads to escape module state between phases. | Gone with the file. | None |

## Proposed end state
Delete. If the owner keeps browser video editing as a product surface, replace with one case in `journeys/camera-photos.spec.ts` that imports a committed 1 s three-segment fixture video through the Photos UI, trims it in Edit video, and checks the saved copy's duration and middle-frame colour.
