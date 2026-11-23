# test/browser/dev-calendar-preferences.spec.ts
- Lines: 21 | Kind: Playwright UI (month dialog) on the browser calendar source, chromium dev build | Verdict: **DELETE** (duplicate); carry the 150 % text-scale parameter into the month-dialog case of `journeys/calendar.spec.ts`
- Covers: at 360×640 and 150 % text the month dialog opens over the toggle, closes by button and Escape, and returns focus to "Month view" (two dates). Duplicates: `calendar-month-focus.spec.ts` (same open/close/Escape/focus-return on the product Calendar, plus Tab trap, Back and Home). Callers/importers: none. 2 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-21 | T4 | Same assertions as `calendar-month-focus.spec.ts`; only the text scale differs. | Delete; add `textScale:150` to the kept month-dialog case. | none |
| 2 | 8-10 | A8 | Comment about removed per-source visibility/colour controls ("historical browser-provider cases"). | — | none |
| 3 | 13 | T1-like | Asserts the removed switches and colour buttons are absent: a guard on deleted UI. | — | none |
| 4 | 14 | P3 | Text scale via `BrowserDevice.prototype.setTextScale`. | Harness option. | none |
| 5 | 6 | P2 | `openBrowserCalendar` fiber backdoor. | — | none |

## Proposed end state
File removed; the month-dialog journey step runs once at 150 % text.
