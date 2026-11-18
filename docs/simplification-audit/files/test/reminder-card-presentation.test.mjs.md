# test/reminder-card-presentation.test.mjs
- Lines: 24 | Kind: unit (real pure module, T3) | Verdict: MERGE into `test/device-record-presentation.test.mjs` (then the calendar integration)
- Covers: Reminder review card copy rounds to the minute while the receipt keeps the exact instant; a body that repeats the title is dropped. Duplicates: `test/device-record-presentation.test.mjs` tests the same `presentDeviceRecordOperation`; Playwright `reminder-create-review.spec.ts` shows the card. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-24 | T4 | Second file for the same function. | Fold the two cases into the existing presentation test. | Low |
| 2 | 13-15 | A1? | `create_reminder` legacy op presentation. | Same owner question as reminder-capability-negotiation. | Low |

## Proposed end state
- Two table rows in one presentation test.
