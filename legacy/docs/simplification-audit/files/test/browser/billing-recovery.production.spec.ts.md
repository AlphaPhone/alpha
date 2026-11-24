# test/browser/billing-recovery.production.spec.ts
- Lines: 268 | Kind: Playwright spec, production project (flag-off bundle, `flag-off-android.ts` + `resident-stub.ts`), 8 tests, UI-driven | Verdict: MERGE into `journeys/connection-cloud.spec.ts` (subscription section), mostly as is
- Covers: an unfunded Cloud account cannot send and gets the Account popup; membership code invalid/redeemed; plan activated in Cloud billing on return; mid-turn 402 refusal shown once and cleared by plan activation; unchanged plan does not clear a refusal; plan checks deferred and throttled until the owner returns. Duplicates: `native-cloud-subscription.spec.ts` (46-test state matrix, other chunk) overlaps the plan/code states. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 174, 251, 259 | T8/P10 | Three `waitForTimeout(1000)` to prove nothing was retried/read. | Install `page.clock` and `runFor(1000)` before asserting absence. | Low. |
| 2 | 26-30 | T9 | `ALPHA_BILLING_SHOTS` env knob: no setter in the repo (`git grep`). | Drop the knob; always `info.outputPath`. | None. |
| 3 | 17-19 | C6 | `REFUSED` and `SHEET_REFUSED` are the same string. | One constant. | None. |
| 4 | 50, 73, 94 … | P11 | 120-150 s per test. | Default after harness speed-up. | Low. |
| 5 | whole | T4 | Overlaps `native-cloud-subscription.spec.ts`. | When merging, keep these journeys and drop matrix rows of that spec that assert the same states. | Medium. |

## Proposed end state
Moves into `journeys/connection-cloud.spec.ts` with clock-based absence checks, no env knob, shared constants. All 8 cases are user journeys and stay (the throttling test is the only coverage of deferred plan checks).
