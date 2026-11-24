# scripts/test-workflow-approvals-host.ts
- Lines: 34 | Kind: live host probe (paired isolated agent on 47854, real Smithers approval workflow appending to a temp file) | Verdict: DELETE (probe family + `scripts/fixtures/workflow-host.ts`)
- Covers: upstream approval semantics: no effect before approval, stale version/digest 409, concurrent identical decisions idempotent, conflicting decision 409, denial/cancel no effect. Duplicates: upstream `plugin-workflow` tests; renderer side in `workflows.production.spec.ts`. Callers/importers: none (comment in `start-reviewed-workflow-agent.ts:6`); writes the `approval-fixture.json` that `test-workflow-approval-crash.ts` reads.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T5 | Unwired upstream probe over hosted pairing (`host.pair()`, D5). | Delete. | None |
| 2 | 33-34 | B5 | Report file instead of exit status. | Goes with the file. | None |

## Proposed end state
Deleted.
