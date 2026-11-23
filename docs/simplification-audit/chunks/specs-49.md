# Chunk specs-49: services Quint models A–Core and two services harnesses

26 files: 2 refinement harnesses and 24 `specs/quint/services/*.qnt` models. All 24 models are live: they are registered in `specs/quint/services/manifest.json`, and every listed source exists in the worktree today. None models code that DECISIONS deletes, so there are no DELETEs in this chunk. The work here is about how the models are bound to the code, what they depend on in `specs/quint/legacy`, and which harnesses only the aggregate runs.

| File | Kind | Verdict | Harness / binding |
|---|---|---|---|
| refinement/services/workflow-worker-staging.mjs | harness (real import) | KEEP, SIMPLIFY | imports `scripts/workflow-worker-artifact.ts`; overlaps `test/workflow-worker-assets.test.mjs` test 1 |
| refinement/services/workflow.mjs | harness (esbuild import) | KEEP, SIMPLIFY; rename `workflow-execution.mjs`; add wrapper | **aggregate-only** |
| AndroidBrowserModuleStage.qnt | build-tool model | KEEP (owner Q) | import via fixture |
| AndroidBuildInputReadiness.qnt | build-tool model | KEEP (owner Q) | imports preflight exports |
| AndroidGzipAssetStage.qnt | build-tool model | KEEP; narrow sources | imports script |
| AppUpdateCandidate.qnt | release-tool model | KEEP; drop `resident-android.yml` from sources | imports `main` |
| ApprovalDecision.qnt | product model | KEEP; drop symbols; PORT fixture | `workflow-adapter-fixture.mjs` transplants `workflow-adapter.ts` |
| AutomationRequestSettlement.qnt | product model | KEEP; PORT harness | **slices `test/automations-unified.test.mjs`** and strips/rewrites `automations-adapter.ts` |
| BrowserCloudRequestCustody.qnt | dev-bridge model | KEEP (D6) | spawns tsx probe |
| BrowserDownloads.qnt | mostly-upstream model | KEEP; add wrapper | `policies.mjs` javac, **aggregate-only** |
| BrowserGoogleReturn.qnt | dev-bridge model | KEEP; PORT harness | **slices `browser-cloud-dev-bridge.ts`** by literal anchors; **aggregate-only** |
| BrowserReadingState.qnt | product model | KEEP; add wrapper | `reading.mjs` esbuild + Chromium, **aggregate-only** |
| BrowserSiteState.qnt | mostly-upstream model | KEEP; add wrapper | `policies.mjs`, **aggregate-only** |
| CalendarLinkedSync.qnt | upstream-only model | KEEP (upstream-pin lane); add wrapper | `calendar-linked.mjs` imports `.eliza` copies, **aggregate-only** |
| CalendarSync.qnt | product model | KEEP; re-check consent half after D4 | no harness; imported by `ApplicationComposition` |
| CanonicalNotesStore.qnt | upstream-only model | KEEP; rename `legacyInit` | esbuild import |
| ClientFeaturePublication.qnt | build-tool model | KEEP; harness SIMPLIFY | spawns a named test in `test/client-feature-preparation.test.mjs` |
| CloudQaLauncher.qnt | dev-launcher model | KEEP pending owner; merge launcher models | child probe |
| CombinedAgentLauncher.qnt | dev-launcher model | KEEP pending owner; merge launcher models | child probe |
| ContactsSession.qnt | product model | KEEP; drop symbols | esbuild import |
| CoreApprovalServiceCurrent.qnt | upstream-only model | KEEP; delete legacy twin `legacy/CoreApprovalService.qnt` | imports `legacy/core/source-support.mjs` |
| CoreConnectorCustody.qnt | upstream + `core-state-patch.ts` | KEEP; move checker out of legacy | wraps `legacy/core/check-plugin-connector-custody.mjs` (348 lines) |
| CoreRuntimeRetirement.qnt | upstream-only model | KEEP (upstream-pin lane) | `core-runtime/module.mjs` → legacy historical inventory |
| CoreRuntimeShutdown.qnt | upstream-only model | KEEP (upstream-pin lane) | same |
| CoreServiceLifecycle.qnt | upstream-only model | KEEP; delete legacy twin `CoreServiceLifecycleDesign.qnt` | same |
| CoreTurnControllers.qnt | upstream-only model | KEEP (upstream-pin lane) | same |

