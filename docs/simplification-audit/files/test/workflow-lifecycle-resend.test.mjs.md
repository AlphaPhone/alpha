# test/workflow-lifecycle-resend.test.mjs
- Lines: 199 | Kind: transplant (tests 1-7: `prototype/workflow-adapter.ts` evaluated in a vm via `scripts/workflow-renderer-fixture.ts` with a synthetic agent) + integration of the real `WorkflowProtocol` against a synthetic route handler (tests 8-9, lines 163-199); re-spawns under tsx | Verdict: MERGE tests 8-9 into `test/integration/workflows-protocol.test.mjs`; delete the rest
- Covers: a removal/restore never received by the agent is resent under its original mutation ID after a second tap; leaving the review sends nothing; refused/changed/applied-meanwhile/no-answer/stale-version outcomes; the route client applies a mutation at most once and validates identity before sending. Duplicates: `test/browser/workflow-interruption-recovery.spec.ts` (Resend flow), `workflow-retirement.spec.ts`, Quint `quint-workflow-lifecycle-change.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T9 | tsx self-respawn. | Delete. | None |
| 2 | 18, 25-64 | T2 | vm transplant of the adapter with a fake shell; same harness as `workflow-adapter-recovery` and `workflow-management-capability` (C5). | Delete. | Low |
| 3 | 68-161 | T4 | Seven UI-state cases; the browser recovery spec drives the real view. Check that it covers "first tap only reviews" and "refused while running stays retained"; add those two if missing. | Delete here. | Medium |
| 4 | 163-199 | keep | Real `resendLifecycle`: one post per mutation, receipt reuse, 409 → `WorkflowLifecycleRejected`, invalid ID/operation rejected before sending. | Carry. | Low |

## Proposed end state
Two route-client cases move to the protocol integration file. `journeys/workflows.spec.ts` (from `workflow-interruption-recovery.spec.ts`) keeps: "Not received · Resend available" → Confirm resend → Removed · History kept, and a refused resend stays offered.
