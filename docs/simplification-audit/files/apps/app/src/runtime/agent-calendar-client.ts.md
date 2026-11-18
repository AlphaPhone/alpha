# apps/app/src/runtime/agent-calendar-client.ts
- Lines: 17 | Role: binds upstream `createCalendarApi` to the authenticated `AppRecordPort` (fetch adapter with owner/agent fence) | Verdict: MERGE into `apps/app/src/runtime/app-record-route-policy.ts` (renamed `app-record-port.ts`) as a shared `appRecordFetch`
- Importers: only `runtime/agent-calendar.ts` (also re-imports the `AppRecordPort` type through this file). Text/path pins: `scripts/test-agent-calendar-mutation-flow.ts`, `test/canonical-notes-webview-abort.test.mjs`, `specs/quint/application/manifest.json` and `specs/quint/services/manifest.json` sources arrays, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | C5 | The fetch adapter (`method` check → body must be string → `JSON.parse` → `port.request(path,method,body,signal)` → re-check current) is duplicated in `prototype/canonical-notes-controller.ts:15-22` for Notes. | One `appRecordFetch(port, signal, {methods, current, label})` next to `AppRecordPort`; Calendar and Notes pass their method lists. | Low. |
| 2 | 8, 10, 15 | C6 | `throw Error('Calendar owner or agent changed')` written three times. | One `assertCurrent()` closure. | None. |
| 3 | 11 | B3 | Method allowlist re-checked here although every request reaches `connection-ui.tsx:2453` `assertAppRecordRequestAllowed(path,method,body)` which enforces the owner route table. | Drop the local allowlist; keep the route-policy check at the transport boundary. | Low. |
| 4 | 4-5 | D4 | `export type {AppRecordPort}` re-export and `AgentCalendarClient = CalendarApi` alias. | `agent-calendar.ts` imports `AppRecordPort` from the policy module and `CalendarApi` from upstream. | None. |
| 5 | 9-16 | D8 | Multi-statement one-liners. | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AgentCalendarClient` | type alias | 5 | upstream `CalendarApi` | delete, use upstream |
| request adapter closure | helper | 9-16 | prototype/canonical-notes-controller.ts:15-22 | `app-record-port.ts` `appRecordFetch` |

## Proposed end state
File deleted. `app-record-port.ts` gains `appRecordFetch` (~12 lines) used by `agent-calendar.ts` (`createCalendarApi(appRecordFetch(port, signal, …))`) and `canonical-notes-controller.ts`. Estimated lines after: 0 here.

## Verification
`scripts/test-agent-calendar-mutation-flow.ts`, `test/canonical-notes-webview-abort.test.mjs`, `test/agent-calendar-mutation.test.mjs`, quint agent-calendar refinements; update manifest `sources` arrays and feature-parity inventory.
