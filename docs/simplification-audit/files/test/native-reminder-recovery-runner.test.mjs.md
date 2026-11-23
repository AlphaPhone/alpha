# test/native-reminder-recovery-runner.test.mjs
- Lines: 31 | Kind: tooling (reminder recovery campaign through `isolated-native-campaign.mjs`; each case spawns the real runner script against a fake device) | Verdict: MERGE into `test/tooling/native-campaigns.test.ts`
- Covers: the reminder recovery runner works in one owned user, reboots, witnesses the posted notification externally before the next instrumentation, reads the reminder envelope, and refuses incomplete evidence or a changed occurrence before rebooting. Duplicates: the six refusal modes repeat `native-reminder-runner` and `native-permission-runner`. Callers/importers: `npm test` glob; shared fixture.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-27 | T4 | Six refusal modes × two kinds = 12 child runs of shared evidence logic. | Shared refusal table once; keep only `grant-resumes` here (recovery-specific). | None |
| 2 | 5-16 | - | Reboot/witness ordering is specific and worth keeping. | Keep (one kind; the second kind adds only the recurrence id). | Low |
| 3 | 15 | - | Pins the installed prefs file name `alpha-reminder-envelope-v1.xml` (persisted name, G5). | Keep. | None |

## Proposed end state
Two cases in the campaigns file: recovery pass ordering (reboot → notification witness → instrumentation, boot ids
differ) and changed occurrence refused before reboot.
