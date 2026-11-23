# scripts/test-reviewed-workflow-host.ts
- Lines: 27 | Kind: live host probe (paired isolated agent on port 47848, real Smithers workflow, optional `--restore` phase) | Verdict: DELETE (with the five sibling `*-host`/crash/cancel probes and `scripts/fixtures/workflow-host.ts`)
- Covers: reviewed workflow admission is idempotent for 8 concurrent submissions, stale version refused, receipt survives restart. Duplicates: upstream `plugin-workflow` tests own admission semantics; Alpha's renderer side is covered by `test/browser/workflows.production.spec.ts`. Callers/importers: none; only named in the comment at `scripts/start-reviewed-workflow-agent.ts:5`. No npm script or workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T5 | Unwired probe of upstream engine behaviour through a paired host. | Delete. | None |
| 2 | 26-27 | B5 | Writes `test-results/workflow-submissions/*.json` reports, errors caught into the report; exit code always 0. | Goes with the file. | None |

## Proposed end state
Deleted. Owner question: with all six probes gone, `scripts/start-reviewed-workflow-agent.ts` and its Quint model `ReviewedWorkflowLauncher` lose their only users.
