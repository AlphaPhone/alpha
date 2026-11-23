# apps/app/src/runtime/workflow-protocol.ts
- Lines: 46 | Role: `WorkflowProtocol` — Alpha subclass of the shared receipt-checked `WorkflowClient` (`@elizaos/contracts/workflow-client`): binds Alpha's `normalizePhoneSpec`, checks the reviewed version on `run`, adds `resendLifecycle` and the hosted-digest sub-client; re-exports the shared error classes and types. | Verdict: KEEP (minor SIMPLIFY)
- Importers: product — `prototype/workflow-adapter.ts`, `prototype/workflow-authoring.ts`, `runtime/connection-ui.tsx`, `runtime/workflow-device-contract.ts` (types), `runtime/hosted-digest-ui.tsx` (via `client.hosted()`). Scripts: `fixtures/workflow-host.ts`, `test-workflow-approval-crash.ts`, `test-workflow-approvals-host.ts`, `test-workflow-lifecycle-host.ts`, `test-workflow-metadata-host.ts`, `test-workflow-protocol.ts`, `workflow-renderer-fixture.ts`. Tests: `adapter-contracts`, `workflow-adapter-recovery`, `workflow-definition-bounds`, `workflow-draft-reopen`, `workflow-lifecycle-resend`, `workflow-output-contract`, `workflow-typed-schedule`, `fixtures/workflow-execution-fixture.mjs`, 10 Playwright specs. Specs: `quint/refinement/services/workflow*.mjs`.
- Text/path pins: `specs/quint/services/manifest.json` symbols `WorkflowProtocol`, `resendLifecycle`, `savePhone`, `versionId`, `WorkflowAdmissionRejected`, `WorkflowTypedRejected`, `WorkflowLifecycleRejected`, `WorkflowApprovalReceipt`, `WorkflowLifecycleReceipt`; `test/support/feature-parity.mjs:628`. Wire: lifecycle route `/api/workflow/workflows/:id/lifecycle`, body `{mutationId, expectedVersionId, operation}`, error code `WORKFLOW_LIFECYCLE_NOT_APPLIED`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15, 18-20 | C1 | Four `as unknown as PhoneWorkflowSpec` double casts because Alpha's `PhoneSpec` (`phone-workflow-authoring.ts:12`) is a separate structural type from upstream `PhoneWorkflowSpec`; the three overrides exist only to re-type parameters. | Make `PhoneSpec` an alias of (or assignable to) upstream `PhoneWorkflowSpec` and delete the three overrides (`generatePhone`, `validatePhone`, `savePhone`) and the cast in the constructor. Keep `savePhone` name (manifest pin is on the inherited method, verify the pin's resolver accepts the base-class method). | Medium: type-level only, but the services manifest names `savePhone` at this path. |
| 2 | 23-27 | B3? | `run()` re-checks `run.versionId!==version` after the shared client — comment says older agents without submission identities cannot refuse a wrong version, so this is a real boundary check. | Keep. | — |
| 3 | 9-10 | D4 | Re-export lists of shared error classes/types (needed while importers use this path). | Keep for now; once the `@eliza/*` alias exists, importers may import upstream directly and these lines go. | Low. |
| 4 | 4-5, 9-10 | D13 | Deep `.eliza` imports. | Alias. | Low. |
| 5 | 18 | D8 | 250-char override line. | Goes with finding 1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PhoneSpec` (imported) vs `PhoneWorkflowSpec` | type | 2, 5 | `runtime/phone-workflow-authoring.ts:12` vs upstream `contracts/src/phone-workflow.ts` | one type (upstream), Alpha alias |

## Proposed end state
~30 lines: constructor binding `normalizePhoneSpec`, the version-checked `run`, `resendLifecycle`, `hosted()`; re-exports until importers move to the alias. No double casts.

## Verification
`node --test test/workflow-lifecycle-resend.test.mjs test/workflow-adapter-recovery.test.mjs test/workflow-output-contract.test.mjs test/workflow-typed-schedule.test.mjs test/adapter-contracts.test.mjs`; `scripts/test-workflow-*.ts`; Quint services workflow replays and manifest symbol pins; `tsc` for the type change.
