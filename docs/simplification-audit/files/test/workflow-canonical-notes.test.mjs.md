# test/workflow-canonical-notes.test.mjs
- Lines: 13 | Kind: transplant (slices an `if` block of `prototype/agent-adapter.ts` between two literal lines and wraps it in `(async function(){…})`) | Verdict: DELETE (already broken)
- Covers: an approved workflow Notes read returns the exact reviewed text; changed, replaced or duplicate notes are refused. Duplicates: `test/browser/dev-workflow-execution.spec.ts` / `dev-workflow-agent.spec.ts` (selected-notes runs). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T2 | Start marker `if(operation.type==='read_selected_notes'&&this.notesSourceMode==='canonical')` no longer exists: the legacy Notes deletion made it `if(operation.type==='read_selected_notes'){` (`agent-adapter.ts:865`). `start` is -1, the body is empty, and test 1 now gets `failed` instead of `succeeded`. | Delete. | None |
| 2 | 2 | T9 | `ALPHA_AGENT_ADAPTER_SOURCE` env override; nothing in scripts, workflows or package.json sets it. | Goes with the file. | None |
| 3 | 4-6 | T3 | Fake host, notes, hash and validator. | Delete. | None |

## Proposed end state
File deleted. One case in `journeys/workflows.spec.ts`: a workflow whose Read step names a selected note is refused ("A selected note changed. Review the workflow again.") after that note is edited, and succeeds with the exact text otherwise.
