# test/workflow-adapter-recovery.test.mjs
- Lines: 153 | Kind: transplant (regex-strips imports of `prototype/workflow-adapter.ts`, evals it in `vm` through `scripts/workflow-renderer-fixture.ts` with a fake shell, client and native plugin) + unit (lines 84-94, 131-138) + one protocol case with the real `WorkflowProtocol` (140-153); re-spawns itself under tsx | Verdict: DELETE (carry 140-153 into `test/integration/workflows-protocol.test.mjs`)
- Covers: a retained run request without submission identity is cleared only by its owner; a reconcilable request is not offered for clearing; a tapped run opens with pending requests; a tap during refresh is opened afterwards; a failed consume is retried without reopening; a run of an unreviewed version is reported. Duplicates: `test/browser/workflow-outcome-unknown.spec.ts` ("May have run"/"Clear request"), `workflow-interruption-recovery.spec.ts`, `workflow-notice-taps.spec.ts`, `workflow-intent-storage.spec.ts`; `readyTapStep`/`tapRecheck` are proven in `specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy`; `scripts/test-workflow-*-ui-flow.ts` use the same fixture. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T9 | Re-spawns `node --import tsx` on itself when no loader is present. | The runner should load tsx once for all tests. | None |
| 2 | 18, 24-53 | T2 | Text-rewritten `workflow-adapter.ts` in a vm with a hand-written `Shell`, `api`, controller and Proxy-backed `localStorage`. | Delete. | Low |
| 3 | 84-94, 131-138 | T3/T4 | `runIntentReconcilable`, `readyTapStep`, `tapRecheck` truth tables; the last two are Lemma-proven. | Delete. | None |
| 4 | 140-153 | keep | Real `WorkflowProtocol.run` refuses when the agent runs a version other than the reviewed one. | Move to the protocol integration file. | Low |
| 5 | 54 | T8 | Polling `wait()` with 5 ms sleeps, 400 iterations. | Goes with the file. | None |

## Proposed end state
File deleted. The version-mismatch case moves to `test/integration/workflows-protocol.test.mjs`. `journeys/workflows.spec.ts` (from `workflow-outcome-unknown.spec.ts` and `workflow-notice-taps.spec.ts`) keeps: "May have run · Clear request → Confirm clear · Nothing sent" starts nothing; a tapped run notification opens that run once.
