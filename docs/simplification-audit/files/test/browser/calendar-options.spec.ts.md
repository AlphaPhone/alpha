# test/browser/calendar-options.spec.ts
- Lines: 28 | Kind: Playwright, chromium, 1 test; pure function table via in-page import (s1 r0, no user action) | Verdict: DELETE
- Covers: `calendarOptionEvent`, `calendarUsesOptions`, `calendarNeedsHandoff`, `calendarZoneChoices`, `zonedInstant` in `prototype/calendar-adapter.ts` map all-day, zoned and repeating forms to provider fields and refuse DST-gap times. Duplicates: none (no other test names these functions). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-19 | T6 / T3 | Boots the app to call five pure functions; eight `toEqual` checks. Unit test in a browser costume. | Delete. Cover the observable result in the production Calendar journey: save an all-day / other-zone / weekdays event and assert the fake `AlphaCalendar` bridge received the exact `{begin,end,allDay,timeZone,rrule}`. | Medium: provider-field mapping (rrule, UTC civil all-day bounds, DST gap refusal) has no other coverage until that journey case exists. |
| 2 | 2-3 | A8 | "Renderer side of patch 0041" history comment. | n/a | None |

## Proposed end state
File deleted. `journeys/calendar.spec.ts` (production lane) has one parametrised "saved provider fields" case over {all-day, Asia/Tokyo zone, weekdays} reading the bridge recorder, plus a DST-gap time that shows the refusal message.
