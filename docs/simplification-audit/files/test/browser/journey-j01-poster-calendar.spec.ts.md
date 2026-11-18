# test/browser/journey-j01-poster-calendar.spec.ts
- Lines: 134 | Kind: Playwright journey, `chromium` (`/?mode=dev`), 1 test; real Camera, chat "Scan this", real local OCR, scan review, Calendar hand-off, form recovery across reload, Save | Verdict: KEEP (J01 section of `journeys/camera-photos.spec.ts`, scan part)
- Covers: a scanned poster becomes exactly one reviewed Calendar event, and neither suggestions nor retained drafts save on their own. Duplicates: `journey-core-loops.production.spec.ts:535` (J01 web build: only "remains in review without a Calendar source"), `scan-event.spec.ts` (OCR→event fields), `local-ocr.spec.ts` test 3 (same Camera→Scan→review path, saving to Notes). Callers/importers: none; imports `openBrowserCalendar` (`helpers/browser-calendar.ts`), `returnToApps` (`app-navigation.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 63-67 | C3, T7 | Synthetic camera (`getUserMedia` → canvas stream drawing text) is copied in `local-ocr.spec.ts:57-62`. | One `syntheticCamera(page, lines)` helper in the harness. | Low. |
| 2 | 33 | T6 (light) | Event count read via `import('/src/browser/calendar-store.ts').calendarDocument.readRaw()`. | Acceptable as a secondary storage check; prefer counting the day-view rows (already done at step 6) and drop the import where the UI shows the same fact. | Low. |
| 3 | 39 | D8 | Composer fill is a block of chained statements on one line, also copied in `local-ocr.spec.ts:66`. | Shared `askAlpha(page, text)` helper. | Low. |
| 4 | 119-127 | - | Step 5 asserts Home's Agent Calendar does not read the browser source; this is the only coverage of that separation. | Keep. | - |
| 5 | 29, 40 | T8 | 300 s test timeout, 120 s OCR wait: real OCR model load. | Keep (real engine), but the file's scan path should share one OCR warm-up with `local-ocr` cases in the same journey file. | Low. |

## Proposed end state
J01 test in `journeys/camera-photos.spec.ts` (scan section), using `syntheticCamera`, `askAlpha` and `openBrowserCalendar` (browser calendar is the retained test-mocks source, D6). Steps unchanged: cancel saves nothing, hand-off without Save saves nothing across reload, recovered form saves exactly one event, Home Agent Calendar does not show it, day view lists it once. Runs on the dev project because it needs the development browser calendar.
