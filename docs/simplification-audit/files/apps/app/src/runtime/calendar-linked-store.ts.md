# apps/app/src/runtime/calendar-linked-store.ts
- Lines: 26 | Role: binds upstream `CalendarLinkedStore` with Alpha's idempotency namespace `alpha-calendar-sync` and re-exports its types | Verdict: DELETE (with the linked-sync stack)
- Importers: runtime/calendar-linked-provider.ts (type), runtime/calendar-linked-storage.ts (type), runtime/calendar-sync-host.ts, runtime/native-calendar-sync.ts (type) — all part of the dead stack. `CalendarLinkedStore` value has 0 app importers. Text/path pins: `test/calendar-linked-store.test.mjs:8`, `test/browser/calendar-linked-storage.spec.ts`, `specs/quint/refinement/services/calendar.mjs:10,18` (`sourceModule` of this path), `specs/quint/services/manifest.json:226`, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-26 | A2 | Dead client-side linked-sync stack (research P11): `calendar-sync-settings.ts` → `openCalendarSyncSettings` has no importer in apps/android (whole-repo grep; callers only `test/browser/calendar-sync-fixture.ts:64`, `test/calendar-sync-settings-navigation.test.mjs`); `calendar-sync-host.ts` is imported only by calendar-sync-settings.ts; `calendar-linked-storage.ts` and `native-calendar-sync.ts` only by calendar-sync-host.ts; `calendar-linked-store.ts` only by those and calendar-linked-provider.ts; `calendar-linked-provider.ts` only by `cloud-protocol.ts:4` for `CloudProtocol.googleCalendarSync` (L548), whose only caller is the upstream sync controller driven by calendar-sync-host. The live path is `AgentCalendar.reviewSync/changeSync` + `google-accounts.ts linkGoogleCalendar`. | Delete with the stack; retire `test/calendar-linked-store.test.mjs` and the quint `services/calendar.mjs` harness (or point it at upstream `linked-store.ts`, as `calendar-linked.mjs` already does). | Medium (quint services model). |
| 2 | 9-13 | A1 | "installed provider idempotency keys keep their original prefix" — protects keys written by an older install; this package never reached the stack in production. | Gone with the file. | Low. |
| 3 | 16-26 | D4 | Wrapper object around one upstream call. | Gone. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ALPHA_CALENDAR_SYNC_NAMESPACE` | const | 13 | used by calendar-sync-host.ts:276 | delete |

## Proposed end state
File removed.

## Verification
Services quint model update, `npm run verify`.
