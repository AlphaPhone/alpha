# test/browser/workflow-missed-run-now.spec.ts
- Lines: 92 | Kind: Playwright spec, chromium, 5 tests; real UI over an in-page synthetic agent | Verdict: MERGE into `journeys/workflows.spec.ts` (runs section)
- Covers: P-10 a typed workflow's missed scheduled time says nothing ran and offers Review and run now only through the normal Confirm run; an armed Run now is not reused; hosted, generic and overlap receipts do not offer the action. Duplicates: synthetic agent route table duplicates `workflow-outcome-unknown.spec.ts` and `workflows.production.spec.ts` (C5). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-44 | C5/T6 | Third hand-written workflow agent; installed by replacing `getWorkflowClient`/`getAutomationsClient` on the controller. | Use `harness/workflow-agent.ts` with seeded runs (`missedOccurrenceAt`). | Medium. |
| 2 | 64-77 | T4 | Test 2 repeats test 1 with one prior tap. | Fold as one extra tap in the same step. | None. |
| 3 | 79-92 | ok | Three negative fixtures, cheap. | Keep as one loop step. | None. |
| 4 | 53 | T8 | `waitForTimeout(500)`. | Remove. | None. |
| 5 | 4 | A8 | Comment cites "#394" and a script. | Drop issue numbers. | None. |

## Proposed end state
Missed-run step in `journeys/workflows.spec.ts`: open the missed receipt, Review and run now → Confirm run → one new
run, missed record retained; negatives for hosted/generic/overlap. Needs `harness/workflow-agent.ts`. File deleted.
