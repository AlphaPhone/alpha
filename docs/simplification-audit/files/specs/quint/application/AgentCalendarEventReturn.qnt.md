# specs/quint/application/AgentCalendarEventReturn.qnt
- Lines: 181 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; harness must be ported (currently broken by the A1 Calendar deletion)
- Covers: Maps "return to event" readback: an event is "found" only after both the exact feed and a readable source reply for the current owner/session/scope and unchanged selection. Models: `apps/app/src/runtime/agent-calendar.ts` (`verifyEventReturn`, `selection`), `agent-calendar-client.ts`, `abort-signal.ts`, `maps-event-return.ts`, upstream `calendar-api.ts` (exist). Duplicates: none for this behaviour. Callers/importers: manifest (5 tests); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/agent-calendar-event-return.mjs` (bundles the real module: good) via `test/quint-agent-calendar-event-return.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 103, 213 | A1 (follow-up) | Harness still calls `new AgentCalendar(port, {preservation…}, …)` and stops a mutation "at preservation gate". The working tree removed the `preservation` constructor parameter and the gate from `agent-calendar.ts` (D1/D4); the second argument is now the client factory, so the harness no longer constructs a valid controller. | Update the harness to the new constructor `(port, client, cache, cacheIdentity, diagnostic)`; stop the fixture mutation at the provider call instead. | High: `npm test` / Quint refinement fails until fixed. |
| 2 | 1-181 | — | Model has no preservation state; it is unaffected by the deletion. | Keep. | — |

## Proposed end state
Model unchanged. Harness bundles the real `AgentCalendar` (already import-based) with the post-deletion constructor; runs once.
