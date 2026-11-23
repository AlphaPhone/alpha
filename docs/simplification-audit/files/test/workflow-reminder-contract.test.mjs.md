# test/workflow-reminder-contract.test.mjs
- Lines: 33 | Kind: integration of real `runtime/workflow-device-contract.ts` (reminder read parsing, result validation with revision hashes, operation binding) in a `node --import=tsx -e` child | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: a selected-reminders read stays inside the reviewed owner-day window: bad window/day/extra fields refused; future, old-completion, tampered, body-carrying or overflowing results refused; another day or a widened bound refused at execution. Duplicates: `test/workflow-reminder-read.test.mjs` (row selection side), Lemma `workflow-device-contract.dfy` (partial). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-31 | T9 | String program, one giant `deepEqual` on JSON. | Direct import, named assertions. | None |
| 2 | 10-28 | keep | Privacy boundary for reminder data leaving the phone. | Carry all cases. | Low |

## Proposed end state
Deleted as a file; becomes the "reminder read bounds" block of the protocol integration file, next to `workflow-reminder-read` cases.
