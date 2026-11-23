# specs/quint/refinement/application/browser-owner-reminder-action.mjs
- Lines: 276 | Kind: Quint refinement harness (bundles real `runtime/owner-reminder-notification-port.ts` via `bundledSource`) | Verdict: DELETE (with the unused port API; owner confirm)
- Covers: explicit open / mark-read / readback reconciliation of `OwnerReminderNotificationPort.act` against `BrowserOwnerReminderAction.qnt`. Duplicates: run by `test/quint-browser-owner-reminder-action.test.mjs` and aggregate `index.mjs:80`. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 269 | A7 | The harness itself states "The renderer has no mounted consumer for this component API." Verified: `git grep ownerReminderNotifications.` finds only `main.tsx:92` calling `.bind(...)` (web builds only); nothing calls `list`, `act`, `bindUi`, `bindPolicy`, `visibility`, `refresh`. The model covers code no build reaches. | Delete harness, `BrowserOwnerReminderAction.qnt`, its manifest entry, `index.mjs:80` import/adapter, `test/quint-browser-owner-reminder-action.test.mjs`; delete the `act`/UI/policy members of the port (and the whole port + `main.tsx:92` + `connection-ui.tsx:2375 getOwnerReminderNotificationBinding` if `browser-owner-reminder-read` goes too). D20 precedent: unreached code is deleted with its model. | M (owner: is a shade consumer planned?) |
| 2 | 223 | — | If kept: already imports the real module; no port needed. | — | — |

## Proposed end state
Removed together with `browser-owner-reminder-read.mjs` and the unused port. If the owner says the agent-reminder shade is planned, keep unchanged and record it in DECISIONS (D7-style).
