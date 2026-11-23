# specs/quint/refinement/services/task-service/module.mjs
- Lines: 59 | Kind: harness loader (bundles patched upstream TaskService + plugin-sql test helpers with PGlite) | Verdict: KEEP (SIMPLIFY; remove the legacy import)
- Covers: `loadTaskService()` returns the real patched `TaskService` and `createIsolatedTestDatabase` (from `vendor/eliza/plugins/plugin-sql/src/__tests__/test-helpers.ts`) bundled together. Duplicates: patched-core bundling in `task-scheduler/module.mjs`. Callers/importers: `task-service/index.mjs`, `services/fact-write-scope.mjs`, `services/embedding-store-pglite.mjs`, `test/trigger-cursor-isolation.test.mjs`, `test/task-service-sql-concurrency.test.mjs` (DELETE), and six legacy checks `specs/quint/legacy/core/check-{task-service,fact-write-dedupe,runtime-lifecycle,service-lifecycle,plugin-lifecycle}-refinement.mjs`, `check-plugin-connector-custody.mjs` (DELETE with legacy). Survives: yes, three live importers remain.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 52-53 | P6/B5 | Imports `materializeHistoricalFormalSources` from `specs/quint/legacy/core/formal-source-inventory.mjs` and adds historical sources (materialised under `.eliza/quint-historical/<rev>`, fetched by `quint:prepare-history`) to the hash list of a **live** model. This makes every live caller depend on `specs/quint/legacy` and the history fetch. | Delete the import and `history.sources`; the live harness never executes those files. Blocker for retiring `legacy` not listed in research §3. | Low |
| 2 | 20-28, 52-56 | B5 | Walks the whole PGlite package directory to hash every resource; hash-before/after assertions. | Delete `bindResources` and the hash checks; keep the `patch.beforeSha256` check. | Low |
| 3 | 49 | B4 | Asserts the bundle does not contain `'file-type'`. | Keep only if `file-type` reaching the bundle has broken a run; otherwise delete. | Low |
| 4 | 31 | – | Imports an upstream test helper path (`__tests__/test-helpers.ts`); a vendor refactor moves it. | Accept (real SQL is worth it); note in the vendor-bump checklist. | Low |
| 5 | 30-48 | C5 | Same esbuild "patched core" plugin as `task-scheduler/module.mjs`. | One shared `loadPatchedCore()`. | Low |

## Proposed end state
~30 lines: bundle `TaskService` + `createIsolatedTestDatabase` through a shared patched-core loader, return the module.
No historical-source materialisation, no package-directory hashing.
