# specs/quint/refinement/services/core-runtime/module.mjs
- Lines: 93 | Kind: harness support (esbuild-bundles real `vendor/eliza` core classes, applies `core-state-patch` bytes, hashes every input, imports the bundle) | Verdict: KEEP; SIMPLIFY (drop legacy-history coupling and receipt ceremony; prune loaders)
- Covers: none by itself; the loader that lets core-runtime harnesses run real, product-patched upstream code. Callers/importers: `retirement.mjs`, `lifecycle.mjs` (`loadCoreRuntime`), `shutdown.mjs` (`loadAgentRuntime`), `turns.mjs` (`loadTurnControllers`), `../embedding-store-identity.mjs` (`loadRuntimeEmbeddings`), legacy `check-single-flight-refinement.mjs`, `check-runtime-lifecycle-refinement.mjs`, `check-plugin-lifecycle-refinement.mjs` (`loadAgentRuntime`), `check-provider-execution-refinement.mjs` (`loadProviderStateComposer`), `test/core-runtime-transform.test.mjs`. Survives: yes (five live importers).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 49 | P6 | `materializeHistoricalFormalSources(root, extraSources)` from `specs/quint/legacy/core/formal-source-inventory.mjs`: live callers pass only harness/test paths, so no historical blob is ever materialised; the call only adds the legacy inventory and helper to the hash list and keeps a live import into `specs/quint/legacy` (blocks D11 retirement; specs-12 item 7). | Delete the call and import; use `extraSources` directly. | Low |
| 2 | 32-35, 46-54 | B5 | Hash-before/after and "Unobserved bundled input" / "changed during compilation" assertions plus `compiledHashes`/`coreState` receipt fields. Only consumer of `compiledHashes` is `test/core-runtime-transform.test.mjs` (a test of this loader, T5). | Keep the patch application (it is what makes the code product-real); drop the evidence hashing, or keep only `coreState.transforms` if a model needs it. Delete or fold `core-runtime-transform.test.mjs`. | Low |
| 3 | 83-85 | A7 | `loadProviderStateComposer` is used only by legacy `check-provider-execution-refinement.mjs` (specs-12: DELETE). | Delete with that harness. | None |
| 4 | 31 | C3 | Local SHA-256 → hex. | Use the shared `scripts/lib` hash helper. | None |
| 5 | 37-43 | — | Loader-extension map and bundle-to-data-URL import duplicate `identity-comms-traces.mjs:218-232` (`sourceModule`). | One `bundleAndImport(entry, plugins)` in refinement support. | Low |

## Proposed end state
~45 lines: one `loadCoreSource(entry)` that bundles with the core-state patch applied and imports it, four named loaders
(retirement/lifecycle, agent runtime, turn controllers, embeddings), no legacy import, no hash receipts.
