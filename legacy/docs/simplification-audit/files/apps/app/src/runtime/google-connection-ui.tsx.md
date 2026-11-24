# apps/app/src/runtime/google-connection-ui.tsx
- Lines: 332 (38 lines over 200 chars, up to ~1,400) | Role: the "Google accounts" sheet for Settings, Inbox and Calendar: account list, connect/consent with native or browser return, disconnect with Calendar pause, agent-access switches, and the Calendar "Connect/Sync with Google" intent; plus a module-level open/close controller. | Verdict: SPLIT and SIMPLIFY
- Importers: 6 product (`main.tsx` – `GoogleConnectionsPanel`, `googleConnectionController`; `prototype/inbox-cloud-adapter.ts`; `prototype/settings-adapter.ts` – `openCalendar(scope)` at 861; `runtime/connection-ui.tsx:3917` – `openFromAccount`; `runtime/calendar-sync-settings.ts` (dead) – `googleCalendarAccountKey`; `startup-permissions.tsx`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/services/manifest.json`, `specs/quint/legacy/manifest.json`, `specs/quint/legacy/google-connect/check-google-connect-refinement.mjs`, `specs/quint/refinement/application/google-calendar-access-choice.mjs`, `google-calendar-link-publication.mjs` and `-fixture.jsx`, `google-consent-admission.mjs`, `test/fixtures/google-account-panel.mjs` (source transplant, T2), `test/calendar-connect-policy.test.mjs`, `test/google-connection-return.test.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/login-surfaces.test.mjs`, `test/settings-truth.test.mjs` (source text), `test/browser/one-calendar.spec.ts`, `test/browser/startup-access.spec.ts`, `test/browser/startup-permissions-walkthrough.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17, 30, 36 | A2 | `import type {CanonicalCalendarSyncSettings} from './calendar-sync-settings'` (dead module). | Import from its new home (`google-calendar-link.ts` / `agent-calendar.ts`). | None |
| 2 | 10, 224 | A2 | `clearGoogleCalendarSelectionForConnection(key,account.connectionId)` clears `alpha.google-calendar-selection.v1`, which only the dead `calendar-sync-settings.ts` writes. | Delete the call and import with `google-calendar-selection.ts`. | Low |
| 3 | 37 | A7 | `export function googleCalendarAccountKey` — product caller is only the dead `calendar-sync-settings.ts`; used internally at 39, 79. | Un-export. | None |
| 4 | 13, 80, 329 | A7 | `serviceName=cloudServiceName(...)` computed only to pass to `googleDisconnectConfirmation`, which ignores it. | Delete line 80 and the argument; drop `cloudServiceName` import. | None |
| 5 | 33-36 | D3 | Module-level mutable `returnToAccount`, `opened`, `calendarIntent`, `listeners` with a 600-char one-line controller object. | Move the controller to `google-connections-controller.ts` as a small store (`useSyncExternalStore` source) with named methods on separate lines. | Low |
| 6 | 38-47, 82 | C3 | The session binding is built three ways: `currentGoogleConnectionReturnBinding()`, the inline `binding` at 82 (same expression), and `currentWorkspaceBinding()` converting one into the other; line 97 builds a dummy empty binding to compare against. | One `currentGoogleBinding()`; `binding` = its result; merged binding type (see google-connection-return report); replace the dummy at 97 with a null check. | Low |
| 7 | 52-58, 212, 293-301 | D5 | `browserCalendarWrites` casts `browserResidentCall as unknown as (...)` ("Typed here until browser-cloud-resident.ts carries it") — dev-only `browserCloudResidentEnabled` branch inside the production panel. | Add the operation to `browser-cloud-resident.ts`'s typed API and call it through a dev hook registered from `browser/`; production panel has no dev branch. | Low |
| 8 | 157 | B2 | `if(isAndroid||typeof BroadcastChannel==='undefined')return;` | Drop the `typeof` probe. | None |
| 9 | 19-22, 313, 316-330 | D12/C3 | Inline style helpers `lucide`, `srOnly` (twin `hosted-digest-ui.tsx:5`), `dotStyle`, `spinStyle`, and `icon` (313) that duplicates `lucide('x')`; ~15 `style={{…}}` blocks. | CSS classes (`.alpha-icon[data-icon]`, `.sr-only`, `.alpha-dot`) and the planned `<Icon name>` component. | Low (visual) |
| 10 | 167-177 | C4 | Hand-written modal lifecycle: theme token copy, `holdPhoneInert`, focus, Escape/`alpha-back`, Tab trap, focus restore. Tab traps also in `connection-ui.tsx`, `hosted-digest-ui.tsx`, `view-focus.ts`. | One shared `useModalSheet(ref, onClose)` hook. | Medium (accessibility behaviour must stay identical) |
| 11 | 25, 27 | D10 | Notice tone derived by regex over user-visible copy (`/^(Synced|Syncing) ·| disconnected$/`, `/^(Couldn’t|Not |…)/`). | Keep notices as `{text,tone}` pairs set at the call sites; render tone directly. | Low (copy unchanged) |
| 12 | 113-118 | C3 | Inline abortable 350 ms sleep. | Upstream `abortablePause` (already used via `calendar-availability.ts`). | None |
| 13 | 205, 213, 245 | B1 | `catch{setNotice('Not saved');…}`, `.catch(()=>{})` on cancel: user-visible fallback notices are the specified behaviour. | Keep; `cancel(...).catch(()=>{})` gets a comment. | — |
| 14 | 59-332 | D1/D8 | One 270-line component with 16 hooks/refs and long one-line effects (63, 71, 136, 166). | Split: `useGoogleAccounts` (load/return watchers), `useGoogleCalendarIntent` (connect/link/allow), presentational `GoogleAccountsSheet`. | Medium |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `lucide`, `icon` | helper/const | 19, 313 | `iconStyle` in `connection-ui.tsx` (47 uses) | `<Icon>` component |
| `srOnly` | const | 20 | `hosted-digest-ui.tsx:5` | `.sr-only` CSS class |
| `dotStyle`, `spinStyle` | helper/const | 21-22 | `hosted-digest-ui.tsx:5-9` `dot`, `calendar-sync-settings.ts:10-13` `syncDot` | CSS classes |
| `GoogleCalendarIntent`, `GoogleAccountRead`, `GoogleCalendarAccessChoice` | type | 30-32 | — | stay with the Calendar-intent hook |
| `currentGoogleConnectionReturnBinding`, `currentWorkspaceBinding` | helper | 38-47 | binding builders in this file (82) | one `currentGoogleBinding` |
| `heldGmailTier`, `calendarWrite` | helper | 48, 51 | Gmail tier helpers upstream (`gmailGrantTier`) | stay |
| `browserCalendarWrites` | helper | 55-58 | `browserResidentCall` callers | dev bridge in `browser/` |

## Proposed end state
`google-connections-controller.ts` (~25 lines store), `GoogleConnectionsPanel` split into two hooks and a view (~220 lines total), CSS classes instead of inline styles, no dead Calendar-selection clear, no dev branches, one binding helper, shared modal hook. ~250 lines across the files.

## Verification
`test/fixtures/google-account-panel.mjs` slices this file (T2) and drives `test/google-connections-resource-budget.test.mjs`, `test/google-connection-return.test.mjs`, `test/calendar-connect-policy.test.mjs`: these break on any restructuring and should be replaced by the Playwright journeys `test/browser/one-calendar.spec.ts`, `startup-access.spec.ts`, Settings/Inbox Google journeys. Quint `google-calendar-link-publication` (with its JSX fixture), `google-consent-admission`, `google-calendar-access-choice` import or slice this path.
