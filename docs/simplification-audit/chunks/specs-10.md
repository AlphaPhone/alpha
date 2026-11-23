# Chunk specs-10: `specs/quint/develop-state-review.md` and 22 `specs/quint/legacy/*.qnt` models

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| specs/quint/develop-state-review.md | point-in-time review note | DELETE | carry the snooze DST clamp question to owner questions |
| legacy/Calendar.qnt | historical design comparison (ef9fbf7cd7) | DELETE | live: CalendarPresentation, CalendarFormControls, CalendarApprovalReview; outbox part models D4-deleted linked sync |
| legacy/CameraSession.qnt | historical view-refresh design | DELETE | live: CameraFocusWrites, CameraPreviewRetirement |
| legacy/ChatInput.qnt | historical design comparison | DELETE | live: ChatDock, ComposerSend; remove from quint-model-check.yml:50 |
| legacy/FilesBrowser.qnt | historical view-refresh design | DELETE | live: FilesBrowserController, FilesTree, ... |
| legacy/GoogleConnect.qnt | historical design comparison + temporal | DELETE | live: GoogleConsentAdmission, GoogleAccessPublication, ...; remove from quint-model-check.yml:50,54 |
| legacy/HomeLayout.qnt | historical design comparison | DELETE | live: HomeSurface, DockClearanceOwnership |
| legacy/CoreActionSettlement.qnt | upstream TLA conversion; harness runs current module | KEEP (MOVE) | services/ |
| legacy/CoreApprovalService.qnt | upstream TLA conversion; harness runs historical fragment | DELETE | twin services/CoreApprovalServiceCurrent |
| legacy/CoreEmbeddingDimension.qnt | upstream TLA conversion; historical SQL fragment | DELETE | twins EmbeddingStoreIdentity, NamedEmbeddingProvenance |
| legacy/CoreFactWriteDedupe.qnt | upstream TLA conversion; current runtime | KEEP (MOVE) | services/ (or merge into FactWriteScope if subsumed) |
| legacy/CoreInteractionSession.qnt | upstream TLA conversion; current module + real SQLite | KEEP (MOVE) | services/ |
| legacy/CoreInteractiveTask.qnt | upstream TLA conversion; traces current, refinement historical | KEEP (MOVE) + PORT harness | drop `check-interactive-task-refinement.mjs` historical materialization |
| legacy/CorePluginLifecycle.qnt | upstream TLA conversion; product-patched plugin-lifecycle.ts | KEEP (MOVE) | services/ |
| legacy/CoreProviderExecution.qnt | upstream TLA conversion; current runtime | KEEP (MOVE) | services/ |
| legacy/CoreRoomHandlerQueue.qnt | upstream TLA conversion; product-patched room-handler-queue.ts | KEEP (MOVE) | services/ |
| legacy/CoreRuntimeLifecycle.qnt | upstream TLA conversion; current runtime | KEEP (MOVE) | services/; compare with CoreRuntimeShutdown |
| legacy/CoreSemaphore.qnt | upstream TLA conversion; real task-scheduling.ts | KEEP (MOVE) | services/ (shared harness with Serialise) |
| legacy/CoreSerialise.qnt | upstream TLA conversion; real task-scheduling.ts | KEEP (MOVE) | services/ |
| legacy/CoreServiceLifecycleDesign.qnt | upstream TLA conversion | DELETE | twin services/CoreServiceLifecycle; carry 3 scenarios if missing |
| legacy/CoreSingleFlightMemo.qnt | upstream TLA conversion; current runtime | KEEP (MOVE) | services/ |
| legacy/CoreTaskScheduler.qnt | upstream TLA conversion; read by a *services* harness | KEEP (MOVE) | services/; update `refinement/services/task-scheduler/index.mjs:7` |
| legacy/CoreTaskService.qnt | upstream TLA conversion; product-patched task.ts | KEEP (MOVE) | services/; compare with TaskServiceLifecycle |

