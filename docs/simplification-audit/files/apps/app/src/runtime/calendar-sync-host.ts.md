# apps/app/src/runtime/calendar-sync-host.ts
- Lines: 345 | Role: Alpha host for upstream `createCalendarSyncHost`: settings store, owner/target identity, Google destination listing, native/browser local ports, foreground scheduler with window events and a BroadcastChannel | Verdict: DELETE
- Importers: runtime/calendar-sync-settings.ts only (itself unreachable). Text/path pins: `specs/quint/refinement/composition/ports.mjs:58` (imports `calendarSyncHost`, `startCalendarSyncHost`), `specs/quint/native/manifest.json:543,1349`, `specs/quint/services/manifest.json:227`, `test/browser/calendar-sync-settings.spec.ts:8`, `test/calendar-linked-store.test.mjs:336` (readFileSync, T1), feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-345 | A2 | Dead client-side linked-sync stack (research P11): `calendar-sync-settings.ts` → `openCalendarSyncSettings` has no importer in apps/android (whole-repo grep; callers only `test/browser/calendar-sync-fixture.ts:64`, `test/calendar-sync-settings-navigation.test.mjs`); `calendar-sync-host.ts` is imported only by calendar-sync-settings.ts; `calendar-linked-storage.ts` and `native-calendar-sync.ts` only by calendar-sync-host.ts; `calendar-linked-store.ts` only by those and calendar-linked-provider.ts; `calendar-linked-provider.ts` only by `cloud-protocol.ts:4` for `CloudProtocol.googleCalendarSync` (L548), whose only caller is the upstream sync controller driven by calendar-sync-host. The live path is `AgentCalendar.reviewSync/changeSync` + `google-accounts.ts linkGoogleCalendar`. `startCalendarSyncHost` has 0 callers anywhere in apps/ (only the quint composition harness). | Delete this file together with calendar-sync-settings.ts, calendar-linked-{store,storage,provider}.ts, native-calendar-sync.ts (68), browser/calendar-linked-local.ts (186, only imported here + specs), browser/calendar-sync-fields.ts (177, only stack + tests), `CloudProtocol.googleCalendarSync`, the `alpha:calendar-sync-*` window events, `AlphaCalendarPlugin`/`CalendarSyncBridge.java` sync methods (Android owner), and the tests/specs listed in each file report. | High in renderer; Android side needs owner. |
| 2 | 299-301 | B2 | `typeof BroadcastChannel === "undefined"` guard. | Gone with the file. | — |
| 3 | 292-296, 319 | B1 | `.catch(() => {})` on native observer removal. | Gone. | — |
| 4 | 42-43 | C6 | Hard-coded native settings slot hash `calendar-linked-sync:v1:7d1f8a…`. | Gone (Android allowlist entry with it). | Medium (native owner). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `owner()/target()/identity()` | helper | 59-112 | session/identity tuples in google-accounts.ts, agent-calendar.ts | delete |
| `googleCalendarSyncDestinations` | helper | 125-160 | google-accounts.ts calendar listing for `linkGoogleCalendar` | delete |
| `deviceGate` | const | 115-122 | native-calendar-sync.ts | delete |

## Proposed end state
File removed (−345 lines; whole stack ≈ −1,120 lines incl. browser helpers and native-calendar-sync).

## Verification
`npm run verify` (typecheck, quint manifests after removing entries), delete `test/browser/calendar-sync-settings.spec.ts`, `calendar-sync-fixture.ts`, `calendar-linked-storage.spec.ts`, `test/calendar-sync-settings-navigation.test.mjs`, `test/calendar-linked-store.test.mjs`, `test/calendar-agent-write-host.test.mjs`, `test/calendar-managed-rejection.test.mjs` (check they test only the stack), `scripts/test-calendar-sync-provider.ts`; Android build if native sync methods are removed.
