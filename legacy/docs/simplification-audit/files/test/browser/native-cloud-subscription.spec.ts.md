# test/browser/native-cloud-subscription.spec.ts
- Lines: 733 | Kind: Playwright state matrix on an isolated production composition (inline Vite `createServer` with a virtual entry); synthetic native ports and ES256-signed entitlements; project `chromium`, about 51 tests | Verdict: **KEEP as basis of** `journeys/connection-cloud.spec.ts` (plan block), trimmed to about 22 tests; DELETE 2 legacy-migration tests
- Covers: first-run sign-in gate while the resident agent runs; plan states (active, v2 allowance, trialing, past due, canceled/none, other account, tampered) binding or unbinding Cloud inference; billing-limits fallback and credits; outage/offline grace and recheck throttling; code redemption (success, invalid, rate-limited, lost response replay, already held); account panel, sign out, key-expiry warning; explicit code-entry draft lifecycle; failed provider binding status; simultaneous notices. Duplicates: `native-cloud-signin.spec.ts` (composition and sign-in page), `billing-recovery.production.spec.ts`, `helpers/native-cloud-plan-fixture.ts` is its only fake. Callers/importers: none; imports `helpers/native-cloud-plan-fixture.ts`, `helpers/cloud-plan-settings.ts`, `helpers/cloud-connection-notices.ts`, `helpers/connection-diagnostics.ts` (unused import), `flag-off-android.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 106-124 | A1 | Two tests check that a stored `{kind:'offline',localApps:true}` choice reads as the resident and loses `localApps`. No product source mentions `localApps` any more (grep over `apps/`: no hits; removed in 1656e55dc), so this is a legacy-data check (D1). | Delete both. | none |
| 2 | 16-35 | C5 / P3 | Inline Vite server + virtual entry duplicating `helpers/native-cloud-signin.ts`; a 90 s poll for the cold module graph (line 51). | One shared composition-server fixture for both cloud specs. | Low |
| 3 | 1 | A7 | `openConnectionDiagnostics` imported, never used. | Remove. | none |
| 4 | 59, 67, 97, 140-144, 284, 290, 368-373, 380, 418, 598 | T6 | Many tests drive the controller directly (`openPlan`, `cancel`, `offline`, `recheckPlanOnReturn`, `residentManagePlan`, `recheckPlanAfterRefusal`, `startLocal`, `residentPlanSettings`). | Use the UI entry (notice buttons, Settings > Account, visibility/online events). Keep snapshot reads behind one fixture accessor where the behaviour has no visible effect (inference binding). | Medium |
| 5 | 133-246, 267-361 | T7 | State matrix: canceled/none, active/past_due fallback, 60d/14d±1h key windows, two offline ages, two network-return variants each run as separate full boots. | Collapse into parameterised tests with one boot per state group; keep one case each side of the 14-day boundary. | Low |
| 6 | 704-733 | T8 | `test.setTimeout(360_000)` and a 90 s visibility wait for the full-app composition. | Share the warm server (item 2); default timeouts. | Low |
| 7 | 658 | style | File-wide `beforeEach` declared mid-file. | Move into the fixture. | none |
| 8 | 103, 129, 149, 184, 203, 439, 502, 552, 604, 617, 673 | B5 | Screenshots no step compares. | Trace on failure only. | none |

## Proposed end state
About 22 tests in the plan block of `journeys/connection-cloud.spec.ts`, grouped as: first-run gate; plan admission
(active, v2, trial/past-due, needs plan, mismatch/tampered); fallback and credits; outages and offline recovery; redeem
code (success, invalid, rate limit, replay, already held); account panel and expiry boundary; code-entry draft lifecycle;
failed provider binding. They share the composition server with the sign-in block. The `localApps` migration tests are gone.
