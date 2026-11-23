# apps/app/src/runtime/google-calendar-selection.ts
- Lines: 75 | Role: per-Cloud-owner preference of the Google calendar that device Calendar sync writes to (`alpha.google-calendar-selection.v1:<owner>`). | Verdict: DELETE (with the superseded client-side Calendar sync stack)
- Importers: 3 product: `runtime/calendar-sync-host.ts` and `runtime/calendar-sync-settings.ts` (both have no product importer: only each other and type-only imports – A2), and `runtime/google-connection-ui.tsx:224` (`clearGoogleCalendarSelectionForConnection` after a confirmed disconnect). Text/path pins: `scripts/test-google-calendar-selection.ts`, `specs/quint/application/manifest.json` (sources list), `specs/quint/native/manifest.json`, `specs/quint/refinement/application/google-calendar-link-publication.mjs`, `specs/quint/refinement/composition/ports.mjs`, `test/browser/calendar-sync-fixture.ts`, `test/browser/one-calendar.spec.ts` (seeds the key), `test/fixtures/google-account-panel.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/calendar-sync-settings-navigation.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 57-68 | A2 | The only writer, `saveGoogleCalendarSelection`, is called only from `calendar-sync-settings.ts` (dead). The only readers are in `calendar-sync-host.ts` (dead). The live Calendar link uses the agent's `LinkedCalendarControl` (`google-accounts.ts` `linkGoogleCalendar`). | Delete the file, the dead stack, and `google-connection-ui.tsx:224`'s clear call (it clears a key nothing live writes). | Medium: confirm with owner that `calendar-sync-settings.ts` is not reached through a dynamic import (git grep: none). |
| 2 | 8, 35-39 | A7 | `GOOGLE_CALENDAR_SELECTION_CHANGED` event: only listener is `calendar-sync-host.ts:307,328` (dead). `typeof globalThis.dispatchEvent==='function'&&typeof CustomEvent!=='undefined'` is a B2 Node shim. | Goes with the file. | — |
| 3 | 19-22 | B2 | `typeof localStorage==='undefined'` probe. | Goes with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `GoogleCalendarAccountKey` | interface | 5 | `Owner` in `gmail-account-selection.ts:3`, `googleCalendarAccountKey()` in `google-connection-ui.tsx:37` | deleted (shared `CloudOwner` if needed) |
| `GoogleCalendarSelection` | interface | 6 | — | deleted |
| `GoogleCalendarSelectionStorage` | type | 7 | `Storage` in `gmail-account-selection.ts:4` | deleted |
| `uuid`, `clean` | const/helper | 9-10 | UUID regex copies | deleted |

## Proposed end state
File deleted together with `calendar-sync-host.ts`, `calendar-sync-settings.ts` (after moving `CanonicalCalendarSyncSettings`), the clear call in `google-connection-ui.tsx`, and the script/spec/test pins above.

## Verification
`test/browser/one-calendar.spec.ts` (drop the seeded key), Quint application manifest sources list for the Calendar module (remove the path), `npm run verify`.
