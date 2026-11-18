# apps/app/src/browser/calendar-linked-local.ts
- Lines: 186 | Role: `LinkedCalendarLocalPort` over the browser calendar document for the client-side Google linked-sync engine. | Verdict: DELETE
- Importers: 1 (`runtime/calendar-sync-host.ts:8,243`). Text/path pins: `test/browser/calendar-linked-storage.spec.ts`, `test/support/feature-parity.mjs`; comment mention in `prototype/agent-calendar-adapter.ts:44`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-186 | A2 | Part of the superseded client-side Calendar linked-sync stack. `calendar-sync-host.ts` is imported only by `calendar-sync-settings.ts`, whose only production use is a type (`research/app-runtime-a-m.md` P11; `git grep calendar-sync-host -- apps`: `runtime/calendar-sync-settings.ts` only). The agent-side sync in `agent-calendar.ts` is the product path (DECISIONS D4). | Delete together with `runtime/calendar-sync-host.ts`, `calendar-linked-*`, `native-calendar-sync.ts`, `browser/calendar-sync-fields.ts`, `test/browser/calendar-linked-storage.spec.ts`, and update the comment at `prototype/agent-calendar-adapter.ts:44`. | Medium (Android `CalendarSyncBridge` needs owner, see runtime chunk) |
| 2 | 159, 182-183 | C6 | Raw `window.dispatchEvent(new Event('alpha:calendar-document-changed'))` bypasses `calendar-store`'s broadcast. | Goes with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `semantic()` | helper | 33-66 | event→semantic mapping in `runtime/native-calendar-sync.ts` | delete |

## Proposed end state
File removed.

## Verification
`npm run verify` (typecheck, feature-parity), `specs/quint/services/manifest.json` and `specs/quint/native/manifest.json` entries for the sync host, Calendar journeys.
