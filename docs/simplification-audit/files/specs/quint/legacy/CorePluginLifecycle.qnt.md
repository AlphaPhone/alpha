# specs/quint/legacy/CorePluginLifecycle.qnt
- Lines: 276 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream PluginLifecycle: exclusive teardown, stop at most once, no orphan instance/connector, register honest, eager start retires during unload; 3 configurations, 4 runs. Duplicates: none; `scripts/core-state-patch.ts` patches `packages/core/src/plugin-lifecycle.ts` (PLUGIN_CONNECTOR_TARGET), so this models code the product build changes. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/PluginLifecycle.tla), `legacy/core/check-plugin-lifecycle-refinement.mjs` (imports `loadAgentRuntime` and `loadTaskService`, executes the current runtime) and `legacy/core/check-plugin-connector-custody.mjs`, `test/quint-core-plugin-lifecycle-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Covers a product-owned patch of upstream (`core-state-patch.ts`). Strong keep. | Keep; relocate; path filter must include `scripts/core-state-patch.ts`. | Medium if deleted |
| 3 | — | T10 | Harness reads files with `readFileSync` for hashing (line 3). | Drop hash receipts (B5) when moving. | Low |

## Proposed end state
Move to `specs/quint/services/CorePluginLifecycle.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
