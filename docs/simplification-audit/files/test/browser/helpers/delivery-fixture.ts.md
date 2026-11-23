# test/browser/helpers/delivery-fixture.ts
- Lines: 109 | Kind: Playwright fixture (hand-written Capacitor bridge for notices, agent, secure storage, hosted results) | Verdict: **MERGE** into `harness/bridge.ts` + `harness/plugins/{agent,notifications}.ts`
- Covers: AlphaGmail / DailyApps reminder-tap ledgers (pending, consume, release), resident agent requests, secure-storage CAS, hosted-results background state, workflow-tap queue. Duplicates: bridge fake re-implemented in `flag-off-android.ts`, `native-cloud-plan-fixture.ts`, `native-cloud-signin.ts`, `photos-bridge.ts` (P6). Callers/importers: `gmail-notice-question.spec.ts`, `reminder-notice-question.spec.ts` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24, 55-57, 67-68, 80, 90, 96-105 | A7 | Most of the fixture is unused by its only two importers: `holdRetire`, `mockHold/mockReleases`, `ownerWithdrawals`/`__ownerWithdrawalFault`, workflow `taps`/`discarded`/`pendingReads`, `queueChanged`, `wrongVersion`, `nativeSync`/`foregroundSync`, `configured`/`cancelled` (grep over both specs: no hits). It was copied from a workflow-notice fixture. | Keep only the AlphaGmail/DailyApps tap ledger and the agent routes the two specs reach. | none |
| 2 | 27-108 | P6 | Inline `window.Capacitor={PluginHeaders,…}`. | `installBridge(page, {AlphaGmail, DailyApps, Agent, AlphaConnection})`. | Low. |
| 3 | 16-18 | P2 | `startResidentAgent` uses the `connection-diagnostics` backdoor; one 250-char line. | `nav.openConnectionHelp()` + click Start local agent. | Low. |
| 4 | 45 | D7 | `surfaceInfo` answers `developmentBuild:true` so the dev lane accepts the bridge. | Harness `build` option. | none |

## Proposed end state
Deleted. The notice tap ledger becomes `harness/plugins/notifications.ts`; the agent part is the merged
`harness/plugins/agent.ts`. The two notice-question specs become one parameterised test in `journeys/notifications.spec.ts`.
