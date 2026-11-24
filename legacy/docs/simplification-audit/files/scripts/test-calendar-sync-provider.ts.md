# scripts/test-calendar-sync-provider.ts
- Lines: 194 | Kind: integration of a deleted module (real `CloudProtocol` + `googleCalendarSyncPort` over a fake transport) | Verdict: DELETE (with shim `test/calendar-linked-provider.test.mjs`)
- Covers: the client-side Google Calendar linked-sync port (conditional writes, lost-response lookup, identity fences). Duplicates: none needed. Callers/importers: `test/calendar-linked-provider.test.mjs` (child suite).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | A2 / D4 | Imports `apps/app/src/runtime/calendar-linked-provider.ts`, which no longer exists in this worktree (deleted in Stage A1, DECISIONS D4). The test currently fails. | Delete the script and `test/calendar-linked-provider.test.mjs` together. | L |

## Proposed end state
Both files gone. Agent-side sync (`agent-calendar.ts`) is the product path and is covered elsewhere.
