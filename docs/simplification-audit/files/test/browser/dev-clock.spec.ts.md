# test/browser/dev-clock.spec.ts
- Lines: 56 (12 tests) | Kind: Playwright `chromium`, dev build; 30 `/src` imports, `page.clock.setFixedTime` jumps, 3 wall sleeps, prototype surgery | Verdict: **MERGE** into `journeys/reminders.spec.ts` (3 cases)
- Covers: the browser Clock alarms dialog (set, list, reload, delete, ring, snooze, dismiss, recurring advance), alarm and notification sound volume/DND, tab ownership, sound-receipt bounds, failed writes, and mock mode never handing off to Clock. Duplicates: Android Clock handoffs are covered by `journey-core-loops.production.spec.ts`, `clock-repeat.production.spec.ts`, `clock-dialog-accessibility.spec.ts` and `agent-clock-handoff.spec.ts` (the file says so at 43-46). Callers/importers: `chromium` project; no helpers.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | — | Real journey: caveat "Rings only while this page is open", set, reload, delete, Back. | Carry. Drop the screenshot. | none |
| 2 | 10-12 | P2, P10 | Ring/snooze/dismiss seeds the alarm with `DailyApps.scheduleReminder` in-page and probes `clockDecision` for a stale result. | Carry the visible part (seed through the dialog, then `clock.install` + `runFor`); drop the `clockDecision` probe. | Low |
| 3 | 13-15, 36-41 | T6, P3 | Invalid `clockHandoff` inputs, `BrowserDaily` with a stubbed `scheduleReminder`, IDB `put` patches and a `navigator.locks` hold. | Delete. | Low |
| 4 | 16-18, 29-32 | T8, P3 | Fake `AudioContext` class; absence of sound proven by `waitForTimeout(1100)` and `(1200)` (research P10). | Delete. | Medium: alarm volume/DND and notification-tone level coverage is lost (browser stand-in only; native audio is Android's). |
| 5 | 19-21 | P7 | Two-tab alarm ownership via a `data-dev-background` attribute: a browser-tab concept with no device equivalent. | Delete. | Low |
| 6 | 22-24 | A1 | "DND legacy-state toggle" seeds a legacy `alpha.browser.device.v1` value `{music:70}` and toggles without `enabled` (legacy reader path). | Delete with the legacy reader (D1). | none |
| 7 | 33-35 | T6 | Bounded sound receipts: edits `alertSoundDocument` directly. | Delete. | Low |
| 8 | 25-27 | — | Recurring alarm dismiss advances the next occurrence; asserts on `listReminders()`. | Carry as a step, asserting the next time shown in the dialog. | Low |
| 9 | 47-56 | P3, production gating | Mock mode simulates the Clock request; patches `BrowserDaily.prototype.clockHandoff` to count calls. | Carry; replace the prototype patch with "no alarm is listed afterwards" in the dialog. | Low |
| 10 | 7, 43-46 | A8 | Comment cross-references other specs and a requirement id. | Keep one line naming the covering production spec. | none |

## Proposed end state
`journeys/reminders.spec.ts` "Clock (browser development)" describe with three cases: set/list/reload/delete; ring → snooze → ring → dismiss (and a daily alarm advancing) on an installed clock with `runFor`; mock-mode review shows the simulated message and lists no alarm. No audio fakes, no prototype patches, no sleeps. Delete the file.
