# test/browser/calendar-form-controls.spec.ts
- Lines: 105 | Kind: Playwright, chromium, 6 tests; real UI but reads/patches view state through React fiber `vget/vset` (s0 r37, clock) | Verdict: MERGE into `journeys/calendar.spec.ts` (form section)
- Covers: day chips reach a month ahead and keep Today one tap away; Start later never moves the start earlier near midnight; reminder mode hides unsupported fields and keeps event fields on switching back; five/six-row month grids; direct date/time inputs reach distant and overnight ends; typed guest addresses deduplicate case-insensitively. Duplicates: month grid also in `dev-calendar-preferences.spec.ts`, `calendar-month-focus.spec.ts`. Callers/importers: chromium only; imports `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | P2 / T6 | `calendar()` walks `__reactFiber$` to `shell.vget('calendar')` and `vset` to patch `{t,d}`; assertions are on internal fields (`form.off`, `form.t`, `form.who`). | Assert visible values: selected chip label, Start time input value, guest chips. Set times through the Start time / duration inputs. | Low |
| 2 | 29 | P2 | `div.scr[style*="pan-x"]` CSS-selector for the chip row. | Give the row an accessible name; use `getByRole('group',{name:'Day'})`. | Low (product markup change) |
| 3 | 44-52 | P2 | Start-later boundaries set by `vset` patch, not by the user. | Fill Start time 23:30 etc., click Start later, read the input. | None |

## Proposed end state
Five cases in `journeys/calendar.spec.ts` form section driven only by visible controls: chips/Today, Start later near midnight, reminder field switch, month grid row count, direct date/time + guest dedupe. No fiber access. Delete this file.
