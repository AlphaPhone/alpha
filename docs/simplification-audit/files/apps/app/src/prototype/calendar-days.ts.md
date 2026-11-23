# apps/app/src/prototype/calendar-days.ts
- Lines: 112 | Role: Pure multi-day column logic for Calendar (visible days, first column, return day, week marking, agenda rows, column template values); four functions are LemmaScript-verified (`//@` contracts). | Verdict: KEEP (MOVE to `runtime/` is optional and costs proof-path churn)
- Importers: 3 in the app — `prototype/model.js:23` (`calendarDayColumns, calendarDayCount, calendarReturnDay, markVisibleWeek, visibleCalendarDays`), `calendar-interval-presentation.ts:1`, `calendar-adapter.ts:11` (uses only 2 of 8 imported names); plus `scripts/fixtures/calendar-adapter.ts`. (`settings-adapter.ts:861,1263` only mention the Lucide icon name `'calendar-days'`.)
- Text/path pins: `LemmaScript-files.txt:8` (path), `specs/lemma/apps/app/src/prototype/calendar-days.dfy` + `.dfy.gen` (generated from the `//@` annotations; any edit of the verified functions requires regeneration), `specs/lemma/README.md:175`; `specs/quint/application/manifest.json:1010,6499,6544`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:40`; T2 loaders `test/calendar-delete-latch.test.mjs:10`, `test/calendar-view-rules.test.mjs:17`, `test/canvas-geometry.test.mjs:82` (strips imports and evals); `test/browser/calendar-wide-days.spec.ts`; `test/support/feature-parity.mjs:351`. (Other `calendar-days` hits are the Lucide icon `calendar-days.svg`.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27 | A7 | `export const firstCalendarDay` has no importer outside this file (used by `markVisibleWeek` at 99). | Unexport (not a verified function). | None. |
| 2 | 11, 79, 97, 107 | C1 | `type Bag = Record<string, any>` for event/week rows. | Small row types (`DayColumnEvent {left,w,top,…}`, `WeekCell {cs?}`, `AgendaItem`). | None. |
| 3 | 82, 100 | D12 | CSS strings in values: `headCss: 'color:var(--fg)'`, `cs: \`${item.cs}…;background:var(--s2)\``. | Booleans (`selected`, `marked`) and template classes. | Visual; template edit. |
| 4 | 14 | C6 | `REFERENCE_LEFT = 60, REFERENCE_WIDTH = 336` mirror the single-day layout constants inside `model.js` (lane geometry). | Export the layout constants from one place (model's calendar layout or a `calendar-layout.ts`) and import them. | Low. |
| 5 | 2 | A8 | `(#411, responsive-surface matrix: …)` issue reference in the header comment. | Keep the explanation, drop the issue number. | None. |
| 6 | 73-76 | NEW (locale bypass, date-only) | `calendarDayLabel` uses `toLocaleDateString(undefined,…)` rather than `locale-time.ts` (`localePreferences().locale`). Date-only, so the locale-time test does not flag it, but the locale can differ from the app's locale preference. | Use a `locale-time` formatter (`format({weekday:'short',day:'numeric'})`). | Low (label text may change if app locale ≠ device locale). |
| 7 | 16-18, 27, 49, 65 | D4 | Thin wrappers `firstCalendarDay`, `visibleCalendarDays`, `calendarReturnDay` add the default `count=calendarDayCount()` to the verified `…Of` functions. Needed because LemmaScript verifies pure functions without the geometry read. | Keep (proof boundary); just unexport the unused one (#1). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 11 | ~45 files | specific row types here |
| `REFERENCE_LEFT/WIDTH` | const | 14 | model.js calendar lane layout | shared calendar layout constants |
| `msToLocalMidnight` | helper | 68-71 | midnight timers in `clock-adapter.ts`/`home-cards.ts` (check) | `runtime/civil-date.ts` if a second user exists |
| `calendarDayLabel` | helper | 73-76 | `locale-time.ts` formatters | use `locale-time` |

## Proposed end state
≈108 lines: same verified functions untouched, `firstCalendarDay` unexported, typed rows, no CSS strings once the template switches to classes. Moving to `runtime/` (D11) would require updating `LemmaScript-files.txt`, the `specs/lemma/apps/app/src/prototype/calendar-days.dfy(.gen)` paths, the Quint fixture list and the T2 loaders in one commit — only worth it as part of the calendar view-owner move.

## Verification
`npm run verify` (LemmaScript regeneration/proof of `calendar-days.dfy`, Quint calendar fixture, canvas-geometry/calendar-view-rules host tests), `test/browser/calendar-wide-days.spec.ts`, large-text agenda checks.