## Coverage that would be lost
- **Deleting the services aggregate (`test/quint-services-refinement.test.mjs`, verdict DELETE T4) before adding wrappers** would remove every refinement replay for `WorkflowExecution` (`workflow.mjs`), `BrowserGoogleReturn`, `BrowserSiteState`, `BrowserDownloads`, `IdentitySession` (all three through `policies.mjs`), `BrowserReadingState` (`reading.mjs`) and `CalendarLinkedSync`. Add per-model wrappers first, or entries in the merged refinement runner.
- **Retiring `specs/quint/legacy`** before moving three pieces would break six current models. The pieces: `legacy/core/source-support.mjs` (used by CoreApprovalServiceCurrent), `legacy/core/check-plugin-connector-custody.mjs` (CoreConnectorCustody) and `legacy/core/formal-source-inventory.mjs` (called by `core-runtime/module.mjs:9,49`, so it breaks Retirement, Shutdown, ServiceLifecycle and Turns). That last call also makes current harnesses need the network `quint:prepare-history` fetch. Removing it is a cheap, large win.
- **Splitting `test/automations-unified.test.mjs`** as its reviewer proposes would break the AutomationRequestSettlement harness, which slices that test's `adapterFixture`. Port it first.
- **Prettier (D9) or moving `browser-cloud-dev-bridge.ts`** breaks the BrowserGoogleReturn harness (literal two-space anchors).
- If the owner drops build-tool models (§2.11), then AndroidBrowserModuleStage, AndroidBuildInputReadiness, AndroidGzipAssetStage, AppUpdateCandidate, ClientFeaturePublication and WorkflowWorkerStaging lose their only fault-injection coverage. Host tests would have to take back the publish/restore/cleanup fault cases.
- `CalendarSync` has no executable refinement at all. The obligation text in `services/index.mjs` claims paths "execute", but no harness emits `CalendarSync` traces.

## Shared helpers worth keeping
- `refinement/services/support.mjs`: `sourceModule` (esbuild import, the robust binding), `deferred`, `until`, `action`. Add `memoryStorage()` and the `capture` lambda (copied in `workflow.mjs:8` and `reading.mjs:11`) here, or delete both with the §2.8 re-hash cleanup.
- `core-runtime/module.mjs:loadCoreRuntime`: keep the vendor bundle and drop the historical inventory and mid-run re-hash.
- `test/fixtures/workflow-worker-assets.mjs`: used by the harness and by `test/workflow-worker-assets.test.mjs`. It survives either way.

## Cross-file actions
1. Add wrappers for `workflowRefinement`, `policyRefinement`, `readingRefinement`, `calendarLinkedRefinement` and `checkBrowserGoogleReturn` before deleting `refinement/services/index.mjs` and `test/quint-services-refinement.test.mjs`.
2. Move `legacy/core/{source-support,check-plugin-connector-custody}.mjs` into `refinement/`. Delete the `materializeHistoricalFormalSources` call in `core-runtime/module.mjs`. Then delete `legacy/CoreApprovalService.qnt` and `legacy/CoreServiceLifecycleDesign.qnt` with the legacy family, and lower the floors in `test/quint-checker.test.mjs:32` as needed.
3. PORT `browser-google-return.mjs` (export the callback handler from the bridge) and `automation-request-settlement.mjs` (fixture into `test/fixtures/`). Also port `workflow-adapter-fixture.mjs` for ApprovalDecision, together with the stage-F adapter split.
4. Manifest edits: drop `symbols` for ApprovalDecision, AutomationRequestSettlement and ContactsSession. Drop `.github/workflows/resident-android.yml` from AppUpdateCandidate. Narrow AndroidGzipAssetStage `sources`. Update CalendarSync `sources` when `canonical-calendar-draft.ts` merges, and BrowserCloudRequestCustody/BrowserGoogleReturn when the bridge moves to `dev-server/`.
5. Upstream-pin CI lane: CalendarLinkedSync, CanonicalNotesStore, CoreApprovalServiceCurrent, CoreConnectorCustody, CoreRuntimeRetirement, CoreRuntimeShutdown, CoreServiceLifecycle, CoreTurnControllers. Select them only on `upstream.lock.json`, the vendor pointer or `scripts/core-state-patch.ts`.
6. Small model edits: remove the duplicate `s.operationOwner == s.owner` in `CalendarSync.qnt:40`, and rename `legacyInit` → `mixedTimestampInit` in `CanonicalNotesStore.qnt` so it is not deleted as an A1 legacy reader (it models upstream's current timestamp fallback).
7. Wrapper `test/quint-workflow-worker-staging.test.mjs`: assert `traces > 0`, not `=== 14`. Trim the duplicated refusal cases from `test/workflow-worker-assets.test.mjs` test 1.
8. Make `client-feature-publication.mjs` share a fixture with `test/client-feature-preparation.test.mjs` instead of spawning it by test name and env knob.

## Owner questions
- Are models of build and release scripts (AndroidBrowserModuleStage, AndroidBuildInputReadiness, AndroidGzipAssetStage, AppUpdateCandidate, ClientFeaturePublication, WorkflowWorkerStaging) "live product code" that must stay, or does the build itself suffice?
- Should the upstream-only Core* models, CalendarLinkedSync and CanonicalNotesStore move to `vendor/eliza`'s own formal suite (Q4)?
- Do the development launchers `start-cloud-qa.ts` and `start-combined-agent.ts` stay? They and their models currently justify each other.
- After the D4 renderer linked-sync deletion, does anything live still own "consent binds the reviewed revision and owner"? If not, should CalendarSync drop its consent half? (Q-CAL-1 / D18)
