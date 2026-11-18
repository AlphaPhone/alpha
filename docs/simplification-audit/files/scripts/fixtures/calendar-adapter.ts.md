# scripts/fixtures/calendar-adapter.ts
- Lines: 93 | Kind: source-transplant harness (T2) | Verdict: DELETE (with `scripts/test-calendar-crud-review.ts` and `scripts/test-calendar-query-race.ts`); REWRITE the behaviour as `journeys/calendar.spec.ts` cases
- Covers: runs `apps/app/src/prototype/calendar-adapter.ts` against native-Calendar fixture rows to check event edit/delete busy and "write uncertain" states and the query race. Duplicates: Calendar Playwright specs (`test/browser/calendar-*.spec.ts`; 45 Calendar specs per research/tests-browser.md) and the Quint calendar replay (`specs/quint/refinement/application/calendar-itf.mjs`). Callers/importers: only `scripts/test-calendar-crud-review.ts` and `scripts/test-calendar-query-race.ts`, run as child suites by `test/adapter-contracts.test.mjs`. (research/scripts.md also lists Playwright specs as callers; those match the product file name `calendar-adapter`, not this fixture. A grep for `fixtures/calendar-adapter` finds only the two scripts.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62-64 | T2 | Reads `calendar-days.ts`, `calendar-interval-presentation.ts` and `calendar-adapter.ts` as **text**, strips every `import` line and every `export ` keyword by regex. | Delete. Cover through the running app. | L |
| 2 | 71-73 | T2/T10 | Prepends a fake `currentSurfaceLayout` and deletes the literal `const calendar = registerPlugin<any>('AlphaCalendar');` by exact string. Any reformat of that line (D9 Prettier pass) silently leaves the real plugin call in. | Delete. | L |
| 3 | 75-92 | T2/T3 | Evaluates the stripped text in `vm.runInNewContext` with about 20 hand-written globals (`Capacitor`, `DailyApps`, `mapsEventOriginFor`, recovery openers that throw, ...). The adapter's real dependency graph is never loaded. | Delete. | L |
| 4 | 3 | T9 | A `scripts/` file imports `test/support/strip-types.mjs`, so test support depends on a script and the reverse. | Goes away with the file. | L |
| 5 | 6-60 | C1 | Re-declares calendar state, API and view types locally (`CalendarFixtureState`, `CalendarFixtureApi`, `CalendarFixtureView`). | Goes away with the file. | L |

## Proposed end state
Delete the file and both importers. Carry these cases into `journeys/calendar.spec.ts` (Playwright, test-mocks harness, native Calendar bridge
fake): editing an event shows busy and blocks a second edit; a native write that returns no result shows the "may not have saved" state and
offers re-check; a stale query result arriving after a newer one does not replace the visible list. Check `test/browser/calendar-*` first:
the race may already be covered there, in which case only the uncertain-write case needs adding.
