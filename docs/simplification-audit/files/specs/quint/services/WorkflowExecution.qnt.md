# specs/quint/services/WorkflowExecution.qnt
- Lines: 174 | Kind: Quint model (live; product workflow run submission) | Verdict: MERGE with `WorkflowExecutionAuditAdmission.qnt` into this file (keep this name); harness `workflow.mjs` DELETE in favour of the audit harness (ported)
- Covers: version-fenced manual run submission with a durable intent, unknown outcome → reconcile → owner-confirmed resend, late admission winning a resend, owner/epoch scoping of receipts, reviewed approval digest, cancel, and the development trigger queue gated on mocks. Duplicates: `WorkflowExecutionAuditAdmission.qnt` (same component, header says so; research §2.11). Callers/importers: `quint:check` (9 runs); `refinement/services/workflow.mjs` (aggregate `services/index.mjs:17,76`); obligation text at `services/index.mjs:141`; README/doc mentions.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | C5 / §2.11 | Two models of one component. This one has `lateAdmission`, owner `epoch`/`reopenOwner` and `refuseVersion`; the audit twin has the legacy-agent path, `versionMismatch`, `requestChanged` (new decision for changed request), `scanTick`, witnesses and the stronger harness. Invariants overlap (`AtMostOneExecution`, `DurableSubmission`, `ReviewedEffect`, cancel-needs-receipt, production trigger gate). | Merge into one `WorkflowExecution` module: union of actions, invariants and `run`s; drop duplicated runs (`reviewedExecution`, `unknownSubmission`, `denialAndCancel`, `triggerDisable` exist in both). | Medium (model edit; Quint must still pass) |
| 2 | harness `workflow.mjs` | T3 / T4 | Its replay only observes `s.intentSaved`, `s.reviewedVersion`, `s.version` across validate/edit/save/retain/restart of the real `WorkflowProtocol` + `WorkflowIntentStore`; the same calls are exercised by `workflow-execution-audit-admission.mjs` (real protocol + adapter) and `checkWorkflowAuthoring`. Installs global `window`/`localStorage`. | Delete `workflow.mjs`; the merged model uses the audit harness. | Low |
| 3 | manifest | — | Lists nine `sources` including `browser/workflow-trigger-runtime.ts` and `browser/workflow-triggers.ts` (dev simulator) and `runtime/workflow-local-time.ts`, but no symbols; no harness touches the trigger runtime for this model. | After merge, keep the union of sources the harness actually executes. | Low |
| 4 | 24, 138 | — | `FixtureQueueRequiresMocks` is the production gate for the dev trigger queue; keep it in the merged model (twin calls it `ProductionTriggerGate`). | Keep one name. | — |

## Proposed end state
One `WorkflowExecution.qnt` (≈220 lines) holding both views, one harness (the ported audit admission harness, renamed
`workflow-execution.mjs`), one test. `WorkflowExecutionAuditAdmission.qnt` and `workflow.mjs` deleted; manifest has one entry.
