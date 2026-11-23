# test/browser/workflow-outcome-unknown.spec.ts
- Lines: 94 | Kind: Playwright spec, chromium, 4 tests; real UI over an in-page synthetic agent | Verdict: MERGE into `journeys/workflows.spec.ts` (runs section)
- Covers: interrupted (`outcome-unknown`) runs: a side-effecting workflow blocks new runs until cancelled and removal needs a confirmed cancel; a read-only digest offers explicit Run again with a new run id; hosted digests are not replayable; checking editing support keeps Run visible but disabled. Duplicates: agent route table duplicates `workflow-missed-run-now.spec.ts` (C5). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-43 | C5/T6 | Synthetic agent installed by replacing controller clients in the page. | `harness/workflow-agent.ts` with seeded interrupted runs. | Medium. |
| 2 | 52 | T6 | Test 1 patches `WorkflowProtocol.prototype.metadataSupported`. | Hold `/api/workflow/status` in the agent fake instead. | Low. |
| 3 | 66, 81 | T8 | `waitForTimeout(1000)` twice. | Remove; assert posts after the step. | None. |
| 4 | 91-94 | ok | Hosted case is three assertions. | Fold into the same step loop as the missed-run negatives. | None. |

## Proposed end state
Interrupted-run steps in `journeys/workflows.spec.ts`: side-effect blocks Run → Cancel runs → Remove; read-only Run
again → Confirm new run; hosted shows Cancel only; editing check disables Run. File deleted.
