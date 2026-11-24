# test/native-reminder-runner.test.mjs
- Lines: 53 | Kind: tooling (reminder campaign through `isolated-native-campaign.mjs`, child process per case) | Verdict: MERGE into `test/tooling/native-campaigns.test.ts`
- Covers: one-off and recurring reminder campaigns use the exact archived APKs, a fresh user 10, `POST_NOTIFICATIONS` granted in that user, the expected test count, and refuse an APK changed after archive admission. Duplicates: refusal modes as in the other runner tests. Callers/importers: `npm test` glob; shared fixture.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-44 | T4 | 12 refusal runs duplicating the shared evidence table. | Drop; shared table covers them. | None |
| 2 | 47-53 | - | Archive race (APK changed after admission) is a distinct supply-chain rule. | Keep. | None |
| 3 | 1-53 | D8 | Different formatting style from its siblings (4-space, double quotes). | Formatter pass. | None |

## Proposed end state
Two cases: pass for one-off and recurrence as a two-row table, archive race refused.
