# test/browser-notification-clear.test.mjs
- Lines: 125 | Kind: transplant (T2; whole `browser/notifications.ts` with imports and `export` stripped, run in `vm` with ~25 injected fakes) | Verdict: DELETE; REWRITE as `test/browser/journeys/notifications.spec.ts`
- Covers: Clear all lists once, writes once and emits one change; each batched row gets the outcome its own dismissal would have; a lock between check and write dismisses nothing; dismissal marks are bounded (500) keeping live ones; `noticeRoute` id/source routing. Duplicates: Playwright `reminder-notification-dismissal.spec.ts` (held dismissal rejected after change; survives reload), `dev-notifications.spec.ts`, `notification-action-lifecycle.spec.ts`; Quint `NotificationCollection.qnt`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 33 | T2 | `replace(/export /g,'')` removes every "export " substring, including inside strings; exposes three module-private symbols onto `globalThis`. | Delete. | none |
| 2 | 35-36 | T3 | The reminder dismissal transaction is reimplemented in the test ("Closed reminder transaction port"). | Delete. | none |
| 3 | 50-54 | P8 | Counts of list/edit/change/focus calls: implementation shape (performance), not user behaviour. | Journey asserts outcome only. | low |
| 4 | 110-125 | T3 | `retainDismissed` bound + `noticeRoute` table: pure helpers. | Covered implicitly by journey case 4; drop the table. | low |
| 5 | 88-97 | — | Lock arriving mid-clear dismisses nothing: real security behaviour. | Carry. | none |

## Proposed end state
Delete. `journeys/notifications.spec.ts` carries:
1. Clear all with 40 posted reminders empties the shade and survives reload;
2. a batch with a stale reminder and a failing calendar alert clears the rest and leaves those two visible;
3. locking the screen while Clear all is writing leaves every notice in place;
4. a dismissed reminder still posted stays dismissed after many other dismissals (seed 500 marks via the dev fixture).
