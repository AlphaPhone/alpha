# scripts/test-cross-app-notifications.ts
- Lines: 202 | Kind: device campaign runner (installs archived app/test APKs and two signed companion APKs, runs `CrossAppNotificationsInstrumentedTest` or the 7-phase `CrossAppNotificationsRestartInstrumentedTest`, verifies cleanup of the notification-listener grant) | Verdict: KEEP (manual device campaign) + SIMPLIFY; MOVE to `scripts/android/campaigns/cross-app-notifications.ts`
- Covers: reading other apps' notifications with consent: selected vs excluded source app, exact actions, redacted history, pause/resume, revoke, across process restarts with distinct PIDs. Duplicates: none at device level. Callers/importers: only `CAMPAIGN_RUNNERS` (`scripts/android-instrumentation.ts:311`). No workflow or package.json script.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62-68 | C3 | Own instrumentation-log parser (`INSTRUMENTATION_STATUS_CODE` counting) duplicating `scripts/instrumentation-result.ts` (`instrumentationClassResults`, `requireInstrumentationSuccess`). | Use the shared parser. | L |
| 2 | 24, 38-39 | C3 | Own sha256 and `apksigner` signer readers; same helpers in other campaign scripts. | Shared `scripts/lib/hash.ts`, `scripts/lib/apk.ts`. | L |
| 3 | 7-12 | C3 | Positional argv with a hand-built usage error. | `parseArgs`. | L |
| 4 | 18 | — | Reads `app.config.json` from cwd (other runners resolve from repo root). | Resolve from `import.meta.dirname`. | L |
| 5 | 112-113 | B2 | `'stdout' in error` probing on `execFileSync` errors. | Type the error once (`SpawnSyncReturns`). | L |

## Proposed end state
~140 lines on shared helpers, same safety checks (refuse preexisting companions/listener grant, verify cleanup). Owner question shared with the other campaigns: manual evidence tools, never in CI.
