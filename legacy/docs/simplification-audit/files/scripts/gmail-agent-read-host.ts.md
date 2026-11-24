# scripts/gmail-agent-read-host.ts
- Lines: 8 | Kind: development-server composition (managed Google agent host over the browser-cloud dev handler) | Verdict: MERGE into `scripts/dev-server/gmail-agent.ts` (see `gmail-agent-dev-broker.ts`)
- Covers: builds the owner-bound Google host for the dev bridge with a 32,000-character Gmail body limit and optional calendar timing logs. Duplicates: none. Callers/importers: `scripts/gmail-agent-dev-broker.ts:4`; `test/gmail-agent-read-host.test.mjs:9` imports it; `test/calendar-managed-rejection.test.mjs:80` replaces it by specifier.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | file | D4 | One-function file with a single caller. | Merge. | L |
| 2 | 7 | D5 | Reads `ALPHA_CALENDAR_READ_TIMING` from the environment inside a factory; one more ad-hoc dev flag. | Pass it as an option from the dev bridge, which already reads its environment. | L |
| 3 | 3 | D13 | Deep import into generated upstream output (`../.eliza/client-features/packages/app/src/runtime/managed-google-agent/index.ts`). | Planned `@eliza/*` alias. | L |

## Proposed end state
Gone as a file; its function lives in the merged dev-server Google module. `test/gmail-agent-read-host.test.mjs` (research: imports the real module
with stub ports; merge into the inbox/Google integration file) imports from the new path.