## Key correction to the research
research/ci-and-formal.md §2.10 groups the 16 `Core*` models with the historical design comparisons as "historical evidence".
Reading the harnesses shows most of them are not historical: `legacy/core/check-*.mjs` bundle and execute the **current**
pinned upstream modules (`bundleVendorCore`, `loadAgentRuntime`, `loadTaskService`), and three of them
(RoomHandlerQueue, PluginLifecycle, TaskService) execute files that `scripts/core-state-patch.ts` patches in the product
build. Only ApprovalService, EmbeddingDimension and the refinement half of InteractiveTask run historical fragments
from the fetched revision 4787d51a. These harnesses already import real modules (the T10 target shape), so there is
nothing to port beyond dropping text hashes of upstream TLA/test files.

## Coverage that would be lost by the DELETEs
- Design invariants of the six historical UI models that may not be in their live twins: ChatInput `NoLeak`/`BackInOrder`/
  `OneTouchDown`, HomeLayout `GridStable` (174 px keyboard regression) and `TopNeverBlank`, GoogleConnect
  `ScopesNeverShrink`/`TwoTapsToMail`, FilesBrowser restore-conflict and review-version binding, Camera capture queue
  across leave. Implementers should diff each against the live twin's invariant list and add what is missing there.
- `quint:temporal` loses all inputs (only SignIn, GoogleConnect, Maps declare temporal checks in CI). This removes the
  only fairness-guarded liveness checks; the workflow that ran them (`quint-model-check.yml`) has never completed, so
  no green signal is actually lost today.
- CoreServiceLifecycleDesign scenarios (`lateStartIsStoppedOnce`, `unloadLastClassClearsStatus`,
  `failedClassLeavesSiblingAvailable`) and CoreApprovalService race scenarios, if the services twins lack them.

## Shared helpers worth keeping
- `legacy/core/source-support.mjs` (`bundleVendorCore`, `deferred`, `tick`, `observeFile`, `root`) is used by live
  application harnesses and by every kept Core harness: move to `specs/quint/refinement/support.mjs`.
- `refinement/services/core-runtime/module.mjs` and `task-service/module.mjs` loaders: already in the right place.

## Cross-file actions
1. Create `specs/quint/services/Core*.qnt` for the 13 kept models (+ entries in `services/manifest.json`), move their
   harnesses to `refinement/services/core-upstream/`, register them in the services aggregate.
2. Update `refinement/services/task-scheduler/index.mjs:7` model path.
3. Delete the 9 historical/twin models with their harnesses, `refinement/legacy/**`, `test/quint-legacy-*`,
   `test/quint-historical-*`, `test/quint-core-approval-service`, `test/quint-embedding-sql-refinement`,
   `test/quint-core-service-lifecycle-design-refinement`, `test/fixtures/quint/*Comparison.qnt`.
4. Drop `legacy` from the family lists (`scripts/quint-lib.ts:43,227`, `scripts/check-quint.ts:42`,
   `check-quint-refinement.ts:82`, `check-changed-models.ts:20`, `test/quint-checker.test.mjs:32,83`) and move its
   27-model floor into `services`.
5. Remove `specs/quint/legacy/core/source-inventory.json` from `scripts/prepare-quint-history.ts` once
   InteractiveTask/Approval/Embedding historical parts are gone (the MMS inventory decision is separate).
6. Remove the compare/temporal steps in `.github/workflows/quint-model-check.yml` (or the workflow).
7. Path filter for the moved Core lane: `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts`,
   `specs/quint/services/Core*.qnt`, `specs/quint/refinement/services/core-upstream/**`, `refinement/check-traces.mjs`.

## Owner questions
- Are upstream-runtime conformance models (the 13 kept Core models) wanted in this repo, or should they move to
  `vendor/eliza` upstream (D14 forbids doing that here)? Default taken: keep here, run only on pin/patch change.
- Is losing the fairness-guarded temporal checks acceptable, or should one live model (e.g. GoogleConsentAdmission) gain
  temporal properties?
- Snooze autumn repeated-hour clamp (from develop-state-review.md): intended policy?
