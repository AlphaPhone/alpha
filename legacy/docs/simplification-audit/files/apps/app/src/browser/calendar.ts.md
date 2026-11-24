# apps/app/src/browser/calendar.ts
- Lines: 296 | Role: web `AlphaCalendar` plugin over the browser calendar document: agent operations with review, presentation edits, alerts, availability, agenda/workflow reads, deletions, navigation. | Verdict: SIMPLIFY
- Importers: 3 (`register.ts:15,31`, `deletions.ts:7` type, `notifications.ts`). Comment mention in `prototype/agent-calendar-adapter.ts`. Text/path pins: `specs/quint/application/manifest.json:1869,2004`, `specs/quint/refinement/application/browser-deletion-poll.mjs`, ~25 browser specs and `test/browser/helpers/browser-calendar.ts`, `test/calendar-empty-bootstrap-repro.test.mjs`, `test/fixtures/browser-daily-stores.mjs`, `test/locale-time-usage.test.mjs` (source-text), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 50, 242 | C3 | `Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',…))).map(v=>v.toString(16).padStart(2,'0')).join('')` twice. | `sha256Hex(text)` beside `revision.ts`. | None |
| 2 | 46-47, 86, 91-92, 121-122 | C3 | `executeAgent` and `readNextAgent` repeat the `active` ticket bookkeeping and the "aborted by our own signal → cancelled" catch. | `withTicket(operationId,run)` wrapper. | Low |
| 3 | 45, 52, 65, 66, 76 | D9 | `operation.type==='calendar_create'\|\|operation.type==='calendar_create_local'` written five times. | `const creating=…` once. | None |
| 4 | 274-278 | C5 | `deletionReceipt/pendingDeletions/settleDeletions/dismissDeletion/undoDeletion` are a line-for-line mirror of `daily.ts:45-49` (only document, kind and settle function differ). | Shared `deletionMethods({document,initial,kind,settle,undo})` in `journal-retention.ts`. | Low |
| 5 | 48, 103, 194, 200, 236, 256, 280 | C3 | `Intl.DateTimeFormat().resolvedOptions().timeZone` ×8. | `deviceTimeZone()`. | None |
| 6 | 41, 216 | C6 | Operation-id regex `/^[A-Za-z0-9_-]{1,128}$/` also in `daily.ts:25`, `deletions.ts:19`. | One `OPERATION_ID` constant (journal-retention or upstream contract). | None |
| 7 | 30 | D5 | Presentation retire list includes `'alpha:dev-incoming-call'` (a dev-simulator event) in product code. | Let the dev simulator dispatch `alpha:device-state` (already listened to) instead. | Low |
| 8 | 99 | B3 | `if(!Array.isArray(data.events))throw…` after `prepareCalendarSource()` already validated the same document (`calendar-store.ts:36`). | Delete. | None |
| 9 | 139, 168 | B3 | Hand validation of `input.people` shape from in-process typed callers (`prototype/calendar-adapter.ts`). | Delete or reduce to the size cap; types already guarantee shape. | Low |
| 10 | 232, 237 | C6 | Alert set `[0,10,60]`, repeat list — see `calendar-alerts.ts`, `calendar-recurrence.ts`. | Shared constants. | None |
| 11 | 73 | C1 | `journalBinding={...input.journalIdentity,operationHash}` built ad hoc; type is the inline literal from `calendar-deletions.ts:6`. | `JournalBinding` type. | None |
| 12 | 271 | D8 | 400-character date formatting expression for the delete review. | `formatEventWhen(row)` helper. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `EventRow` | type alias | 22 | `CalendarRecord` | delete alias, use `CalendarRecord` |
| `source` | const | 23 | `{id:'local',…}` source literal in `prototype/agent-calendar-adapter.ts` | keep |
| `matches` | helper | 24 | revision+field comparison in `prototype/calendar-adapter.ts` | keep |
| `fields(row)` | helper | 48 | event→`CalendarFields` in `calendar-linked-local.ts:33` (D4) | keep |
| `civil` (local) | helper | 205 | `calendar-time.ts` `civil`, `development-digest-occurrence.ts` | `calendar-time.ts` |

## Proposed end state
~250 lines: shared hash, ticket, deletion-method and zone helpers; no dev event in product retire list; no repeated validation. Browser-calendar UI is reachable only in test-mocks builds (`prototype/agent-calendar-adapter.ts:50` `browserCalendarScope=testMocksEnabled&&…`), so consider placing the whole calendar plugin behind the dev boundary (owner question). Keep method names pinned by manifest/specs.

## Verification
Quint `browser-deletion-poll`, `test/browser/calendar-*.spec.ts`, `dev-calendar-*.spec.ts`, `test/locale-time-usage.test.mjs` (T1 source-text test, delete per D10), Calendar journeys j01/j04.
