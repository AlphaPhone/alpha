# test/native-permission-runner.test.mjs
- Lines: 121 | Kind: tooling: drives `scripts/test-native-permissions.ts` through `test/fixtures/isolated-native-campaign.mjs` (a fake SDK/adb; each `exercise()` spawns the real script as a child Node process, 120 s timeout); last test imports `revokeWhileRecording` directly | Verdict: MERGE into `test/tooling/native-campaigns.test.ts`
- Covers: the on-device permission campaign installs only the archived APK pair, creates and removes its own Android user, scopes every grant/revoke to that user before instrumentation, runs the exact method with its gate, rejects incomplete instrumentation evidence, and for voice-revoke revokes during recording, verifies in a new process and re-grants. Duplicates: refusal modes (`summary-only`, `wrong-class/method`, `skipped`, `archive-pin`, `existing`, `stop-failure`) are re-run per runner in `native-reminder-runner`, `native-reminder-recovery-runner`, `native-restart-runner`, `calendar-regression-runner`. Callers/importers: `npm test` glob; fixture shared with 6 other tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-27 | T4 | Seven refusal modes re-tested for camera; the evidence parser is shared by every runner. | One refusal table, once, in the merged file. | None |
| 2 | 29-44, 52-73, 77-79 | T4 | Each scenario spawns a full fake campaign (~30 child processes in this file). | Keep one pass per distinct shape (settings, channels, gated voice, voice-revoke); the table rows stay as data on one run each. | Low |
| 3 | 76 | T1-ish | `routed ⊆ permissionCampaign` is an inventory check of the test's own list. | Delete. | None |
| 4 | 103 | T8 | `revokeWhileRecording` attempts race a fixed 1.5 s `setTimeout`; five attempts add up to ~6 s. | Resolve the fake phase on the `ended` promise only, with a short fake timeout. | Low |
| 5 | 95-121 | - | Direct test of the revoke-while-recording decision (survivor process, stale marker, early end): risky logic, keep. | Keep. | None |

## Proposed end state
In `test/tooling/native-campaigns.test.ts`: shared refusal table (once), camera pass (user 10 scoping, two uninstalls),
one gated scenario table, voice-revoke sequence, `revokeWhileRecording` refusals, HOME package selection.
