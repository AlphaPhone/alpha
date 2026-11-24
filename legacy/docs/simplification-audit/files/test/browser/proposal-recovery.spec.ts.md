# test/browser/proposal-recovery.spec.ts
- Lines: 136 | Kind: Playwright, chromium (dev server), 7 generated tests; real UI send + review, inline Capacitor bridge emulating a paired local agent, two in-page `connectionController` imports | Verdict: **MERGE** into `journeys/chat.spec.ts` ("agent proposals" section)
- Covers: when an agent turn ends with `PLANNER_INTERRUPTED_AFTER_ACTION`, the client lists pending proposals and shows only reviewable ones (right owner, not expired, matching selection context); approving the one valid proposal runs decision → claim → effect → receipt once with journal `get, reserve, markApplying, finish`; rate-limit with no proposals shows the rate-limit line; a disconnect while proposals are listed shows "Request cancelled"; a notes query proposed from Calendar is surfaced as "Review Notes on Home". Duplicates: the same paired-agent fixture is copied almost verbatim into `reminder-v2-assistant.spec.ts:18-87`; proposal approval is also exercised in `device-action-*` specs (other chunks). Callers/importers: imports `helpers/connection-diagnostics`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-74 | C3 / C5 / T7 | A 65-line inline bridge (AlphaConnection secure slots + CAS, AlphaActionJournal, paired-agent HTTP routes, proposal endpoints) that is duplicated in `reminder-v2-assistant.spec.ts`. | Extract `harness/plugins/agent-proposals.ts` (pairing, conversation post with `terminalFailure`, proposal list/decision/claim/receipt counters, journal recorder) and use it from both specs. | Low |
| 2 | 84-90 | T6 | `connectionController.setDeviceExecutor` is replaced in-page so the "effect" is a counter, not the product executor. | Let the real executor run `create_note` and assert the note appears in Notes; keep the journal order assertion. | Medium: the real executor may need the Notes store seeded |
| 3 | 100-104 | T6 | `stale-session` disconnects through an imported `connectionController.disconnect()`. | Disconnect through Settings → Agent connection → Disconnect agent, as a user would. | Low |
| 4 | 77-83 | D5 | Drives the dev-only "Local development agent" pairing form. This harness is kept under D5/D6 while specs need it. | Keep, behind the shared `connectLocalDevAgent(page)` helper (it is repeated in `reminder-v2-assistant`, `resident-background-results`). | none |
| 5 | 6 | – | The seven modes are all distinct and cheap (no sleeps). | Carry all seven as one table-driven test group. | none |

## Proposed end state
In `journeys/chat.spec.ts`, `describe('interrupted reply recovers only reviewable proposals')` with the seven modes, using
`harness/plugins/agent-proposals.ts` and `connectLocalDevAgent`. The real device executor creates the note; disconnect goes
through Settings. No in-page module imports remain.
