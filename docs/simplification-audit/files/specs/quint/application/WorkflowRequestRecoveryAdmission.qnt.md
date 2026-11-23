# specs/quint/application/WorkflowRequestRecoveryAdmission.qnt
- Lines: 72 | Kind: Quint model (live: manifest, 5 scenarios, 4 invariants) | Verdict: KEEP while `workflow-request-recovery.ts` stays (follows the code, D20); owner question Q-DEV-3
- Covers: the browser Workflows recovery dialog is bound to one live review: a newer open or departure closes the old one, and capture/reset/save callbacks from a retired review do nothing. Duplicates: Playwright `test/browser/domain-recovery-lifecycle.spec.ts` (1 test, recovery cancels on leave). Callers/importers: manifest; harness `refinement/application/workflow-request-recovery-admission.mjs` (120); `test/quint-workflow-request-recovery-admission.test.mjs` (10) and the aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A3 / D6 | Production never reaches the modelled dialog: `openDomainRecovery` returns `openRetainedDataNotice` unless `testMocksEnabled` (`browser/domain-recovery.ts:9`), and `WorkflowIntentStore.recoveryDocument()` throws on Android. The dialog's `capture` is the "Download backup" (D3: backup is deleted) and the dialog also offers "Download old copy" (A1). Cross-file-actions Q-DEV-3 decides: backup deleted (D3), the rest moved to `dev/` (D6), with `workflow-request-recovery.ts` behind the dev boundary. | Keep the model with the code. When D3 removes the backup button, delete `capture`, `captured`, its use in `AllCallbacksBelongToAnOfferedReview` and the `capture(...)` steps in two scenarios. If the owner deletes web workflow recovery altogether, DELETE this model, its harness and test together. | Medium (depends on owner answer) |
| 2 | harness 14 | T2-lite | Harness uses `sourceContext([source], ['createWorkflowRequestRecovery'])`: strips types from the whole file, deletes `import`/`export` lines by regex and evals it in `vm`. Not a slice, but not an import. | PORT: `tsImport('apps/app/src/runtime/workflow-request-recovery.ts')` and call the export (the module has only type imports). | Low |
| 3 | test | T4 | Runs per-model and in the aggregate. | Run once. | Low |

## Proposed end state
Model of a dev/test-mocks-only surface: about 60 lines once capture (backup) is gone, harness importing the module directly, one runner, model moved with the code if it goes under `dev/`. Deleted together with the code if Q-DEV-3 resolves to delete.
