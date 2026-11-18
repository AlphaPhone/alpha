# test/browser/post-sign-in-setup.production.spec.ts
- Lines: 162 | Kind: Playwright, production project (flag-off bundle) over `flag-off-android` + `resident-stub` + startup-frame recorder; held agent start and account admission | Verdict: KEEP as the production half of `journeys/startup-permissions.spec.ts` (absorbs the unique cases of `post-sign-in-setup.spec.ts`)
- Covers: after a fresh account verifies its email code, the seven access steps open at once while the agent restarts with the new key, with no "AI is off"/billing copy; Settings → agent shows Starting then Running; a signed-in start with setup left opens it directly with no Home frame while the account is checked; a saved sign-in that cannot reach Cloud shows Home without waiting for the agent. Duplicates: `post-sign-in-setup.spec.ts` tests 1 and 3 (same paths on the dev:cloud renderer), `own-provider.production.spec.ts` (setup after own keys). Callers: production project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-31, 42-49 | T7 | Seven permission plugins patched into `PluginHeaders` and answered in one chain; `AlphaFiles.storageState` handled twice (l.45 and l.47, the second unreachable). | Typed bridge permission handler; delete l.47. | Low. |
| 2 | 87 | B1 | `waitFor(...).catch(()=>{})` before a screenshot. | Remove; the next `expect` waits. | None. |
| 3 | 129 | T8 | `waitForTimeout(500)` to show nothing appears while admission is held. | Use the startup-frame recorder's assertion (already called at l.138). | Low. |
| 4 | 15, 68, 75, 88, 98, 106, 110 | B5 | Six screenshots per run with no comparison. | Keep only if a reviewer reads them; otherwise attach on failure. | None. |
| 5 | 1-4 | A8 | "owner report 2026-10-30" narrative. | One-line description. | None. |

## Proposed end state
Production startup journey with four cases: (1) verified code → seven steps → All set while the agent restarts → Starting then Running; (2) signed-in start with setup left: neutral loading then setup, never Home; (3) Cloud unreachable at startup: Home without waiting; (4) first start shows neutral loading until sign-in, and the 60 s fallback to Home (both moved from `post-sign-in-setup.spec.ts`).
