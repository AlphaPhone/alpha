# apps/app/src/runtime/native-calendar-sync.ts
- Lines: 68 | Role: renderer binding of the Android `AlphaCalendar` bridge for client-side Google↔device Calendar linked sync (prepare/enable/list/get/apply/delete with receipts). | Verdict: DELETE (with the client-side linked-sync stack; owner sign-off for the Android bridge)
- Importers: 1 — `runtime/calendar-sync-host.ts:25`, which is itself imported only by `runtime/calendar-sync-settings.ts:2`; `openCalendarSyncSettings`/`startCalendarSyncHost` have no importer in `apps/` (git grep). Production imports only the type `CanonicalCalendarSyncSettings` from calendar-sync-settings. Android mentions it in a comment (`RendererCredentialSlots.java:14`).
- Text/path pins: `test/support/feature-parity.mjs:561`; `specs/quint/native/manifest.json:1350` (ControllerComposition sources) and `specs/quint/services/manifest.json`; `test/native-calendar-sync-port.test.mjs` reads the source text (T2).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-68 | A2 | Part of the superseded client-side linked-sync stack (research a–m P11). Live Calendar sync is `agent-calendar.ts` `changeSync()` + `google-accounts.ts` `linkGoogleCalendar`. | Delete this file together with `calendar-sync-host.ts`, `calendar-sync-settings.ts` (keep the exported type), `calendar-linked-*`, their tests and manifest sources. | Medium: owner must confirm AP-09 is served by the agent path; Android `AlphaCalendar` sync methods become dead too. |
| 2 | 7-8 | C2/B2 | `bridge(){...return registerPlugin<NativeBridge>('AlphaCalendar');}` registers per call with an inline type. | If kept: one typed `AlphaCalendar` singleton in `native/plugins.ts`. | Low |
| 3 | 12 | D9/D8 | six-way nested ternary `value.status==='cancelled'?...:value.status==='context-changed'?...` | If kept: `const MESSAGES:Record<string,string>={cancelled:'Calendar sync was not enabled.',…}`; `MESSAGES[status]??'Device Calendar sync is unavailable…'`. Copy byte-for-byte. | Low |
| 4 | 14 | C3 | `function object(value)` plain-object guard (≈35 twins). | `asRecord(value,msg)` from `lib/`. | Low |
| 5 | 20 | C3 | loose lease regex `/^[a-f0-9-]{36}$/`. | `isUuid` from `lib/ids.ts` only after checking the Java lease generator emits canonical UUIDs. | Low |
| 6 | 26-27, 36 | C4/P11 | same fence written three times: `signal?.throwIfAborted();if(!current()||document.hidden)throw new DOMException(...)`. | One local `fence()` (or shared `ownedOperation`). | Low |
| 7 | 31-32 | B3/D8 | 600-char validators; attendees and recurrence are checked in L31 and checked again while mapping in L32 (`if(typeof guest.email!=='string'…)throw`, `if(typeof line!=='string')throw`). | Validate once while mapping. | Low |
| 8 | 34 | C3 | SHA-256→hex copy. | `sha256Hex(JSON.stringify(value))`. | None |
| 9 | 36-45 | D8 | whole methods on one line; `operationId` loop variable (L45) shadows the module function `operationId` (L34). | Format; rename loop variable. | None |
| 10 | 40 | B1 | `void bridge().sync({kind:'cancel'}).catch(()=>{})`. | Keep only with a comment that cancel is best-effort; otherwise report to crash log. | Low |
| 11 | 51,55,59 | D3/C6 | window events `'alpha:calendar-committed'`, `'alpha:deletions-changed'` as string literals. | Named constants beside their listeners (if the file survives). | Low |
| 12 | 62 | C3 | hand-written abortable 400 ms sleep. | `sleep(ms,signal)` in `lib/abort.ts`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Value` | type | 6 | `Bag`/`Record<string,unknown>` in ~60 files | `lib/records.ts` |
| `NativeBridge` | type | 7 | none (AlphaCalendar typed only here) | `native/plugins.ts` (or deleted) |
| `NativeCalendarSource` | type (exported, no external user) | 9 | — | delete export |
| `object` | helper | 14 | `remote-protocol.ts:65`, `owner-reminder-notification-protocol.ts:24`, `cloud-protocol.ts:124` … | `lib/records.ts` `asRecord` |
| `operationId` | helper (sha256 hex) | 34 | ~25 copies (`sms-agent-contract.ts:4`, `note-origin.ts:32`, …) | `lib/hash.ts` `sha256Hex` |
| inline abortable sleep | helper | 62 | `lib/abort` proposals | `lib/abort.ts` `sleep` |

## Proposed end state
Deleted with the client-side linked-sync stack (calendar-sync-host, calendar-sync-settings minus its type, calendar-linked-store/provider/storage). If the owner keeps it: ~50 lines, typed plugin from `native/plugins.ts`, message table, one fence, shared `asRecord`/`sha256Hex`/`sleep`.

## Verification
`test/native-calendar-sync-port.test.mjs` (delete with the file), Quint `ControllerComposition` (remove the source path from `specs/quint/native/manifest.json`), `feature-parity.mjs` path list, `npm run verify`, Android build (AlphaCalendar plugin still compiles).
