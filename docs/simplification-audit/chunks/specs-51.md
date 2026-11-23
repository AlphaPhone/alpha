# Chunk specs-51: services Quint models NamedEmbeddingProvenance … SystemPickerVisibility, and services README

23 files: 22 live Quint models registered in `specs/quint/services/manifest.json` (all sources and all symbol pins
resolve today; every `run` is listed in the manifest) and the family README. Reports are in
`docs/simplification-audit/files/specs/quint/services/`. No model here covers a feature deleted by DECISIONS
(Wallet, backup/import/export, client Calendar sync, legacy readers). Two models lose their product code if the
script reports' deletions happen (PreparedSourceStamp, ReviewedWorkflowLauncher).

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| NamedEmbeddingProvenance.qnt | model of upstream plugin-sql (PGlite refinement) | KEEP | run only on upstream pin change; upstream follow-up |
| NativeCredentialMutation.qnt | model, Android credential store (3 Java harnesses) | KEEP, SIMPLIFY | delete dead `legacyBlocked`/`blockLegacy`; move to native family; one campaign; check retained over-cap branch vs D1 |
| NativeGoogleAccessFile.qnt | model, Google access record (Java + esbuild) | KEEP | — |
| NativeGoogleHostArtifact.qnt | model of build script | KEEP, SIMPLIFY | shrink fault modes with the script; path-gate (56 sources incl. package.json) |
| NoticesAndCaches.qnt | model, two machines | MERGE | cache half → `ServiceReadCache.qnt` (duplicate); notice half → `NoticeOwnerCoordinator.qnt` (upstream) |
| PdfWorker.qnt | model, `IsolatedPdfService` (Java) | KEEP | optional move to native family |
| PersonalAssistantScheduledTaskCustody.qnt | model of upstream scheduling | KEEP | drop "b181 pin" header; gate on upstream; consider merge with LifeOpsScheduledTaskRoute |
| PhoneSession.qnt | model, Phone dialer-handoff fallback (live) | KEEP | file pins instead of closure-name pins |
| PilotApkUpdate.qnt | model of operator tool | KEEP | path-gate; harness follows `updateUnit` split |
| PlanAdmissionGrace.qnt | model, resident plan record | KEEP model, PORT harness | extract `runtime/connection/plan-admission.ts` from `connection-ui.tsx`; harness imports it instead of slicing 6 sections |
| PreparedSourceStamp.qnt | model of `--requalify-from` path | DELETE | with `prepare-local-agent.ts` requalify code; replace dirty/wrong-commit refusal with one fixture integration test |
| PreparedWorkflowWorker.qnt | model of build library (imports module) | KEEP | drop mid-build drift branch with script; dedupe vs `test/prepared-workflow-worker.test.mjs` |
| ProtectedAppUpdatePromotion.qnt | model of release workflows + scripts | KEEP model, PORT harness | stop parsing workflow YAML step order; legacy floor (`app-stable`) pending owner |
| ResidentJavaSourceStage.qnt | model of Gradle stage script | KEEP | path-gate; shrink restore protocol with script |
| ResidentMapsRelayOffer.qnt | model, resident Maps relay | KEEP | drop `connection-ui.tsx` trigger; owner question on documented gap |
| ReviewedWorkflowLauncher.qnt | model of dev launcher | DELETE | with `start-reviewed-workflow-agent.ts` (scripts-13 merge); else one launcher model for the merged launcher |
| ScanDocument.qnt | model, scan drafts/export (Chromium harness) | KEEP, SIMPLIFY | remove picker/hide half (owned by SystemPickerVisibility); fold `scan-source-conformance.mjs` into `scan.mjs` |
| ScanReviewDialogs.qnt | model, four scan dialogs | KEEP model, PORT harness | stop text-injecting inspect hooks and mutant guard; observe DOM |
| ServiceAuthorization.qnt | model, entitlement + route admission | KEEP | already import-based |
| ServiceReadCache.qnt | model, offline read cache | KEEP | sole cache model after NoticesAndCaches merge |
| SmsSend.qnt | model, renderer SMS send | KEEP | file pins; follow adapter rewrite |
| SystemPickerVisibility.qnt | model, picker visibility | KEEP | remove unused `rewrite` hook |
| README.md | family narrative + dated records | REWRITE | ~30 lines pointing at manifest; drop stale counts, validation records, wrong scan claims |

Totals: 15 KEEP (3 with harness PORT, 4 SIMPLIFY), 1 MERGE, 2 DELETE, 1 REWRITE (README), 0 PORT-only.

