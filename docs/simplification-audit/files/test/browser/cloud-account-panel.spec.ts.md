# test/browser/cloud-account-panel.spec.ts
- Lines: 62 | Kind: Playwright, `chromium` project; UI over an inline `AlphaConnection` bridge; tests 2-3 pair a remote agent with `connectionController.pair('remote', …)` and start the CLI-session sign-in with `connectionController.signInBrowser()` | Verdict: **MERGE** tests 1 and 4 into `journeys/connection-cloud.spec.ts`; DELETE tests 2 and 3
- Covers: (1) Inbox "Connect Eliza Cloud" opens the focused Alpha sign-in dialog (Try again and Back only, no hosting copy, no requests) and Back returns to Inbox; (2) opening and closing account settings keeps a paired remote agent's session, history and selection; (3) CLI-session sign-in verifies the email and skips hosted-agent discovery and provisioning; (4) Settings Account opens the sign-in dialog and Escape returns focus. Duplicates: "Connect Eliza Cloud" also in `home-inbox.spec.ts`, `root-view-states.spec.ts`, `mvp.spec.ts`, `production-surface.spec.ts`, `journey-core-loops.production.spec.ts`. Callers/importers: none. Imports `seedCompletedAccessSetup` from `flag-off-android.ts` (20 other importers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2, 39-41, 46-48 | A3 (D5) | Test 2 depends on a paired remote agent (`qa-agent.invalid`, `/api/auth/pair`). PRD: no hosted-agent pairing. | Delete. | Low: account-sheet open/close on the resident agent can be one assertion in the connection journey. |
| 2 | 30-31, 49-57 | A3 (D5) | Test 3 uses the CLI-session browser sign-in (`/api/auth/cli-session`), which the header comment says is test-mocks-only; production signs in with native email. | Delete; the native email sign-in journey (`account/sign-in`) covers sign-in. Keep the "no hosted discovery or provisioning requests" assertion there. | Medium: confirm the native sign-in journey asserts no `/agents` or `upgrade-tier` calls. |
| 3 | 43-45, 58-60 | none | Entry points from Inbox and Settings, focus and Back/Escape behaviour, no requests. | Carry both into `journeys/connection-cloud.spec.ts`. | none |
| 4 | 44, 56 | B5 | Screenshots to fixed paths under `test-results/cloud-account-panel/`. | Drop. | none |
| 5 | 10-38 | P6 | Inline bridge with a remote-agent branch and a Cloud branch. | Use the harness `cloud` plugin; the remote branch goes with test 2. | none |
| 6 | 62 | D8 | `beforeEach` declared at the end of the file. | Harness option. | none |

## Proposed end state
Two steps in `journeys/connection-cloud.spec.ts`: Inbox and Settings entries open the focused sign-in dialog without
network calls, and Back/Escape return to the entry with focus restored. Delete this file.
