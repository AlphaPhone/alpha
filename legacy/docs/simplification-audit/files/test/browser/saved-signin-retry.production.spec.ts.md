# test/browser/saved-signin-retry.production.spec.ts
- Lines: 131 | Kind: Playwright journey (`production` project) with its own hand-written Capacitor bridge plus `helpers/resident-agent-plugin`, 3 tests | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (production), on the shared harness bridge
- Covers: a Cloud key kept in the keystore at start. If Cloud is unreachable, the resident still starts, no notice is shown, and "Reconnect agent" restarts without rewriting the key. If Cloud rejects the key, the mandatory sign-in page says "Sign-in expired" and the resident keeps running. If Cloud admits it, inference is bound (`configureCloudProvider`) and only identity, plan and Gmail routes are read. Duplicates: rejected key also in `cloud-account-replacement.production` (alert "Sign-in expired"), `native-cloud-subscription.spec` (identity 401). Admitted-key start also in `resident-first-run.production`. Callers/importers: none. It imports `flag-off-android` (`seedCompletedAccessSetup`, `completeAccessSetup`, `openYourAgent`) and `helpers/resident-agent-plugin`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7, 24-25 | A1 (D1) | The header and seed model "an older build's local-apps-without-AI choice" (`{kind:'offline',localApps:true}`). The behaviour asserted (selection saved as `{kind:'resident'}`) is current: `connection-ui.tsx:816` maps `offline`/`none` to `resident`. The `localApps` field is a legacy shape. | Drop the legacy framing and the `localApps` field. Seed nothing, or a plain `{kind:'offline'}`. | none |
| 2 | 20-71 | C4 / T7 | A 50-line private Capacitor bridge (`ElizaSystem`, `Agent`, `AlphaCloudSignIn`, `AlphaConnection`, `AlphaNotifications`, `AlphaVoiceCloud`) re-implements what `flag-off-android` + `resident-stub` already provide. | Use `harness/bridge.ts` + `plugins/agent.ts` + `plugins/cloud.ts` with modes `offline`, `rejected` and `funded`. | Low |
| 3 | 103-114 | T4 | The rejected-key case overlaps `cloud-account-replacement.production:133`. | Keep one rejected-key test in the connection-cloud journey (this one, because it also asserts the resident keeps running). | none |
| 4 | 131 | – | `test.beforeEach(seedCompletedAccessSetup)` sits at the bottom of the file. | Move it into the journey fixture. | none |

## Proposed end state
Three steps in the production connection-cloud journey, `describe('kept sign-in at start')`, parametrised over the Cloud
answer (unreachable, rejected, admitted). They run on the shared bridge and assert the agent calls, keystore writes and
visible dialogs. There is no private bridge and no legacy seed.
