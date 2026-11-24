# scripts/test-workflow-lifecycle-host.ts
- Lines: 17 | Kind: live host probe (paired isolated agent on 47856; remove workflow with 6 concurrent requests, restart, restore paused) | Verdict: DELETE (probe family + `scripts/fixtures/workflow-host.ts`)
- Covers: upstream workflow lifecycle mutation idempotency and receipt persistence. Duplicates: upstream `plugin-workflow`; renderer lifecycle in `scripts/test-workflow-lifecycle-ui-flow.ts` and browser workflow specs. Callers/importers: none (comment in `start-reviewed-workflow-agent.ts:8`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T5 | Unwired upstream probe over hosted pairing (D5). | Delete. | None |
| 2 | 13-16 | D8 | Entire test on four lines. | Goes with the file. | None |

## Proposed end state
Deleted.
