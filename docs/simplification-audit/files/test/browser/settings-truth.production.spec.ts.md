# test/browser/settings-truth.production.spec.ts
- Lines: 357 | Kind: Playwright journey (`production` project, flag-off bundle) with a private 90-line Android bridge plus `helpers/resident-agent-plugin`; 15 tests (including 2 three-way loops) | Verdict: **KEEP** as the base of `journeys/settings.spec.ts` (production file), moving the shade test to `journeys/home-shell` and the plan/status tests to `journeys/connection-cloud`
- Covers: launcher Home asks Android for its own shade, draws no Alpha shade, tiles or brightness, and reports every non-opened outcome. Permission and notification handoffs open the right Android pages and report refusal. Every Settings row is backed by real state and shows no fixture value ("Ask before Alpha acts" persists). An unreadable device preference keeps review on and offers recovery without overwriting. Notification state is read back on resume. The browser build has no radio/sensor switches. Eliza Cloud plan, Sign out confirm and code entry, redemption controls for credits/active/canceled, truthful agent status (unbound/recovering/connected), and a delayed permission read that keeps focus. Duplicates: `settings.production.spec.ts` (About quiet, no Developer row), `settings-device-facts.spec.ts` (privacy handoff), `billing-recovery.production` / `native-cloud-subscription.spec` (plan and redemption), `root-view-states.spec.ts` (no-fixture checks). Callers/importers: none. It imports `helpers/cloud-plan-settings`, `flag-off-android`, `helpers/resident-agent-plugin`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T4 / B4 | `test.skip(project!=='production')`: the playwright config already matches `.production.spec.ts` only to the production project (research tests-browser line 297). | Delete. | none |
| 2 | 333, 336 | B4 | `seedCompletedAccessSetup` runs in a file-level `beforeEach` and again inside the last test. | Keep one, in the journey fixture. | none |
| 3 | 16-110 | C4 / T7 | A private bridge that duplicates `flag-off-android`'s plugin set and `settings-device-facts`' device fake. | `harness/plugins/device.ts` + `notifications.ts` + `cloud.ts` on `harness/bridge.ts`. | Medium (large fixture). |
| 4 | 146-187 | – | The shade behaviour belongs to Home, not Settings. | Move to `journeys/home-shell.spec.ts` (production). | none |
| 5 | 271-331 | T4 | Plan display, redemption ×3 and agent status ×3 overlap `billing-recovery.production` and `native-cloud-subscription`. | Move to `journeys/connection-cloud.spec.ts`. Keep only cases not asserted there (sign-out confirm; status not saying "Running" while recovering). | Low |
| 6 | 166 | T8 | `waitForTimeout(300)` to prove that no shade request happens. | `expect.poll` over a fixed interval, or assert after the next event. | Low |
| 7 | 289 | A8 | The negative check for the retired `/api/v1/credits/balance` route is a history guard. | Delete. | none |
| 8 | 221-225, 237, 253-255, 312-313 | D8 | Runs of blank lines are left from deleted tests. | Format. | none |
| 9 | 143-144 | – | `fixtureValues` is a list of prototype simulation strings. It checks behaviour (no fabricated value is shown), not source. | Keep as the shared `noFixtureValues`, with `root-view-states`' list. | none |
| 10 | 226-236 | – | Unreadable `alpha.browser.device.v1` recovery is current-format recovery, not a legacy reader (D1 does not apply). | Keep. | none |

## Proposed end state
The production Settings journey holds handoffs and refusal, no fixture values with real persisted rows, the device
preference recovery, notification read-back, browser-build switches and the delayed permission focus. It uses shared
plugins and `noFixtureValues`. The shade moves to the Home/shell journey, and plan/redemption/status move to
connection-cloud. There is no skip, no double seeding and no sleep.
