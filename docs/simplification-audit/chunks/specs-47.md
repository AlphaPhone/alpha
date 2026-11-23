# Chunk specs-47: services refinement harnesses (service-read-cache … task-service)

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `specs/quint/refinement/services/service-read-cache-replay.mjs` | forward replay, real module | KEEP (SIMPLIFY) | drop Case3 (dup of `test/service-read-cache.test.mjs:74`), unused `canaries`, local SHA slot naming, receipt counters |
| `specs/quint/refinement/services/sign-in-coordinator.md` | doc | KEEP (REWRITE) | says 17 schedules, harness runs 21; keep mapping table only |
| `specs/quint/refinement/services/sign-in-coordinator.mjs` | refinement, real Java on JVM | KEEP (SIMPLIFY) | drop CLI block, receipt inputs; test should call it in-process |
| `specs/quint/refinement/services/sign-in-platform.mjs` | Java stub writer | KEEP (SIMPLIFY) | delete dead legacy-recovery stub members (lines 82-89); MERGE base stubs into shared `refinement/native/android-stubs.mjs` |
| `specs/quint/refinement/services/sms-send-replay.mjs` | forward replay, real adapter + text-injected probe | KEEP + PORT | replace `__smsDraftProbe` text injection (`observed-sms-adapter.mjs`, marker `' const sync=()=>{'`) with port observation; delete Case2 |
| `specs/quint/refinement/services/source-inputs.mjs` | provenance hashing | DELETE (B5) | after `check-traces` drops receipt inputs; 8 importers pass plain lists |
| `specs/quint/refinement/services/support.mjs` | shared helpers | KEEP, MOVE to `specs/quint/refinement/support.mjs` | consolidation target for 5 `sourceModule` twins and `deferred`/`until` twins; delete unused `rootPath`, `beforeImport` double build |
| `specs/quint/refinement/services/system-picker-visibility.mjs` | forward replay, real modules | KEEP (SIMPLIFY) | drop `rewrite` text-mutation hook (T10) |
| `specs/quint/refinement/services/task-scheduler/README.md` | doc | REWRITE | runtime campaign only; stale SDK pin `99b49439` vs lock `8876e369` |
| `specs/quint/refinement/services/task-scheduler/fixture.mjs` | fixture for legacy campaign | DELETE | move `until` to shared support first |
| `specs/quint/refinement/services/task-scheduler/index.mjs` | refinement over `specs/quint/legacy/CoreTaskScheduler.qnt` | DELETE (P6) | superseded by `runtime.mjs`; consider carrying 2 steps |
| `specs/quint/refinement/services/task-scheduler/module.mjs` | loader, appends observer to upstream source | KEEP while TaskSchedulerRuntime stays | share patched-core loader with `task-service/module.mjs`; drop hash ceremony |
| `specs/quint/refinement/services/task-scheduler/runtime-fixture.mjs` | fixture | KEEP while model stays | import shared `until`/`deferred` |
| `specs/quint/refinement/services/task-scheduler/runtime.mjs` | refinement, real upstream source | KEEP (owner question) | upstream-only; `startTaskScheduler` has no caller in Alpha or elsewhere in vendor |
| `specs/quint/refinement/services/task-service/index.mjs` | refinement, real TaskService + PGlite | KEEP (SIMPLIFY) | format, shared helpers, drop receipt prose |
| `specs/quint/refinement/services/task-service/module.mjs` | loader | KEEP (SIMPLIFY) | remove `materializeHistoricalFormalSources` legacy import (live harness depends on `specs/quint/legacy`) and PGlite directory hashing |

## Coverage at risk if the DELETEs happen
- `task-scheduler/index.mjs` + `fixture.mjs`: two steps not obviously in `runtime.mjs`: a repeated `startTaskScheduler` with the
  same adapter keeps generation and timer, and a stopped TaskService instance cannot re-register. These cover upstream code
  Alpha never enables, so the loss is small; add them to `runtime.mjs` if the model's actions allow.
- `source-inputs.mjs`: none (provenance only; `prepare-client-features --check` still runs in prepare).
- Case deletions (`service-read-cache` Case3, `sms-send` Case2): covered by `test/service-read-cache.test.mjs` (or its
  integration successor) and by SmsSend model scenarios replayed in Case1.

## Shared helpers worth keeping
- `services/support.mjs` → `specs/quint/refinement/support.mjs`: `deferred`, `until`, `action`, `casStore`, one `loadModule` bundler.
- One shared patched-core bundler for `task-scheduler/module.mjs` and `task-service/module.mjs`.
- One `refinement/native/android-stubs.mjs` for the ~11 `*-platform.mjs` Java stub writers.

## Cross-file actions
1. `test/fixtures/observed-sms-adapter.mjs` text-injects a probe into `apps/app/src/prototype/sms-adapter.ts` at
   `' const sync=()=>{'`; it must be ported before the Prettier pass (D9) or the SmsSend replay breaks (also used by `mms-compose-replay.mjs`).
2. `test/quint-system-picker-visibility.test.mjs` canaries text-replace `'finally{systemPickers--;}'` (`scan-pdf.ts:32`) and
   `'current?.abort();const controller'` (`file-picker.ts`); delete them before Prettier.
3. `task-service/module.mjs:10` imports `specs/quint/legacy/core/formal-source-inventory.mjs`: an extra blocker for retiring
   `specs/quint/legacy` that research §3 does not list.
4. `sign-in-platform.mjs:82-89` stubs deleted Android legacy recovery; remove with the A5 Android legacy deletion.
5. Every harness here runs twice per verify (per-model test + services aggregate `services/index.mjs` / `forward-replays.mjs`);
   keep one manifest-driven runner.
6. `services/calendar-linked.mjs` (D4 delete) is one of the 8 importers of `source-inputs.mjs` and of `support.mjs`.

## Owner questions
- TaskSchedulerRuntime models upstream `task-scheduler.ts`, which no Alpha or vendor code ever starts. Move it upstream or delete it (with `runtime.mjs`, `runtime-fixture.mjs`, `module.mjs`, `README.md`)?
- TaskServiceLifecycle models upstream `task.ts`, which does run in the on-device agent. Keep it here or move it upstream with the other upstream-only models?
