# test/browser/calendar-accessibility.spec.ts
- Lines: 98 | Kind: Playwright, chromium, 7 tests + loops (~21 runs, many screenshots); mixed UI layout checks and module-in-page dialog openers (s10 r47, clock) | Verdict: MERGE into `journeys/accessibility.spec.ts` (Calendar detail, draft, timeline) and DELETE the stand-in dialog cases
- Covers: Calendar detail long text at 150 % text in light/dark; draft fields and actions reachable at large text; timeline scroll fade; browser stand-in editor/meeting/response dialogs at large text and keyboard focus return. Duplicates: `accessibility-sweep*`, `responsive-surfaces*`, `dev-calendar-preferences.spec.ts` (large text), `dev-calendar-meeting*.spec.ts`, `dev-calendar-response.spec.ts`. Callers/importers: chromium only; imports `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 28, 50, 73, 89 | P2 | Text scale set by `BrowserDevice.prototype.setTextScale({percent:150})` from an in-page import (5 copies). | Harness `setTextScale(page,150)` at the device-bridge boundary. | None |
| 2 | 52, 65, 74, 91 | T6 / P7 | Opens `editCalendarEvent`, `openCalendarMeeting`, `editCalendarResponse` directly: these are the web `AlphaCalendar` stand-in's own dialogs (Android shows native ones). | Delete these four tests; keep layout coverage for renderer-owned surfaces only. | Low: stand-in dialogs lose large-text coverage (acceptable per P7). |
| 3 | 35 | T1-like | Exact computed style pins (`52px`/`32px` track, `26px` thumb, `16px` radius, `matrix(1, 0, 0, 1, 20, 0)`). These pin CSS values, not accessibility. | Keep only 44 px target and aria-checked toggling. | None |
| 4 | 7, 24, 39, 48, 71, 87 | T4 | Light × dark × height loops multiply full boots; theme does not change the reachability geometry being asserted. | Run one theme for geometry; contrast checks via `accessibility-audit` in the sweep. | None |
| 5 | 17, 19, 36, 42, 62, 82, 96 | B5 | `page.screenshot` to `outputPath` with no consumer. | Drop or attach only on failure. | None |

## Proposed end state
In `journeys/accessibility.spec.ts`: Calendar detail (event and reminder) at 150 % text has no horizontal overflow and ≥44 px reminder actions; New event draft keeps fields and Save reachable at 360×430; timeline fade appears only after scroll. One theme each. About 35 lines. Delete this file.
