# scripts/test-workflow-cancel-recovery.ts
- Lines: 34 | Kind: live host probe (cancel acknowledged, SIGKILL, restart, 18 s wait to prove no held effect) | Verdict: DELETE (probe family + `scripts/fixtures/workflow-host.ts`)
- Covers: upstream durable cancellation across a hard stop. Duplicates: upstream `plugin-workflow`. Callers/importers: none (comment in `start-reviewed-workflow-agent.ts:6`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T5 | Unwired upstream probe. | Delete. | None |
| 2 | 21, 30 | T8 | 15 s held source and fixed 18 s sleep. | Goes with the file. | None |

## Proposed end state
Deleted.
