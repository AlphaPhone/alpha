# apps/app/src/runtime/google-accounts.ts
- Lines: 429 | Role: Google accounts client bound to one Cloud session (list/connect/disconnect), the Calendar-aware disconnect lifecycle (pause sync around the privacy revoke), and the "link Agent Calendar to Google" state machine. | Verdict: SPLIT (accounts vs Calendar link) and SIMPLIFY
- Importers: 4 product (`prototype/inbox-cloud-adapter.ts`, `prototype/settings-adapter.ts`, `runtime/google-connection-ui.tsx`, `runtime/calendar-sync-host.ts` – dead, see A2). Text/path pins: `scripts/test-google-accounts.ts`, `scripts/inbox-adapter-fixture.ts`, `specs/quint/application/manifest.json`, `specs/quint/services/manifest.json`, `specs/quint/refinement/application/google-calendar-disconnect.mjs` (imports `disconnectGoogleWithCalendar`, passes `pauseObservationMs`), `google-calendar-link-flow.mjs`, `google-calendar-link-publication.mjs`, `specs/quint/refinement/services/google-accounts.mjs`, `google-accounts-lifecycle.mjs`, `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs`, `test/google-calendar-connect.test.mjs`, `test/google-calendar-link-status.test.mjs`, `test/google-connection-return.test.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/google-workspace-return.test.mjs`, `test/browser/gmail-grant-recovery.spec.ts`, `test/fixtures/google-account-panel.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | A2 | `import type {CanonicalCalendarSyncSettings} from './calendar-sync-settings'`: the only live content of a dead module (no product importer of `calendar-sync-settings.ts`/`calendar-sync-host.ts`). | Move the 1-line type here (or to `agent-calendar.ts`) and delete the dead stack (cross-file). | Low |
| 2 | 41, 45, 47, 119, 134, 142, 171 | B2 | `privacyCurrent?`, `pause?`, `retireCallbacks?` are optional, but the only product caller (`createGoogleAccounts().disconnect`, 304-310) always supplies all three. Fallback branches: `if (ports.privacyCurrent) … else current()` (119), `if (ports.retireCallbacks)` (134), `target && ports.pause` (142), `ports.privacyCurrent && calendarPause==='confirmed'` (171). | Make them required; delete the fallbacks. Update the Quint harness `google-calendar-disconnect.mjs` that omits them. | Low |
| 3 | 98-99, 122-125 | B3 | `pauseObservationMs`/`retirementObservationMs` options with a range check (`pauseMs > 3000 … throw new TypeError(...)`); product never passes them (only the Quint harness does). | Make them module constants (3000/1000); harness uses fake timers. | Low |
| 4 | 206, 261 | B2 | `initiateGoogleWithReturn?` optional with a fallback to `initiateGoogle`; `CloudProtocol.initiateGoogleWithReturn` (`cloud-protocol.ts:515`) always exists. | Required member; delete the fallback in 261. | Low |
| 5 | 220 | A7 | `googleDisconnectConfirmation(label, _serviceName = 'Cloud')`: parameter ignored; `google-connection-ui.tsx:329` computes `serviceName` (line 80) only to pass it here. | Drop the parameter and the caller's `serviceName`/`cloudServiceName` computation. | None |
| 6 | 217 | B2 | `if (typeof window !== 'undefined')` in renderer code. | Delete guard. | None |
| 7 | 336-339 | C3 | Inline SHA-256→hex in `linkOperationKey`. | Shared `sha256Hex`. Key prefix `alpha-calendar-connect:` stays. | None |
| 8 | 14-36, 181-200 | A7 | Exported types with 0 external references: `GoogleDisconnectLease`, `GoogleDisconnectReview`, `GoogleDisconnectPauseRequest`, `DisconnectCleanupStatus`, `GoogleDisconnectPorts`, `GoogleAccountsCalendarReview`, `GoogleAccountsCalendarLifecycle`, `GoogleCalendarLink`; `GoogleAccountsClient`/`GoogleAccountsBinding` used only by `scripts/test-google-accounts.ts`. | Un-export (keep `GoogleDisconnectContext`, used by `google-connection-ui.tsx`). | None |
| 9 | 92 | D7 | `disconnectGoogleWithCalendar` exported only for Quint/specs (T10). | Keep exported while the harness imports it; otherwise private. | — |
| 10 | 283-297 | B1 | `try{captured=calendar?.capture()…calendar!.retain(context)}catch{captured=null;context=null;}` — "Failure means no pause: ordinary privacy still works." | Keep (specified fallback) but narrow it to the `retain` call. | — |
| 11 | 322-327 | D8 | Mis-indented closing block (8 spaces inside a 6-space function). | Formatter. | None |
| 12 | 331-429 | D1 | Calendar link (`linkGoogleCalendar`, `calendarSettled`, `linkOperationKey`, `googleCalendarDisconnectLifecycle`) is a separate concern from the accounts client. | Move lines 332-429 to `runtime/google-calendar-link.ts`. | Low (update Quint harness imports) |
| 13 | 52 | C3 | UUID regex. | Shared. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `GoogleDisconnectLease` and siblings | interface | 14-48 | lease/binding shapes in `google-connection-return.ts:2`, `google-workspace-return.ts:5` | stay (private) |
| `observe` | helper | 74-88 | timeout race helpers (`abort-signal.ts`, `alpha-client.ts:321-376`) | shared `raceTimeout` if created |
| `sameLease` | helper | 55-57 | binding comparators in `google-connection-return.ts:5`, `google-workspace-return.ts:20` | stay |
| `linkOperationKey` | helper | 336-339 | 28 SHA-256 copies | shared `sha256Hex` |
| `calendarSettled` | helper | 341-347 | no | moves with Calendar link |
| `CanonicalCalendarSyncSettings` (imported) | type | 5 | defined in dead `calendar-sync-settings.ts:8` | here or `agent-calendar.ts` |

## Proposed end state
`google-accounts.ts` (~230 lines): accounts client, required disconnect ports, constant budgets, private types. `google-calendar-link.ts` (~95 lines): Calendar link and disconnect lifecycle with the moved `CanonicalCalendarSyncSettings`. Total ~325 lines.

## Verification
`scripts/test-google-accounts.ts`, `test/google-calendar-connect.test.mjs`, `test/google-calendar-link-status.test.mjs`, Quint `google-calendar-disconnect`, `google-calendar-link-flow`, `google-calendar-link-publication`, `google-accounts(-lifecycle)` refinements (they import by path: update), `test/browser/gmail-grant-recovery.spec.ts`.
