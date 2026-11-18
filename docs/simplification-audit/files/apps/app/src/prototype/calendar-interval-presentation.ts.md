# apps/app/src/prototype/calendar-interval-presentation.ts
- Lines: 86 | Role: Shared Calendar presentation for provider events that carry real instants (Android provider, agent Calendar): splits intervals into per-day segments, renders day columns, extends the hour grid before 07:00/after 23:00, all-day rows, agenda rows, week/month dots; plus `calendarIntervalDetail` text for the open event. | Verdict: SIMPLIFY
- Importers: 2 — `calendar-adapter.ts:3` (`presentCalendarIntervals`), `agent-calendar-adapter.ts` (`presentCalendarIntervals`, `calendarIntervalDetail`); `scripts/fixtures/calendar-adapter.ts`.
- Text/path pins: `test/calendar-day-context.test.mjs:183` (loads the module via `loadBrowserModule`), `test/calendar-form-inputs.test.mjs:4` and `test/scanned-calendar-handoff.test.mjs:10` (bundle exports), `test/calendar-delete-latch.test.mjs` (uses `presentCalendarIntervals`), `specs/quint/refinement/application/calendar-adapter-fixture.mjs`, `test/support/feature-parity.mjs:355`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-85 | D8 | Mixed indentation: the module uses 1-space indents, the body of `presentCalendarIntervals` 4 spaces, closing `return out;` 1 space. | Formatter pass. | None. |
| 2 | 4-5 | C3 | `DAY` and `civilDay` copies. | `runtime/civil-date.ts`. | None. |
| 3 | 9 | C3 | `offset(date)` → `UTC±HH:MM` formatter, duplicated verbatim at `calendar-adapter.ts:345`. | Keep this one (exported via `calendarIntervalDetail`) and delete the adapter copy (calendar-adapter report #10). | None. |
| 4 | 47-56 | C6 | Grid constants as literals: `7`, `23`, `56` (px per hour), `8` (label offset), `912` (default timeline height) — the same values as `model.js:1144` `CAL_H0=7, CAL_H1=23, CAL_PX=56`. | Export the calendar grid constants from one module (with `calendar-days.ts` REFERENCE_* constants) and import them in model.js and here. | Low. |
| 5 | 57, 66 | C3 | `const now=new Date(api.now),time=now.getHours()+now.getMinutes()/60;` computed twice. | Compute once before the branches. | None. |
| 6 | 38, 45 | NEW (render recursion) | Calls the full inner `render` again once for the selected day and once per extra visible column (`render({...state,day:off,events:…},api)`), i.e. up to 1+N renders of the whole calendar render chain per frame (N = visible columns). | Expose the per-day layout function from model.js (`layoutDay(events, day)`) and call that instead of the whole view render. | Medium (perf + correctness; inner render chain may have side effects — P17). |
| 7 | 80, 84 | C6 | `var(--acct)`/`var(--mut)`/`var(--fg)` dot colours as strings in values. | Booleans + template classes (D12). | Visual. |
| 8 | 3, 13 | C1 | `type Bag`; `render` signature `(state:Bag,api:Bag)=>Bag`. | `ViewDefinition` render type; event row type `CalendarIntervalEvent` (`calendarInterval`, `calendarIntervalData:{begin,end}`, `allDayEndOff`). | None. |
| 9 | 33-35 | A8 | Three comment lines restate the same "temporary per-day layout only" idea. | One line. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 3 | ~45 files | `shell-types.ts` / event row type |
| `DAY` | const | 4 | `calendar-adapter.ts:17`, `calendar-form-inputs.ts:2` | `runtime/civil-date.ts` |
| `civilDay` | helper | 5 | 10 copies | `runtime/civil-date.ts` |
| `offset` | helper | 9 | `calendar-adapter.ts:345` | here (inside `calendarIntervalDetail`) |
| grid constants 7/23/56/912 | literals | 47-56 | `model.js:1144` (`CAL_H0/CAL_H1/CAL_PX`) | shared calendar layout constants |
| `bounds`, `timedOn`, `segmentsFor`, `onDay` | helpers | 15-29 | per-day splitting in `agent-calendar-adapter.ts` (check) | keep |

## Proposed end state
≈78 lines: formatted, constants imported, `now` computed once, shared civil-date helpers, typed event rows; later a per-day layout function instead of re-entering the whole render chain.

## Verification
`test/calendar-day-context.test.mjs`, `test/calendar-delete-latch.test.mjs`, `test/browser/calendar-wide-days.spec.ts`, DST/offset-change Calendar specs, Quint calendar fixture, `npm run verify`.
