# scripts/test-workflow-approval-crash.ts
- Lines: 29 | Kind: live host probe (SIGKILL between canonical Smithers approval and projection on isolated port 47854; prepare/verify phases) | Verdict: DELETE (with the workflow host probe family and `scripts/fixtures/workflow-host.ts`)
- Covers: upstream engine exactly-once effect after a crash in the approval projection gap. Duplicates: upstream `plugin-workflow` owns it. Callers/importers: none; named only in `scripts/start-reviewed-workflow-agent.ts:6` comment. Depends on state left by `test-workflow-approvals-host.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T5 | Unwired upstream probe; calls `controlSmithersRun` from the prepared source via `bun --eval`. | Delete. | None |
| 2 | 28-29 | B5 | Errors captured into a JSON report; process exits 0 on failure. | Goes with the file. | None |

## Proposed end state
Deleted.