## Behaviours that would lose all coverage if the DELETEs happen
- `PreparedSourceStamp` delete: the refusal of `prepare-local-agent.ts` on a dirty tracked file and on a moved base
  commit (`verifySource` in `local-agent-source.ts`) has no other check; CI only ever prepares clean trees. Needs one
  fixture-based integration test (reuse `test/fixtures/prepare-local-agent.mjs`). The requalify custody itself goes
  with the code, so nothing else is lost.
- `ReviewedWorkflowLauncher` delete: launcher receipt/child-custody (SIGTERM→SIGKILL after a receipt failure,
  pinned-revision preload) is dev-only. If the merged `start-local-remote.ts` keeps that protocol, one launcher model
  (`CombinedAgentLauncher`) should be retargeted at it; otherwise nothing product-relevant is lost.
- `NoticesAndCaches` merge loses nothing: `ServiceReadCache` invariants are a superset of the cache half.

## Shared helpers worth keeping
- `refinement/services/forward-replays.mjs` + `observed-replay.mjs` (PhoneSession, ResidentMapsRelayOffer,
  ServiceReadCache, SmsSend, SystemPickerVisibility): import-based replay; good template for the PORTs.
- `sourceModule` (identity-comms-traces / inbox-workflows-model-traces) and `loadProductModule`
  (`application/notes-files-media-itf.mjs`): three near-identical esbuild "import product module with module stubs"
  loaders. Keep one (C5), without the text `rewrite` hook.
- `test/fixtures/prepare-local-agent.mjs`, `resident-java-source-stage.mjs`, `pilot-update.mjs`,
  `observed-sms-adapter.mjs`, `lifeops-scheduled-task-route.mjs`: harness fixtures that run real scripts/modules; keep
  (minus the requalify path).

## Cross-file actions
1. One manifest-driven runner per family; delete the per-model `test/quint-*.test.mjs` wrappers for these models
   (named in each report) so each campaign runs once (T4).
2. Path-gate formal CI: upstream-only models (NamedEmbeddingProvenance, PersonalAssistantScheduledTaskCustody, notice
   half of NoticesAndCaches) run on `upstream.lock.json`; build/release-tool models (NativeGoogleHostArtifact,
   PilotApkUpdate, PreparedWorkflowWorker, ProtectedAppUpdatePromotion, ResidentJavaSourceStage) run only on their
   own scripts. Trim manifest `sources` that are not loaded (`package.json`, `tsconfig.json`, `connection-ui.tsx` for
   the relay model).
3. Replace symbol-name pins with file pins (PhoneSession 12, ScanReviewDialogs 14, SystemPickerVisibility 12,
   ServiceReadCache 11, SmsSend 10, PlanAdmissionGrace 10, ResidentMapsRelayOffer 6, NativeCredentialMutation 5,
   ServiceAuthorization 2) before the formatter and the adapter rewrite.
4. PlanAdmissionGrace PORT blocks the `connection-ui.tsx` split and Prettier: extract `plan-admission.ts` first.
5. ScanReviewDialogs PORT blocks Prettier (literal `'  return dispose;'` and `'  void(async()=>{for'` needles).
6. ProtectedAppUpdatePromotion harness must change in the same PR as the release-workflow merge
   (`verify-cloud-signing-input.yml` → `release-cloud-app-signing.yml`).
7. Deleting PreparedSourceStamp/ReviewedWorkflowLauncher and merging NoticesAndCaches lowers the services floor in
   `test/quint-checker.test.mjs` (`services: 51`); change it in the same commit.
8. Move Android-native models (NativeCredentialMutation, PdfWorker) to the native family when the family files are
   touched; consolidate NativeCredentialMutation's three harnesses.

## Owner questions
- Should formal models of build, release and operator tooling (NativeGoogleHostArtifact, PilotApkUpdate,
  PreparedWorkflowWorker, ProtectedAppUpdatePromotion, ResidentJavaSourceStage) stay Quint models (D11 keeps them
  today) or become plain integration tests of the scripts?
- Is `prepare-local-agent.ts --requalify-from/--preserve-stamp` a manual recovery tool you still use? If not,
  PreparedSourceStamp is deleted with it.
- Does any installed build still poll the legacy `app-stable` update tag? The legacy floor in
  ProtectedAppUpdatePromotion (and in `deliver-app-update.ts`) goes when it does not.
- ResidentMapsRelayOffer documents that when two resident turns overlap and the newer ends first, the older turn
  stays connected with the relay flag cleared (`ConnectedTurnShowsFlagDesired` fails). Intended, or a bug to fix?
- Can an Android credential slot hold an over-cap value on a fresh install (NativeCredentialMutation
  `retainedShrinkTest`)? If not, that branch is legacy and goes with D1.
