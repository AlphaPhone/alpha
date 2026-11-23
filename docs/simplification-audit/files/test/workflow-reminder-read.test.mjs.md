# test/workflow-reminder-read.test.mjs
- Lines: 37 | Kind: integration of real `runtime/workflow-reminder-read.ts` `workflowReminderRows` (with the shared contract it imports) over synthetic reminder rows, in a `node --import=tsx -e` child | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: the selected-reminders Read step shares only today's open and completed reminders (overdue included, tomorrow/cancelled/alarms/yesterday excluded, recurring occurrence and undated to-do handled), never bodies, and refuses with an explanatory message when over the reviewed bound. Duplicates: `test/workflow-reminder-contract.test.mjs` (validation side); `agent-adapter.ts:857-861` is the caller. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-33 | T9 | String program. | Direct import. | None |
| 2 | 13-23 | keep | Row-selection table is the only coverage of which reminders leave the phone. | Carry whole. | Medium |

## Proposed end state
Deleted as a file; one table case in the protocol integration file. A Playwright check is not needed: the overflow copy is plain text from this function.
