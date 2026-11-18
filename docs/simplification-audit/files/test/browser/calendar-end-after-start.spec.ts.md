# test/browser/calendar-end-after-start.spec.ts
- Lines: 20 | Kind: Playwright, chromium, 1 test; real UI (s1 r5, clock, 120 s timeout) | Verdict: MERGE into `journeys/calendar.spec.ts`
- Covers: pressing "End earlier" twelve times cannot move End to or before Start, and the shortest form saves with end after begin. Duplicates: `test/calendar-end-after-start.test.mjs` (host test of `calendarFormTimeProblem` messages; T2/T3 candidate). Callers/importers: chromium only; imports `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T8 | `test.setTimeout(120_000)` for twelve clicks. | Remove; default budget suffices. | None |
| 2 | 15 | P2 | Reads saved events via `new BrowserCalendar().list` in page. | Open the saved event and assert its time range text. | None |
| 3 | 3 | A8 | Comment points at the host test. | Drop when the host test is deleted. | None |

## Proposed end state
One case (about 6 lines) in the Calendar form section of `journeys/calendar.spec.ts`. Delete this file and the host test `test/calendar-end-after-start.test.mjs`.
