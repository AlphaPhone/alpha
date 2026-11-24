# test/instrumentation-outcome-status.test.mjs
- Lines: 65 | Kind: tooling (pure parser `instrumentationClassResults` from `scripts/instrumentation-result.ts` over synthetic `am instrument` output) | Verdict: MERGE into `test/tooling/device-campaigns.test.ts` (with `test/android-instrumentation-runner.test.mjs`'s parser cases)
- Covers: instrumentation output parsing: extra outcome status lines do not change counts, assumption-skipped methods are listed not passed, JUnit-ignored methods without a start are skipped, duplicate/overlapping/unstarted records fail a class. Duplicates: `test/android-instrumentation-runner.test.mjs` (655 lines) also exercises `scripts/instrumentation-result.ts` through `scripts/android-instrumentation.ts`. Callers/importers: `npm test` glob. The parser gates emulator evidence (`android-instrumentation.ts`, `test-native-*.ts`, `test-installed-upgrade.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6 | A8 | Header names two specific instrumented methods and outcome keys; the parser is generic. | Rewrite comment to state the rule only. | Low |
| 2 | 15-65 | T3 (accepted) | A pure parser, but it decides whether device evidence counts as passed; it is release-gating tooling, so the T3 exception applies. Malformed-record cases are the valuable part. | Keep the three cases; merge into the device-campaign tooling file next to the runner's other parser cases and drop any duplicates found there. | Low |

## Proposed end state
Three table-driven cases inside `test/tooling/device-campaigns.test.ts` ("instrumentation result parsing"), sharing one
`record()` helper with the runner tests. File deleted.
