# Chunk specs-48: services refinement harnesses (trigger cursor, web reading, workflow renderer/engine/scheduler)

15 files, 1,912 lines, all present. Every model these harnesses replay is live in `specs/quint/services/manifest.json`, and its sources exist. No file covers a feature that DECISIONS deletes.

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| `services/trigger-cursor-replay.mjs` | 168 | Quint replay, import-based (`sourceModule` + 6 port stubs) | KEEP, SIMPLIFY | Drop unused params, delete Case3 unit test, shared walk helper, run once |
| `services/web-reading-review.mjs` | 103 | Quint replay, import-based (`loadBundled` + jsdom) | KEEP, SIMPLIFY | Stub keys break silently under `@eliza/*` alias; drop upstream-rule asserts |
| `services/workflow-adapter-fixture.mjs` | 53 | Support fixture, **transplant** of `prototype/workflow-adapter.ts` | PORT | `sourceModule` the adapter with port stubs; drop `rewrite`; stop using `scripts/workflow-renderer-fixture.ts` |
| `services/workflow-engine/README.md` | 43 | Docs | SIMPLIFY | About 12 lines, no duplicated obligations |
| `services/workflow-engine/index.mjs` | 347 | Refinement, integration (upstream engine on PGlite) | KEEP (upstream lane), SIMPLIFY | Drop hash ceremony; owner: move upstream? |
| `services/workflow-engine/ports.mjs` | 198 | Support, esbuild bundle + PGlite fixture | KEEP, SIMPLIFY | One build, no hashing; share the bundling helper |
| `services/workflow-execution-audit-admission.mjs` | 141 | Refinement (audit twin), via transplant fixture | MERGE | into `services/workflow.mjs` + `WorkflowExecution.qnt`; delete 2 legacy-agent schedules if the branch is dead |
| `services/workflow-lifecycle-change-replay.mjs` | 161 | Quint replay via transplant fixture | KEEP, PORT (via fixture), SIMPLIFY | Static imports, no `tsx` re-exec, no fixed sleeps |
| `services/workflow-local-source.mjs` | 173 | Refinement, **transplant** (slices `workflow-authoring.ts` and `workflow-adapter.ts`) | PORT | Split into `workflow-authoring-replay.mjs` + `workflow-notice-taps-replay.mjs`, both import-based |
| `services/workflow-scheduler/README.md` | 31 | Docs | SIMPLIFY | Keep the "known current behaviour" notes |
| `services/workflow-scheduler/clock.mjs` | 45 | Support, controlled clock | KEEP | Drop unused `allTimers`; candidate shared `support/clock.mjs` |
| `services/workflow-scheduler/fixture.mjs` | 29 | Support | KEEP | Fold `settleWith` into `ports.mjs` `settle` |
| `services/workflow-scheduler/index.mjs` | 165 | Refinement, integration (upstream) | KEEP (upstream lane), SIMPLIFY | Drop hash ceremony |
| `services/workflow-scheduler/registration.mjs` | 209 | Refinement, integration (upstream) | KEEP (upstream lane), SIMPLIFY | Drop hash ceremony |
| `services/workflow-scheduler/tasks.mjs` | 46 | Support, task-store port | KEEP, SIMPLIFY | Delete the dead `read` gate |

Counts: KEEP 11 (most with SIMPLIFY), PORT 2 (`workflow-adapter-fixture`, `workflow-local-source`), MERGE 1 (`workflow-execution-audit-admission`), DELETE 0 (whole files). The lifecycle replay is KEEP but changes through the fixture port.

## Behaviours that would lose coverage
- None from whole-file deletes, because there are none.
- If the `workflow-execution-audit-admission` merge happens without carrying its traces, the following lose model-checked coverage: the exact request is journaled before dispatch, an admitted lost reply reconciles without redispatch, and a changed version releases only the old admission. Playwright `workflow-outcome-unknown`/`workflow-interruption-recovery` cover only the visible part. Carry the four non-legacy schedules.
- Deleting `trigger-cursor-replay` Case3 loses one explicit check: an edited trigger of unsupported kind drops its cursor. This is low risk because the model's `movedPlaceRestartsCursorTest` covers a definition change restarting the cursor.
- The `workflow-local-source` port may lose observation of closure-private fields (`unreceipted`, `tapRequested`, `tapDeferred`). If render output does not expose them, the projection narrows or the product exposes a read-only state accessor (owner question).

