# test/browser/clock-dialog-accessibility.spec.ts
- Lines: 37 | Kind: Playwright, `chromium` project; test 1 in `?mode=mock&shell=launcher`, test 2 in `?mode=dev` with an in-page `BrowserDevice.prototype.setTextScale` call and a `registerPlugin('DailyApps').listReminders()` readback | Verdict: **MERGE** into `journeys/reminders.spec.ts` (Clock section) and the accessibility sweep
- Covers: the Clock alarms dialog takes focus, traps Shift+Tab, Escape returns focus to the opener, Home and system Back close it without leaving a hidden modal; at 150 % text on 360x640 the Alarms dialog separates Saved alarms from New alarm, Cancel/Save are at least 44 px and on screen, Cancel saves nothing and Save lists the alarm without ringing. Duplicates: Clock dialog in `agent-clock-handoff.spec.ts`, `dev-clock.spec.ts` (save/list/delete), `journey-c-alarms.spec.ts`, `accessibility-lifecycle.spec.ts`, `workflow-dialog-layout.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | P2 | Home is pressed with `dispatchEvent('click')` on `button[aria-label="Home"]` because mock mode has no native event bridge (comment). | On the harness, deliver HOME as `launcher-home` (as production specs do). | Low. |
| 2 | 24 | P3, T6 | `BrowserDevice.prototype.setTextScale({percent:150})` called directly. | Use the harness `textScale` option (`accessibility-states.ts` `setTextScale` already exists). | none |
| 3 | 34 | P2 | Reminder store read through `registerPlugin('DailyApps')`. | Assert "No alarms" is still shown after Cancel instead. | none |
| 4 | 21-37 | T4 | Save/list overlaps `dev-clock.spec.ts`; tap-target sizing overlaps the sweep. | Keep focus behaviour in the reminders journey; move the 150 % layout to the sweep state catalogue ("Alarms new form"). | Low. |
| 5 | 32 | T1-adjacent | Asserts Save text colour `rgb(255, 255, 255)`. | Drop (contrast rule in the sweep covers it). | none |

## Proposed end state
One "Clock dialog owns focus" test in `journeys/reminders.spec.ts` (focus, Shift+Tab, Escape, HOME, Back) and one
sweep state for the Alarms form at 150 % text. Delete this file.
