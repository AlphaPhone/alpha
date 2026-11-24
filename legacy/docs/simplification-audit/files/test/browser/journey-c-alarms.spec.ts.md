# test/browser/journey-c-alarms.spec.ts
- Lines: 203 | Kind: Playwright journey, `chromium` dev profile, 2 tests (240 s, 120 s), `page.clock.setFixedTime`, `timezoneId:'UTC'`; UI-driven with read-only storage checks via `/src` imports | Verdict: MERGE into `journeys/reminders.spec.ts` ("Clock alarms, development Clock" describe); drop test 2
- Covers: an agent-proposed `clock_handoff` set/show is reviewed, approved once, recorded as `opened` (never a stronger claim), the development Clock holds exactly one alarm that survives reload, rings, snoozes, rings again, is dismissed and does not ring after restart; a declined proposal hands nothing to Clock. Duplicates: `dev-clock.spec.ts` (development Clock ring/snooze/dismiss), `agent-clock-handoff.spec.ts` (same proposal → review → receipt, 19 modes; its report also targets `journeys/reminders.spec.ts`), `clock-repeat.production.spec.ts` and `journey-core-loops.production.spec.ts` loop C (Android handoff path), `journey-a-conversation.spec.ts` test 2 (same decline card). Callers/importers: none; imports `helpers/connection-diagnostics.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-30, 71-88, 104-112, 124, 134, 147-149, 175-177, 200-202 | T6 | `actions()` and `alarms()` import `development-execution-document.ts` and `reminder-store.ts` to read proposals, journal and alarm rows. Step 8 already shows the same outcome in the visible "Check with agent" list. | Keep one shared read-only proposals helper for the receipt `status:'opened'` claim; replace alarm-row reads with the Clock dialog's visible list. | Low |
| 2 | 153-203 | T4 | The decline test repeats the generic decline card (`Cancel Keep things as they are.`, double press = one rejection, nothing in journal) that journey A test 2 covers for `create_note`. | Delete; keep a single decline case in `journeys/chat.spec.ts`. Optionally add "no alarm in Clock" as one assertion there. | Low |
| 3 | 32, 44 | D10 | `approve` matches `/^clock handoff /` (an accessible name derived from the operation type, lower case). | Fine; keep. | none |
| 4 | 33-43 | C5 | `queue()` (Settings → diagnostics → Action JSON → queue → close) is re-implemented in journeys A, B and C and elsewhere. | One harness helper `queueDevelopmentAction(page, op)`. | none |
| 5 | 9-21 | A8 | 13-line evidence boundary header. | Two lines. | none |
| 6 | 116-129 | — | Ring/snooze/ring/dismiss with `setFixedTime` is the right clock policy (no sleeps). | Keep as is. | none |

## Proposed end state
- Delete the file; test 1 becomes the "development Clock" case of `journeys/reminders.spec.ts`, sharing `queueDevelopmentAction` and the proposals read with the chat journey.
- The Android Clock handoff (production lane) stays in the same journey file under the production project (from core-loops loop C and `agent-clock-handoff`).
- Decline case removed (covered once in chat).
- Expected ~70 lines.