## Shared helpers worth keeping
- `workflow-engine/ports.mjs` `createEngineFixture()`: real upstream engine on PGlite with transaction-fault injection, used by 3 harnesses.
- `workflow-scheduler/clock.mjs`: the only clean controlled clock. Promote it to `specs/quint/refinement/support/clock.mjs`.
- `inbox-workflows-model-traces.mjs` `sourceModule` / `application/browser-model-traces.mjs` `loadBundled` / `ports.mjs` `bundleEngine`: three versions of "bundle a real module with port stubs and import it". Consolidate into one `support/bundle.mjs` (stub matching on resolved path, `fresh` instances, optional alias map). This is the tool every T10 port needs.
- `support.mjs` (`action`, `deferred`, `until`): `workflow-local-source.mjs` re-implements all three locally.

## Cross-file actions
1. **Port the workflow-adapter transplant first.** `workflow-adapter-fixture.mjs` is shared by `approval-decision-replay.mjs` (other chunk), `workflow-execution-audit-admission.mjs` and `workflow-lifecycle-change-replay.mjs`. After it, `scripts/workflow-renderer-fixture.ts` loses its last specs importer. `test/fixtures/workflow-execution-fixture.mjs`, `test/workflow-adapter-recovery.test.mjs`, `test/workflow-lifecycle-resend.test.mjs`, `test/workflow-management-capability.test.mjs` and `scripts/test-workflow-*-ui-flow.ts` are T2/T9 duplicates of these replays and can then be deleted.
2. The `workflow-adapter.ts` / `workflow-authoring.ts` text pins (`^import .*;\n` per line, `export function` first, the `return {get active()...}` seam, the `let tapBusy=false` … `const dismissTap=` slice and the 19 hand-declared closure variables) block Prettier and the D1 adapter split. Log them in `cross-file-actions.md` §2 against those product files.
3. Remove the evidence ceremony from all workflow harnesses: `captureInputs`, `serviceInputs`, `captureReplayClosure`, `engineDriverSources`/`prepareEngineModule`, temp-dir generated-source hashing, `rewrite`/`mutant` canaries and exact trace/checkpoint counts in `test/quint-workflow-*.test.mjs`. Delete the first test in `test/quint-workflow-engine-refinement.test.mjs` (it tests the ceremony).
4. T4: `TriggerCursor`, `WebReadingReview` and `WorkflowLifecycleChange` run from their owning test **and** `forward-replays.mjs`. `WorkflowAuthoring`/`NoticeTaps`, `WorkflowExecutionAuditAdmission` and the three upstream engine models run from their owning test **and** `services/index.mjs`. Keep one entry per model.
5. CI lanes: `WorkflowEngineAdmission`, `WorkflowWakeups` and `WorkflowScheduleTasks` (sources only under `vendor/eliza`) should run only when `upstream.lock.json`, `.eliza` staging, their `.qnt` or `refinement/services/workflow-{engine,scheduler}/**` change.
6. Delete `test/trigger-cursor-isolation.test.mjs` (a T5 test of this harness's global restore; it also boots the task-service PGlite).
7. D13 (`@eliza/*` alias): `web-reading-review.mjs` stub key and `ports.mjs` hand-mapped `@elizaos/contracts/*` paths must change in the same commit, or the stub silently stops applying.
8. Remove the `browserWorkflowDraftStore` reliance from `workflow-local-source.mjs`: it is imported by `workflow-authoring.ts` but not provided, and works only because that branch is never reached. The import-based port fixes this.

## Owner questions
- Q1. Can any supported agent still lack `manualSubmissionProtocol` (the "legacy" workflow agent)? If not, the `unverifiable`/`reviewClear` "Clear request" branch in `prototype/workflow-adapter.ts` and the two legacy schedules in `workflow-execution-audit-admission.mjs` should be deleted (A1/D5).
- Q2. Should the three upstream-only workflow-engine models (`WorkflowEngineAdmission`, `WorkflowWakeups`, `WorkflowScheduleTasks`) and their PGlite harnesses move into `vendor/eliza` upstream (AGENTS.md), or stay here as pin-bump release evidence in an upstream-only CI lane?
- Q3. For the `WorkflowAuthoring`/`WorkflowNoticeTaps` port: may the product expose a read-only state accessor (on the authoring object and an extracted `prototype/workflow-taps.ts` tap handler) so the replay need not read closure variables, or should the models' projections narrow to rendered output?
- Q4. Merge `WorkflowExecutionAuditAdmission.qnt` into `WorkflowExecution.qnt` (research §2.11 audit twins). Confirm the merged model is acceptable as the single workflow execution model.
