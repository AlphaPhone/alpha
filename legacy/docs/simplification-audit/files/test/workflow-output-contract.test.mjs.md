# test/workflow-output-contract.test.mjs
- Lines: 63 | Kind: integration of real `workflow-protocol.ts`, `phone-workflow-authoring.ts`, `workflow-device-contract.ts` against synthetic agent responses, run as `node --import=tsx -e` program strings | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: execution receipts show only the typed final text (bounded to 4000 chars, not other runs' output); a phone review binds exact steps, title, device and run, and every notify/speak operation outside it fails closed with the scope error. Duplicates: `test/browser/workflow-presentation-execution.spec.ts` (UI), Lemma `workflow-device-contract.dfy` (part of the binding predicates). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | T9/C5 | Copied `prelude` and string programs (also in `workflow-definition-bounds`, `workflow-typed-schedule`). | One file, direct imports. | None |
| 2 | 33-63 | keep | Security boundary: an agent cannot make the phone post a different title/body or speak at the notice step. | Carry both tests whole. | Low |

## Proposed end state
Deleted as a file; its two tests become the "receipt output" and "presentation binding" blocks of the protocol integration file.
