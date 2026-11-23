# apps/app/src/runtime/calendar-linked-storage.ts
- Lines: 35 | Role: checkpoint storage for the client-side Calendar linked sync: Android encrypted slot or browser JSON document `alpha.browser.calendar-linked-sync:v1:<hash>` | Verdict: DELETE (with the linked-sync stack)
- Importers: `runtime/calendar-sync-host.ts` only. Text/path pins: `test/browser/calendar-linked-storage.spec.ts` (in-page imports), `test/native-secure-slots.test.mjs:97` (special-cases this path's `slot` argument), `scripts/storage-specs.ts:10`, `specs/quint/native/manifest.json:1351`, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-35 | A2 | Dead client-side linked-sync stack (research P11): `calendar-sync-settings.ts` → `openCalendarSyncSettings` has no importer in apps/android (whole-repo grep; callers only `test/browser/calendar-sync-fixture.ts:64`, `test/calendar-sync-settings-navigation.test.mjs`); `calendar-sync-host.ts` is imported only by calendar-sync-settings.ts; `calendar-linked-storage.ts` and `native-calendar-sync.ts` only by calendar-sync-host.ts; `calendar-linked-store.ts` only by those and calendar-linked-provider.ts; `calendar-linked-provider.ts` only by `cloud-protocol.ts:4` for `CloudProtocol.googleCalendarSync` (L548), whose only caller is the upstream sync controller driven by calendar-sync-host. The live path is `AgentCalendar.reviewSync/changeSync` + `google-accounts.ts linkGoogleCalendar`. | Delete; remove `calendar-linked-storage.spec.ts`, its `storage-specs.ts` entry, the `native-secure-slots.test.mjs:97` special case, and the Android `calendar-linked-sync:v1:` slot allowance if the native owner confirms. | Medium (Android slot allowlist needs owner). |
| 2 | 5 | D11 | Local `const document = (slot)=>…` shadows the DOM `document` global. | Gone with the file. | None. |
| 3 | 14, 25 | style | `Capacitor.isNativePlatform()` vs `getPlatform()==='android'` elsewhere. | n/a. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| native-slot-or-browser-document adapter | helper | 11-35 | C4 durable-store twins (assistant-draft-store.ts, notes, clock-handoff-history) | delete |

## Proposed end state
File removed.

## Verification
`test/native-secure-slots.test.mjs`, `scripts/storage-specs.ts` list, native quint manifest.
