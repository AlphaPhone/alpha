# test/calendar-regression-runner.test.mjs
- Lines: 100 | Kind: tooling (drives `scripts/test-calendar-regression.ts` through `test/fixtures/isolated-native-campaign.mjs`, a fake adb/device) | Verdict: MERGE into `test/tooling/native-campaigns.test.ts` (with `native-reminder-runner`, `native-reminder-recovery-runner`, `native-permission-runner`, `native-restart-runner`, `native-campaign-evidence` tests that share the fixture); trim
- Covers: the on-device Calendar instrumentation runner installs only the admitted test-mocks APK pair, runs the exact class/method in an isolated Android user, grants/revokes permissions before start, restores the device time zone, cleans up only what it created and rejects incomplete evidence. Duplicates: the other `native-*-runner` tests exercise the same shared runner core (`isolated-native-campaign`). Callers/importers: `npm test` glob; fixture shared with 5 other tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | B5 | Six evidence-rejection modes (`summary-only`, `missing-start`, `wrong-class`, …) test the evidence parser, which is shared by all runners. | Test the parser once in the merged tooling file, not per runner. | Low |
| 2 | 24-71 | T4 | Per-kind method selection (agent/range/truncation/options/agent-class/availability) repeats one rule: "the requested class#method runs with its gate". | One table case. | Low |
| 3 | 72-87 | - | Home card revoked-permissions ordering: real risk (revoke before process start). | Keep. | None |
| 4 | 14-20, 89-100 | - | Cleanup on transport failure, uncertain termination keeps user, pair mismatch before lease, time-zone restore after a killed class: device-safety rules. | Keep. | None |
| 5 | - | Q | Is the device runner itself gating a release, or developer tooling? Brief: "keep only tests of tooling that gates a release". | Owner question. | - |

## Proposed end state
In `test/tooling/native-campaigns.test.ts`: evidence parser table (once), method-selection table, permission order,
cleanup/termination, pair mismatch, time-zone restore. About 40 lines for Calendar instead of 100.
