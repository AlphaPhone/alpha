# test/workflow-typed-schedule.test.mjs
- Lines: 104 | Kind: integration of real `workflow-protocol.ts`, `workflow-device-contract.ts`, `phone-workflow-authoring.ts` against synthetic agent responses, as `node --import=tsx -e` program strings | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: AP-11 local-time schedules: activation names the reviewed version and maps the agent's refusal; scheduled runs report their occurrence (missed/overlap) and forged or malformed markers are ignored; a scheduled run is reviewed against its pinned trigger; DST forward gaps are named in the review text. Duplicates: `test/browser/workflow-missed-run-now.spec.ts` (UI), `test/workflow-definition-bounds.test.mjs` (trigger rules, same prelude). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-18 | T9/C5 | Copied prelude, string programs, 120 s child timeouts. | Direct import. | None |
| 2 | 24, 30 | owner | `legacy` agent without `typedScheduleProtocol` gets an unversioned activate body: older-agent compatibility (protocol, not app data). | Keep unless the owner drops pre-protocol agents. | Low |
| 3 | 42-75 | keep | Occurrence parsing distinguishes engine-written `missedOccurrenceAt` from workflow output that merely looks like a missed record: trust boundary. | Carry. | Low |
| 4 | 89-104 | keep | DST gap note (New York, London, UTC, invalid zone). | Carry as a table. | Low |

## Proposed end state
Deleted as a file; becomes the "schedules" block of the protocol integration file (activation, occurrences, scheduled review, DST note).
