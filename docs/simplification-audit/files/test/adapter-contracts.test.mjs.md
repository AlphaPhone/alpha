# test/adapter-contracts.test.mjs
- Lines: 23 | Kind: tooling wrapper (spawns 26 `scripts/test-*.ts` child suites, one `node --import tsx` process each) | Verdict: DELETE the wrapper; MOVE the suites into `test/` (per-suite verdicts belong to the scripts chunk)
- Covers: whatever the 26 child scripts test (Calendar CRUD/race, Google Calendar protocol, reminders, clock hand-off, Cloud protocol/subscription/personal/voice, Inbox, Gmail, Maps, device actions, workflow UI, Notes). Duplicates: none itself. Callers/importers: `npm test` glob; all 26 scripts exist today (checked).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-23 | T9 | Indirection: the real tests live in `scripts/` under a `test-` prefix and are invisible to `node --test` reporting (one opaque pass/fail per script). | Move each script into `test/` (as `*.test.ts` run by the node test runner directly); delete the wrapper. | Low |
| 2 | 15-16 | C3 | Inline copy of `fixtures/child-suite.mjs` (deletes `NODE_TEST_CONTEXT`). | Gone with the wrapper. | - |
| 3 | 7 | A3 / D5 | `test-cloud-personal-flow.ts` tests `cloud-personal-protocol.ts` and `development-cloud-agents.ts`, the personal-Cloud path that `cross-file-actions.md` U-R5 deletes. | Delete that suite with the feature. | None |
| 4 | 4-12 | P1 | 26 serial process spawns, each loading tsx and its imports (tests-host research: the largest structural cost in the host suite after javac). | Run in-process under one runner. | - |

## Proposed end state
Wrapper deleted. Each surviving suite becomes a test file grouped by area (for example `test/integration/calendar.test.ts`
from `test-calendar-crud-review.ts` + `test-calendar-query-race.ts` + `test-google-calendar-protocol.ts`;
`test/integration/inbox.test.ts` from the four Inbox/Gmail scripts; `test/integration/workflows.test.ts` from the five
workflow scripts; `test/integration/notes.test.ts` from the four Notes scripts). Those scripts that slice source text
(check each) are deleted rather than moved. `test-cloud-personal-flow.ts` is deleted (D5).
