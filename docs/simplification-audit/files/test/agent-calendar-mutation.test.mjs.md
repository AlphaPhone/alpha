# test/agent-calendar-mutation.test.mjs
- Lines: 9 | Kind: tooling wrapper (spawns `scripts/test-agent-calendar-mutation-flow.ts`, 154 lines) | Verdict: DELETE (wrapper and script)
- Covers: Agent Calendar write serialization and release after a failed legacy-preservation check; also Calendar sync-review routes and editor minute round-trips. Duplicates: `test/quint-agent-calendar-mutation.test.mjs` (same controller, 24 traces), `test/browser/` Calendar specs for editor timing. Callers/importers: `npm test` glob only; the script has no other caller (scripts research).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | T9 | Wrapper around a script that is the real test; no `NODE_TEST_CONTEXT` scrub (unlike `child-suite.mjs`). | Delete. | None |
| 2 | script 13-56, 76 | A1 | The script's subject is `CalendarPreservation` (legacy calendar capture). The in-flight A1 change removes that type and the constructor's second parameter (`git diff apps/app/src/runtime/agent-calendar.ts`), so the script now passes the preservation object as the client factory and is broken. | Delete with the feature. | None |
| 3 | script 80-113 | A2 | Sync review / control routes belong to the linked-sync stack D4 deletes on the renderer side. | Delete, or keep only if the agent-side sync control stays (owner question Q-CAL-1). | Low |
| 4 | script 115-154 | T3 | Pure editor-time round-trip unit tests (`calendarFormMinutes`, `calendarFormPatch`). | Move to `journeys/calendar.spec.ts` (edit an event at 09:07 across a DST change) or drop. | Low |
| 5 | - | T4 | Serialization of writes is the subject of the `agent-calendar-mutation` Quint model and replay. | Keep the replay only. | - |

## Proposed end state
Wrapper and `scripts/test-agent-calendar-mutation-flow.ts` deleted. Write serialization stays covered by the
`agent-calendar-mutation` Quint replay (whose harness must also drop the preservation port). One DST editing case goes
into `journeys/calendar.spec.ts`.
