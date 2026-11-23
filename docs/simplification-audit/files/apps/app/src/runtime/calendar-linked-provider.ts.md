# apps/app/src/runtime/calendar-linked-provider.ts
- Lines: 26 | Role: binds upstream `googleCalendarSyncPort` with Alpha's recurrence canonicaliser and re-exports `calendarSyncHttp` types for CloudProtocol | Verdict: DELETE (with the client-side Calendar linked-sync stack)
- Importers: `runtime/cloud-protocol.ts:4` (`calendarSyncHttp`, `CalendarSyncRequest` for `googleCalendarSync`). `googleCalendarSyncPort` has 0 app importers. Text/path pins: `scripts/test-calendar-sync-provider.ts:10`, `test/native-calendar-sync-port.test.mjs:70`, `specs/quint/services/manifest.json` sources (225, 2344), feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-26 | A2 | Dead client-side linked-sync stack (research P11): `calendar-sync-settings.ts` → `openCalendarSyncSettings` has no importer in apps/android (whole-repo grep; callers only `test/browser/calendar-sync-fixture.ts:64`, `test/calendar-sync-settings-navigation.test.mjs`); `calendar-sync-host.ts` is imported only by calendar-sync-settings.ts; `calendar-linked-storage.ts` and `native-calendar-sync.ts` only by calendar-sync-host.ts; `calendar-linked-store.ts` only by those and calendar-linked-provider.ts; `calendar-linked-provider.ts` only by `cloud-protocol.ts:4` for `CloudProtocol.googleCalendarSync` (L548), whose only caller is the upstream sync controller driven by calendar-sync-host. The live path is `AgentCalendar.reviewSync/changeSync` + `google-accounts.ts linkGoogleCalendar`. | Delete this file, `CloudProtocol.googleCalendarSync` (cloud-protocol.ts:4, 548-…), `scripts/test-calendar-sync-provider.ts`, the `googleCalendarSyncPort` block of `test/native-calendar-sync-port.test.mjs`, and the manifest/feature-parity entries. | High confidence in the renderer; owner OK on AP-09 "local-first sync" being the agent-side control. |
| 2 | 9-14 | D4 | Re-export of upstream `calendarSyncHttp` and types. | Gone with the file. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `googleCalendarSyncPort` | helper | 17-26 | `native-calendar-sync.ts` uses the same recurrence binding | delete |

## Proposed end state
File removed.

## Verification
`npm run verify` typecheck (cloud-protocol), `test/native-calendar-sync-port.test.mjs` (delete or trim), services quint manifest update.
