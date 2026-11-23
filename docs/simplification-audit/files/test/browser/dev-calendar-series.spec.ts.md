# test/browser/dev-calendar-series.spec.ts
- Lines: 25 (6 tests, minified one-liners) | Kind: Playwright `chromium`, dev build (`?mode=dev`), mixed UI and module-in-page (14 `/src` imports) | Verdict: **MERGE** into `journeys/calendar.spec.ts` (2 cases)
- Covers: repeating events on the browser development calendar: create a daily series, edit or delete one occurrence, edit or delete the whole series with explicit scope, plus agent occurrence mutation, conflict, failed write and series-move regeneration through `registerPlugin('AlphaCalendar')`. Duplicates: the agent-mutation case overlaps `test/agent-calendar-mutation.test.mjs` and the agent-side calendar path (`agent-calendar.ts`); the Undo window overlaps other `calendar-*` delete specs. Callers/importers: run by the `chromium` project; imports `app-navigation.ts` (`returnToApps`) and `helpers/browser-calendar.ts` (`openBrowserCalendar`, `chooseCalendarEventAction`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T6, P2 | `range()` reads events through `import('/src/platform-plugins.ts')` and `AlphaCalendar.list`; every UI test asserts on it instead of on visible rows. | Assert on the rendered day/agenda rows. | Low |
| 2 | 11-13 | T6 | "agent mutation and replay" seeds and executes through `cal.save`/`cal.executeAgent` in-page; only the Confirm click is UI. It tests the browser stand-in's agent executor, not the resident agent (`agent-calendar.ts` is the product path, D4). | Delete. | Low; agent occurrence identity is covered by `test/agent-calendar-mutation.test.mjs`. |
| 3 | 17-19 | T6, P3 | Conflict and failed-write case patches `IDBObjectStore.prototype.put`, uses a `MutationObserver` that clicks a dialog button by text, and reads `calendarDocument.readRaw()`. | Delete. | Medium: concurrent-edit conflict on series delete loses coverage (browser stand-in only). |
| 4 | 20-22 | T8, T6 | Series move waits a real `setTimeout(11000)` inside `page.evaluate` for the Undo window, then calls `settleDeletions()`; 60 s file timeout (line 5) exists for this. | Delete; if carried, use `page.clock.runFor`. | Medium: exception dates kept when moving a series are covered nowhere else. |
| 5 | 23-25 | T6 | Overlapping multi-day occurrence resolution: pure plugin calls, no UI. | Delete. | Low |
| 6 | 2, 6 | A1 | `openBrowserCalendar` selects the "Browser calendar (development)" source through the retained-source helper whose header says it seeds "authority retained from older installations". | Use the harness navigation once legacy authority selection is deleted. | Low |
| 7 | 6, 9-16 | D8 | Whole tests on single 600-1,900-character lines. | Formatter (D9). | none |

## Proposed end state
Two steps inside `journeys/calendar.spec.ts` ("repeating event" describe):
1. Create "Daily planning" with Repeat Daily, edit one occurrence title, delete that occurrence ("This occurrence only"), reload, see the two siblings (case from lines 8-10, assertions on rendered rows).
2. Open the series, "Edit series" with explicit Confirm, rename and change to weekly; "Delete series" Cancel keeps it, Confirm removes it, reload shows none (lines 14-16).
Use `page.clock.install` + `runFor(10_000)` for the Undo window. Delete the other four tests and this file.
