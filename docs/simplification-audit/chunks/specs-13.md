# Chunk specs-13: `specs/quint/legacy/core` (second half)

All 13 files belong to the historical "legacy/core" family: Quint translations of 16 upstream TLA+ specs (upstream has since retired `packages/core/tla`) replayed against **upstream** `vendor/eliza/packages/core` code. None of them models alphaphone product code. The four harnesses run real upstream modules (esbuild bundle, PGlite) and do not slice source text, so T10 does not apply. Their problems are P6 (historical retention), T5 (they test upstream), T4 (each runs twice: once in `refinement/legacy/index.mjs` and once in a per-model test) and B5 (receipts, hashes, expected-mismatch files written and read back).

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| check-service-lifecycle-refinement.mjs | legacy refinement harness (runs upstream AgentRuntime) | DELETE | live twin `services/CoreServiceLifecycle.qnt` |
| check-single-flight-refinement.mjs | legacy refinement harness (runs upstream read memo) | DELETE | upstream `read-memo-runtime.test.ts` |
| check-task-scheduling-refinement.mjs | legacy refinement harness (upstream Semaphore/createSerialise) | DELETE | upstream utility |
| check-task-service-refinement.mjs | legacy refinement harness (upstream TaskService) | DELETE | first check 3 scenarios against live `TaskServiceLifecycle` campaign; port the missing ones to `refinement/services/task-service/index.mjs` |
| fact-write-dedupe-refinement.md | doc | DELETE; MERGE lines 79-100 | short note beside `services/FactWriteScope.qnt` |
| formal-source-inventory.mjs | harness support imported by live loaders | SIMPLIFY + MOVE | delete `authenticateFormalSources` and `materializeHistoricalFormalSources`; move `materializeHistoricalSources` to `refinement/native/` only if the MMS/SMS historical probe stays |
| interaction-metadata.json | orphan config data | DELETE | only input to the uncalled `check-configurations.mjs` |
| interactive-task-source-traces.md | doc | DELETE | |
| lifecycle-metadata.json | orphan config data | DELETE | same as above |
| migration-report.md | historical plan/inventory doc | DELETE | |
| plugin-connector-custody-baseline.md | doc | MERGE then DELETE | keep the "authenticated correction" paragraph in `refinement/services/core-runtime/connector-custody.md` |
| plugin-lifecycle-refinement.md | doc | DELETE | |
| service-lifecycle-refinement.md | doc | DELETE | carry the send-handler divergence note to the upstream follow-ups |

## Coverage lost by the DELETEs
- None of alphaphone's own code loses coverage. The behaviour lost belongs to upstream runtime code that ships in the APK:
  - Single-flight room-read memo (`roomReadMemo` / `roomMessagesMemo` with write fences): no alphaphone current-source model. Upstream covers it in `vendor/eliza/packages/core/test/read-memo-runtime.test.ts`.
  - `Semaphore` abort/FIFO and `createSerialise` ordering: no alphaphone twin. Upstream owns them.
  - TaskService: stale daemon snapshot recheck after a one-shot delete, failed reread that keeps the row, a wake revision that survives a stale completion. Check that the live `TaskServiceLifecycle` campaign covers these before deleting.
  - Two expected mismatches that document upstream behaviour: a published service survives a throwing `registerSendHandlers`; the failure threshold auto-pauses a repeat task. These go to the upstream follow-up list (D14).

## Shared helpers worth keeping
- `materializeHistoricalSources` is kept only if the MMS/SMS historical raw-pin witnesses stay (owner question). Otherwise nothing in this chunk is worth keeping.

## Cross-file actions
1. Remove the `materializeHistoricalFormalSources` import and call from `refinement/services/core-runtime/module.mjs:9,49` and `refinement/services/task-service/module.mjs:10,51`. It is a no-op once no legacy harness passes historical TLA paths.
2. Remove imports and rows for the four harnesses from `specs/quint/refinement/legacy/index.mjs` (lines 21-24 and 219-235). Delete `test/quint-core-service-lifecycle-design-refinement.test.mjs`, `test/quint-single-flight-refinement.test.mjs`, `test/quint-core-task-scheduling.test.mjs`, `test/quint-core-task-service-refinement.test.mjs` and `test/quint-tla-inventory.test.mjs`.
3. Delete models `legacy/CoreServiceLifecycleDesign.qnt`, `CoreSingleFlightMemo.qnt`, `CoreSemaphore.qnt`, `CoreSerialise.qnt`, `CoreTaskService.qnt` and their `legacy/manifest.json` entries. Lower the `legacy` floor in `test/quint-checker.test.mjs`.
4. `refinement/services/fact-write-scope.mjs:6,11` imports `legacy/core/check-fact-write-dedupe-refinement.mjs` (chunk specs-12). Move that fixture first.
5. Update the link in `refinement/services/core-runtime/connector-custody.md:3` when `plugin-connector-custody-baseline.md` goes.
6. `check-configurations.mjs`, `source-inventory.json`, `README.md` and `source-support.mjs` (specs-12) are retired along with these files. The `deferred`/`tick`/`bundleVendorCore` helpers in `source-support.mjs` move to `refinement/support.mjs` first.

## Owner questions
- Keep the MMS/SMS historical raw-pin counterexample witnesses, which are the only reason to keep `materializeHistoricalSources`?
- Should the upstream-only behaviours (read memo, Semaphore/Serialise, the send-handler publication divergence, the TaskService auto-pause divergence) become upstream follow-ups? The alternative is a current-source alphaphone model. They are upstream code but ship in the APK.
