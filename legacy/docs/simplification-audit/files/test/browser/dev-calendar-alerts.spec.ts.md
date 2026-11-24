# test/browser/dev-calendar-alerts.spec.ts
- Lines: 22 | Kind: mostly module-in-page against the browser Calendar/notification stand-ins (P7); test 1 drives the UI, chromium dev build | Verdict: **DELETE**
- Covers: browser development calendar alerts: a rendered event with a 10-minute alert becomes due and opens the exact event from the dev shade; repeating alerts dismiss one date; rescheduling invalidates stale alerts; the Calendar channel switch suppresses delivery; all-day alerts at the saved zone's midnight; failed dismissal keeps the alert; deletion removes it. Duplicates: `dev-calendar-alert-boundaries.spec.ts` (all-day civil time), `notification-route-lifecycle`/`workflow-notice-taps` (shade tap routing pattern). Callers/importers: none. 5 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-21 | P7 / T6 | Tests the browser alert scheduler and browser notification store via `registerPlugin(...)` and `calendarDocument.readRaw()`. Android alerts come from the native calendar provider. | Delete. | Low for the APK; see chunk summary for the shade→event routing. |
| 2 | 9 | P2 | Test 1 opens Calendar through `openBrowserCalendar`, which forces `calendarAuthority:'browser-local'` by walking React fibers (`helpers/browser-calendar.ts:5-20`). | — | none |
| 3 | 21 | P3 | `IDBObjectStore.prototype.put` patch to fail dismissal. | — | none |
| 4 | 2, 5 | — | `guardCalendarFixture` (from `calendar-draft-readiness.ts`) disables media for the whole context; still used by 24 files. | — | none |

## Proposed end state
File removed. Keep at most one dev-surface smoke step for the dev shade's calendar alert if the owner keeps the browser calendar simulator (D19).
