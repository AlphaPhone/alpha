# apps/app/src/runtime/calendar-sync-settings.ts
- Lines: 257 | Role: imperative-DOM `<dialog>` for Google Calendar sync in two modes (legacy local-first host and "canonical" agent control), plus the `CanonicalCalendarSyncSettings` type | Verdict: DELETE (move the one live type to `google-accounts.ts`)
- Importers: runtime/google-accounts.ts:5 and runtime/google-connection-ui.tsx:17 — **type only** (`CanonicalCalendarSyncSettings`). `openCalendarSyncSettings` has 0 app importers. Text/path pins: `test/calendar-sync-settings-navigation.test.mjs:8` (strips and evals this file, T2), `test/browser/calendar-sync-fixture.ts:64`, `test/browser/calendar-sync-settings.spec.ts`, `test/browser/accessibility-states.ts:461` (comment), `scripts/storage-specs.ts:11`, `specs/quint/refinement/application/google-calendar-link-publication.md:18-22` (documents that it is test-only), `specs/quint/services/manifest.json:224`, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-257 | A2 | Dead client-side linked-sync stack (research P11): `calendar-sync-settings.ts` → `openCalendarSyncSettings` has no importer in apps/android (whole-repo grep; callers only `test/browser/calendar-sync-fixture.ts:64`, `test/calendar-sync-settings-navigation.test.mjs`); `calendar-sync-host.ts` is imported only by calendar-sync-settings.ts; `calendar-linked-storage.ts` and `native-calendar-sync.ts` only by calendar-sync-host.ts; `calendar-linked-store.ts` only by those and calendar-linked-provider.ts; `calendar-linked-provider.ts` only by `cloud-protocol.ts:4` for `CloudProtocol.googleCalendarSync` (L548), whose only caller is the upstream sync controller driven by calendar-sync-host. The live path is `AgentCalendar.reviewSync/changeSync` + `google-accounts.ts linkGoogleCalendar`. Both dialog modes (`openCalendarSyncSettings` legacy branch L16-199 and `openCanonicalCalendarSyncSettings` L203-257) are reachable only from tests. | Delete the file; move `export type CanonicalCalendarSyncSettings = {calendar: AgentCalendar; current(): boolean; canChange(): boolean}` (L8) into google-accounts.ts and update google-connection-ui.tsx's import. | High. |
| 2 | 10-13 | D12 | Per-file inline-style DOM helpers (`syncIcon`, `syncIconButton`, `syncDot`, `syncSwitch`) and hex colours `#1a7f37`, `#b26a00`, `#8a8a8a`, `#a32121`. | Gone with the file. | — |
| 3 | 16-199, 203-257 | C4/D12 | Two hand-built `<dialog>` lifecycles (back/pagehide/visibility/inert/focus restore) — two of the ~21 imperative dialog copies. | Gone. | — |
| 4 | 16-199 vs 203 | D8 | Mixed tabs/spaces (184/54) and two formatting styles in one file. | Gone. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `CanonicalCalendarSyncSettings` | type | 8 | none | `google-accounts.ts` |
| `syncIcon`, `syncDot`, `syncSwitch`, `syncIconButton` | helper | 10-13 | hosted-digest-ui.tsx:5-9 style helpers; 49 icon spans in connection-ui.tsx | delete |

## Proposed end state
File removed; 1-line type in google-accounts.ts.

## Verification
Typecheck google-accounts/google-connection-ui; Google calendar link specs (`test/google-calendar-connect.test.mjs`, `test/google-calendar-link-status.test.mjs`, quint `google-calendar-link-publication`); delete the stack-only tests listed in the calendar-sync-host report.
