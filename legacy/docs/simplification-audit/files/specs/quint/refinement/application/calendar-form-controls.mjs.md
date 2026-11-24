# specs/quint/refinement/application/calendar-form-controls.mjs
- Lines: 96 | Kind: Quint refinement harness, **source transplant** (slices `prototype/model.js` by four anchors and one regex, wraps fragments in `new Function`) | Verdict: PORT
- Covers: Calendar event form controls: day chips window, quarter-hour ±buttons with midnight bounds, direct date/time edits preserving multi-day duration, retired callback refusal, month-panel row counts, against `CalendarFormControls.qnt`. Duplicates: Playwright Calendar form specs (45 Calendar specs, T7) touch the same controls through the UI. Callers/importers: only the aggregate `index.mjs:3,115` (no per-model test file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-31 | T2 / T10 | Anchors in `model.js` (all five present today): `'      var dayChips = [];'`…`'      var chosen ='`, `'      var inputChange='`…`'      var dayChips = [];'`, `'    // month panel'`…`'    var calRows ='`, and regex `sPlus: (function () { fp({ … }); })` for `sPlus/sMinus/ePlus/eMinus` (`model.js:1525-1526`). Free variables `api, f, fp, calDate, calDayName, weekdayName, st, selDate, today, on, set, DAYS, MONS, sel`. Breaks on the `model.js` split (D1 god module) and on Prettier. | Move the logic into `apps/app/src/prototype/calendar-form-inputs.ts` (already exports `calendarFormInputPatch`, `calendarFormInputs`): `calendarDayChips(form, now)`, `stepCalendarFormTime(form, 'start'|'end', ±1)`, `calendarMonthCells(date, today)`. `model.js` calls them; the harness imports them directly. | M |
| 2 | 75 | T1 | Hashes `prototype/template.html` though never read. | Drop. | L |
| 3 | — | T9 | Runs only inside the 18-minute aggregate. | Give it a per-model test (or put `node:test` in the harness) when aggregates go. | L |

## Proposed end state
Harness imports three pure functions plus `calendarFormInputPatch`; same four traces; per-model lane; no anchors.
