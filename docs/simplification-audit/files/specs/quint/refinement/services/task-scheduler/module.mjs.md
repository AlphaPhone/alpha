# specs/quint/refinement/services/task-scheduler/module.mjs
- Lines: 66 | Kind: harness loader (bundles upstream source, appends an observer) | Verdict: KEEP while `TaskSchedulerRuntime` stays (SIMPLIFY); DELETE with it
- Covers: `loadSchedulerSource()` bundles `vendor/eliza/packages/core/src/services/task-scheduler.ts` and the core-state-patched `task.ts` (`scripts/core-state-patch.ts`) into one module, appending an `observer` text block that shadows `setInterval`/`clearInterval` with a controlled clock and exports `observeScheduler()` (read of private module bindings). Duplicates: the byte-bound esbuild loader pattern in `task-service/module.mjs`. Callers/importers: `index.mjs` (DELETE) and `runtime.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-27, 45 | T10 | Appends code to upstream source text and relies on private binding names (`registry`, `dirtyAgents`, `timer`, `adapter`, `activeTick`, `schedulerGeneration`, `nextRegistrationId`, `busyServices`, `processTasks`) and on global `setInterval` being shadowable by a function declaration. An upstream rename breaks it. It is append-only (no slicing), so it is the least fragile form available for upstream code Alpha cannot change locally. | Keep while the model is here; if moved upstream, export an injectable clock and a `snapshot()` there. | Low |
| 2 | 32-37, 48-57 | B5 | Hash-before/hash-after assertions (`compiled` map vs `captureInputs`), "Unobserved compiled input", `coreStateBuildRecord` existence check — evidence ceremony. | Drop; keep only the `patch.beforeSha256` check that the core-state patch still applies (that guards correctness). | Low |
| 3 | 30 | – | Uses `coreStatePatch` (shared with `task-service/module.mjs`). | Share one `loadPatchedCore(entries, {append})` with `task-service/module.mjs`. | Low |

## Proposed end state
~35 lines, or one call into a shared patched-core bundler also used by `task-service/module.mjs`. Deleted if the owner
decides upstream-only scheduler models move upstream.
