# test/resident-auto-retry.test.mjs
- Lines: 9 | Kind: transplant (slices `connection-ui.tsx` from `const RESIDENT_AUTO_RETRY_MS` and runs it in `vm`) + source-text | Verdict: REWRITE as one case in `journeys/connection-cloud.spec.ts`
- Covers: classified `start-failed` resident failures retry at 3 s, 10 s, 30 s, 60 s then stop; owner/epoch/busy/recovery/active changes cancel a pending retry. Duplicates: none found in `test/browser` (no spec asserts the schedule). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-5 | T2 | Marker slice + `stripTypeScriptTypes` + `vm` with 10 fake globals; breaks on rename/split of `connection-ui.tsx` (D1). | Delete. | Low |
| 2 | 7 | T1 | Regex of the catch clause text in `connectResident`. | Delete. | Low |
| 3 | 1-9 | D8 | Whole test on single minified lines. | Goes with the file. | Low |

## Proposed end state
Delete. Carry one case: with the resident stub answering `start` with code `start-failed`, Playwright clock
(`page.clock`) advances 3 s/10 s/30 s/60 s and the stub sees exactly four restarts, then none; a generic failure
schedules none. The cancel-on-epoch variants are internal and are not carried.
