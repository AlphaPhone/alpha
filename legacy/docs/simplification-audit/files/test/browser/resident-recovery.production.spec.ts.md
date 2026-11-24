# test/browser/resident-recovery.production.spec.ts
- Lines: 95 | Kind: Playwright, `production` project, real Settings → Your agent UI over `flag-off-android.ts` + `resident-stub.ts` with an Agent wrapper adding `reviewRecovery`/`archiveRecovery` and overriding `document.hidden`; 7 tests | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (production project, "resident start and recovery")
- Covers: when native refuses to start for `ipc-recovery-retention-limit`, the panel offers "Restart Alpha" (not Retry); restart requires an explicit tap, a fresh native review, and complete archival before one ordinary start, and keeps the Cloud credential; a review that resolves while backgrounded cannot archive or start; unavailable inventory keeps restart blocked; changed/partial archival never starts and retry gets a fresh review token; a transient failure keeps ordinary Retry without recovery calls; on the signed-out sign-in page the guarded restart is still reachable. Duplicates: none found; `accessibility-sign-in.production.spec.ts` has a resident-start-failure case on the sign-in page (different failure). Callers/importers: imports `flag-off-android`, `resident-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | T6-lite | `Object.defineProperty(document,'hidden',…)` for the whole page. | Use the shared lifecycle helper (`harness/nav.ts` background/foreground) so all specs fake visibility the same way. | Low |
| 2 | 47-48 | T6 | Clicks "Restart Alpha" through `evaluate(...click())` to bypass actionability while hidden. Intentional (a background tap must be ignored). | Keep, with the reason in one comment. | none |
| 3 | 95 | – | `test.beforeEach` at the bottom of the file. | Move into the fixture. | none |
| 4 | 15 | C3 | Pushes two methods into the Agent header. | Declare them in `harness/plugins/agent.ts`. | none |
| 5 | – | – | All seven cases are distinct safety rules (no archive or start without explicit, foreground consent). | Carry all. | none |

## Proposed end state
A "resident start and recovery" describe in `journeys/connection-cloud.spec.ts` (production) with the seven cases on the shared
agent fixture (recovery methods declared there) and the shared visibility helper. File deleted.
