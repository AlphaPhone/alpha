# Chunk specs-52: services models, task runtime and workflow family

All 13 files exist and were read in full. Every model is live: it is listed in `specs/quint/services/manifest.json`, which
`scripts/check-quint.ts` loads. Every manifest `symbols` pin still matches its file today (checked with a regex pass:
none missing). Five models cover only upstream `vendor/eliza` code. One models a build script. Two are twins of a single
component. Three have harnesses that load product source as text (T2/T10).

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `TaskSchedulerRuntime.qnt` | Quint, upstream-only | KEEP | upstream-pin lane; delete twin `legacy/CoreTaskScheduler.qnt` + `task-scheduler/index.mjs` |
| `TaskServiceLifecycle.qnt` | Quint, upstream-only | KEEP | upstream-pin lane; drop the harness's `legacy/core/formal-source-inventory.mjs` import |
| `TriggerCursor.qnt` | Quint, dev trigger simulator | KEEP (D20) | update paths when the simulator moves to `dev/`; drop the globals-isolation test |
| `WebReadingReview.qnt` | Quint, product Browser read-aloud | KEEP | reword the "web build" header; drop symbol pins |
| `WorkflowAuthoring.qnt` | Quint, product | KEEP; PORT harness | `createWorkflowAuthoring` takes ports + exposes state; import it instead of the seam-string transplant |
| `WorkflowEngineAdmission.qnt` | Quint, upstream-only | KEEP | upstream-pin lane |
| `WorkflowExecution.qnt` | Quint, product | MERGE (target) | absorbs `WorkflowExecutionAuditAdmission.qnt`; delete harness `workflow.mjs` |
| `WorkflowExecutionAuditAdmission.qnt` | Quint, audit twin | MERGE into `WorkflowExecution.qnt`; PORT harness | its harness becomes the single one, importing the adapter |
| `WorkflowLifecycleChange.qnt` | Quint, product | KEEP; PORT harness | `workflow-adapter-fixture.mjs` → import the adapter |
| `WorkflowNoticeTaps.qnt` | Quint, product | KEEP; PORT harness | extract the tap handler from `workflow-adapter.ts` into an exported module |
| `WorkflowScheduleTasks.qnt` | Quint, upstream-only | KEEP | upstream-pin lane |
| `WorkflowWakeups.qnt` | Quint, upstream-only | KEEP | upstream-pin lane |
| `WorkflowWorkerStaging.qnt` | Quint, build-script model | DELETE | move the harness scenarios into `test/workflow-worker-staging.test.mjs` as a plain integration test |

## Coverage lost if the DELETEs happen
- `WorkflowWorkerStaging`: none, if its harness scenarios move to the integration test as proposed. These are the seven
  corruption refusals and the publish, restore and cleanup refusal cases, all run against the real
  `scripts/workflow-worker-artifact.ts`. Without that move, nothing tests the backup-on-failed-restore behaviour except
  a real Android build that happens to fail.
- Merging the WorkflowExecution twins loses nothing, provided the union of actions keeps both variants:
  `lateAdmission`/`reopenOwner` from the base model and `versionMismatch`/`requestChanged`/`clearRequest` from the audit
  model. Deleting `workflow.mjs` loses only its observation of `WorkflowIntentStore` restart. The audit harness
  replays restart too.
- The question-review branch of `WorkflowNoticeTaps` is model-only today: the harness observes run taps only. That is
  not a new loss, but the Playwright workflows journey should cover it.

## Shared helpers worth keeping
- `refinement/services/workflow-engine/ports.mjs` bundles the real upstream engine. It is shared by the engine, wakeup
  and task-registration harnesses. Keep it, without the rehash ceremony.
- `refinement/services/task-service/module.mjs`, `task-scheduler/module.mjs`: real upstream bundles (keep; remove `legacy/` import, receipts).
- `refinement/services/workflow-adapter-fixture.mjs` is used by the lifecycle and audit-admission harnesses. Keep it
  as the single workflow-adapter harness, but port it from `readFileSync` + `vm` to an import.
- `test/fixtures/workflow-worker-assets.mjs` stays as the fixture of the moved staging integration test.

## Cross-file actions
1. Add an upstream-pin formal lane that runs only when `upstream.lock.json`, the `vendor/eliza` pointer or
   `scripts/core-state-patch.ts` changes. Five models move to it: TaskSchedulerRuntime, TaskServiceLifecycle,
   WorkflowEngineAdmission, WorkflowScheduleTasks and WorkflowWakeups.
2. Delete `legacy/CoreTaskScheduler.qnt`, `refinement/services/task-scheduler/index.mjs` and `legacy/CoreTaskService`.
   Remove the `materializeHistoricalFormalSources` import from `task-service/module.mjs`. Together these are
   preconditions for retiring `specs/quint/legacy` (P6).
3. Port `workflow-adapter-fixture.mjs` and `workflow-local-source.mjs` from text transplants to imports. That needs two
   product-side seams:
   - `createWorkflowAuthoring(ports)` with a state getter;
   - an exported notice-tap handler module.

   Do this before the structural split and the Prettier pass of `workflow-adapter.ts`/`workflow-authoring.ts`. Until
   then those harnesses pin the literals `' let tapBusy=false'`, `' const dismissTap='`, the `return {get active()…}`
   seam, `openedTap=result.token;` and `if(locked()||!draft)return;run();`.
4. Delete the harness-mutation canaries. They live in `test/quint-workflow-local-source.test.mjs:6-7` and
   `test/quint-workflow-execution-audit-admission.test.mjs` (source-text rewrites). Also delete
   `test/trigger-cursor-isolation.test.mjs` and the hash-fires cases in `test/quint-workflow-engine-refinement.test.mjs`.
5. Drop the `symbols` lists from the manifest entries in this chunk: TriggerCursor, WebReadingReview,
   WorkflowAuthoring, WorkflowExecutionAuditAdmission, WorkflowLifecycleChange and WorkflowNoticeTaps. Many pins are
   generic words such as `blocked`, `finish` and `generation`.
6. Each harness here runs twice: once in the aggregate `refinement/services/index.mjs` or `forward-replays.mjs`, and
   once in its own `test/quint-*.test.mjs`, which is often 180–300 s and sometimes self-respawned under tsx. Keep one,
   and replace exact `traces`/`checkpoints` assertions with `> 0`.

## Owner questions
- Can Alpha still connect to an agent without workflow submission identities (no `manualSubmissionProtocol`)? If not,
  delete the "legacy agent" path together with the `legacy` half of `WorkflowExecutionAuditAdmission`:
  - product side: `workflow-adapter.ts` `unverifiable`/`reviewClear`/`clearRunRequest`, and the reviewed-version
    re-check in `WorkflowProtocol.run`;
  - model side: `initLegacy`, `clearRequest`, `versionMismatch` and the legacy runs.
- Should the dev workflow trigger simulator (`browser/simulated-workflows.ts`, `workflow-trigger-runtime.ts`) stay?
  Keeping it keeps `TriggerCursor.qnt`, its replay and `workflow-triggers.dfy`.
- Is it acceptable to replace the build-script model `WorkflowWorkerStaging.qnt` with a plain integration test? The
  owner's brief keeps "models of live product code", and a build script is not product code.
