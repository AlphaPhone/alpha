# test/connection-background-restore.test.mjs
- Lines: 61 | Kind: source transplant (`work()` sliced from `connection-ui.tsx` at `async function work(` .. `\n/** `; `restoreOptionalBrowserCloudAccount` + `initialize()` sliced and rewritten into a function, run in `vm` with ~20 injected names) | Verdict: DELETE
- Covers: background account restore never opens the chooser and clears its loading status; a failed background restore opens compact Cloud account recovery; an explicitly opened panel stays open; a cancelled restore does not reopen; explicit operations keep their dialog; explicit staging `dev:cloud` reload reads only staging credentials; ordinary browser startup still discovers production credentials; native startup goes straight to resident restoration. Duplicates: `test/browser/saved-signin-retry.production.spec.ts`, `resident-first-run.production.spec.ts`, `cloud-account-panel.spec.ts`. Callers/importers: `npm test` glob; imports real `resident-recovery.ts` and `calendar-approval-client.ts` only to put them in the box.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | T2 | `work()` executed from text with fake state; the same slice is used by four other files in this chunk. | Delete. | Low |
| 2 | 41-61 | T2 / D7 | `initialize()` rewritten by `.replace(/^async initialize\(\)/,'async function initialize()')`; depends on a comment marker `  /** Test mocks and the flag-off web preview`. | Delete. | Low |
| 3 | 2 | A2 | `CalendarApprovalClient` is injected only because `initialize()` references it; check against D4 (client Calendar sync stack) when that deletion lands. | - | - |

## Proposed end state
Deleted. Journey coverage in `journeys/startup-permissions.spec.ts` / `journeys/connection-cloud.spec.ts`: launch with a saved sign-in -> no chooser, no lingering status; saved sign-in check fails -> account recovery panel; staging dev reload reads only staging (dev project). No host test.
