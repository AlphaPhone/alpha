# test/browser/calendar-month-focus.spec.ts
- Lines: 13 | Kind: Playwright, chromium, 1 test × 4 (light/dark × 915/420); real UI with keyboard (s0 r19) | Verdict: MERGE into `journeys/calendar.spec.ts` (one run) 
- Covers: the month picker dialog takes focus, traps Tab/Shift+Tab, hides dock and composer, closes on Escape, system Back, day choice and Home, and returns focus to the trigger. Duplicates: month dialog also in `calendar-form-controls.spec.ts`, `dev-calendar-preferences.spec.ts`, `responsive-surfaces.production.spec.ts`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T4 | Four boots; theme and height do not affect focus behaviour. | One run (420 height for the tighter case). | None |
| 2 | 10, 12 | P2 | `alpha-back` and `launcher-home` dispatched as window events. | Harness `systemBack()` / `goHome()`. | None |
| 3 | 8 | B5 | Screenshot with no consumer. | Drop. | None |
| 4 | 3 | T7 | Whole test on 1–2 physical lines (D8). | Formatter. | None |

## Proposed end state
One "month picker owns focus" case (about 12 formatted lines) in `journeys/calendar.spec.ts`. Delete this file.
