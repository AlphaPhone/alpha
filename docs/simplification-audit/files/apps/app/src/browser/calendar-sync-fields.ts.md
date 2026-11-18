# apps/app/src/browser/calendar-sync-fields.ts
- Lines: 177 | Role: maps browser calendar attendees/recurrence to and from Google linked-sync semantic events (RRULE/EXDATE). | Verdict: DELETE (with the linked-sync stack, D4)
- Importers: 4 (`calendar-linked-local.ts`, `runtime/calendar-linked-provider.ts`, `runtime/calendar-sync-host.ts`, `runtime/native-calendar-sync.ts`) — all members of the superseded client-side linked-sync stack. Text/path pins: `specs/quint/services/manifest.json:2342`, `test/native-calendar-sync-port.test.mjs`, `test/browser/calendar-sync-fixture.ts`, `test/fixtures/browser-daily-stores.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-177 | A2 | Every importer is in the stack DECISIONS D4 deletes (`runtime/native-calendar-sync.ts` is imported only by `calendar-sync-host.ts`; `calendar-linked-provider.ts` only by `cloud-protocol.ts`'s `googleCalendarSync`, listed for deletion in `research/app-runtime-a-m.md` §3). | Delete with the stack; remove the services-manifest entry and the three test/fixture users. | Medium — confirm with the runtime chunk that `CloudProtocol.googleCalendarSync` and the Android `CalendarSyncBridge` go too; if native sync is kept, MOVE this file to `runtime/` instead (it runs on Android). |
| 2 | 9-10 | C3 | Email regex `/^[^\s@,;<>]+@…$/` is a variant of the four copies in `simulated-inbox.ts`. | n/a if deleted; else shared `isEmailAddress`. | — |
| 3 | 4-8 | C3 | repeat→RRULE map duplicates `prototype/agent-calendar-adapter.ts:200`, `prototype/calendar-adapter.ts:36`. | n/a if deleted; else export from `calendar-recurrence.ts`. | — |
| 4 | 65 | A8 | Comment "Older edits kept them." narrates history. | n/a if deleted. | — |
| 5 | 171-176 | B1 | `canonicalSyncRecurrence` catch-all returns the input verbatim — documented fallback. | n/a. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `rules` RRULE map | const | 4-8 | `prototype/agent-calendar-adapter.ts:200`, `prototype/calendar-adapter.ts:36` | delete / `calendar-recurrence.ts` |
| `email` | helper | 9-10 | `simulated-inbox.ts:7,21,24` | delete / shared `isEmailAddress` |
| `CalendarAttendeeResolver` | type | 11 | none | delete |

## Proposed end state
File removed.

## Verification
`npm run verify` typecheck + feature-parity; Quint services manifest; `test/native-calendar-sync-port.test.mjs` removed with the stack.
