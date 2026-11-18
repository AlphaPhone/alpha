# specs/quint/refinement/services/core-runtime/lifecycle.mjs
- Lines: 289 | Kind: Quint refinement harness (imports and runs the real `RuntimeServiceLifecycle` and `RuntimeRetirement` from `vendor/eliza` via `module.mjs`; host registries are explicit fixture maps) | Verdict: KEEP (upstream-only model; path-scope to the upstream pin)
- Covers: service start admission: class registration order, shared starts, failed/null implementations and retry, observer/send-handler failures, alias handler, initialization barrier, shutdown during init and late start teardown, stop-operation dedup — against `CoreServiceLifecycle.qnt`. Duplicates: `specs/quint/legacy/core/check-service-lifecycle-refinement.mjs` + `legacy/CoreServiceLifecycleDesign` (historical twin, ci-and-formal §2.9); `shutdown.mjs` covers stop through `AgentRuntime`. Callers/importers: `test/quint-core-service-lifecycle.test.mjs`, `refinement/services/index.mjs:34` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6 / §2.9 | Models upstream code only (`retirement.ts`, `service-lifecycle.ts` are not in `upstream-core-sources.ts`); no product source in its inputs. Runs on every PR yet can change only on a pin bump. | Keep passing (D11); run only when `upstream.lock.json`/`core-state-patch.ts`/this folder change. Owner/upstream follow-up (D14): offer upstream. | Low |
| 2 | 89-103, 169-176 | T10-lite | Drives private/underscored methods (`_runServiceStart`, `_ensureServiceStarted`, `_stopServiceInstance`) and reads `lifecycle.stopOperations`. Pins upstream internal names, not product text. | Accept (upstream internals); breakage surfaces on pin bump only. | Low |
| 3 | 6-7 | C3 | `action`, `flush` redeclared in all four core-runtime harnesses (and ~23 harnesses repo-wide). | Import from `specs/quint/refinement/support.mjs`. | None |
| 4 | 181 | B5 | Adds `test/quint-core-service-lifecycle.test.mjs` to the hashed input list (receipt ceremony). | Drop if receipts lose their consumer. | None |
| 5 | 286-289 | T9 | CLI entry (`process.argv[1] === …`) prints a receipt; no caller uses it (repo grep). | Delete. | None |

## Proposed end state
Same harness minus local helpers and CLI tail (~270 lines), in an "upstream pin" lane that runs on pin/patch changes only.
