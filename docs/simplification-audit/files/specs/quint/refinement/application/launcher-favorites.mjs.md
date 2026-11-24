# specs/quint/refinement/application/launcher-favorites.mjs
- Lines: 201 | Kind: Quint refinement harness (source campaign, `LauncherFavorites`, live) | Verdict: KEEP (owner question: move upstream, P6/D14)
- Covers: shared launcher favourites — missing vs explicit-empty vs malformed records, v1/v2 schema, legacy view-ID alias (`alpha:workflows`→`alpha:automations`), rollback copy, storage refusal, external writes during a held load, visible reorder around hidden/uninstalled keys (generated `.eliza/client-features/plugins/plugin-native-system/src/client/launcher.ts`, `upstream renderer: mobile-shell/mobile-launcher.ts`; Alpha supplies only `apps/app/src/product/alpha-product.ts`). Duplicates: none. Callers/importers: `test/quint-launcher-favorites.test.mjs`; aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-43 | T10 | Injects `__port.inspect` at `'  let generation = 0;'` in the generated upstream file to read five private flags (`rawSaved, builtins, defaultsPending, migrationPending, legacyHomeDefaultsPending`). Targets generated code, so an upstream bump (not an Alpha edit) breaks it. | Ask upstream to expose a read-only snapshot; until then keep the marker. | M |
| 2 | 154-157 | A1? | The legacy-alias and v1 cases test upstream migration code. D1 deletes *Alpha* legacy readers only; this is upstream behaviour (D14) and Alpha's `alpha-product.ts` still declares the alias. | Keep; if the owner drops the alias from `alpha-product.ts`, drop the alias cases with it. | L |
| 3 | 53 | T2 | `new Function` eval of a CJS bundle. | `import()` the bundle (`bundledSource`). | L |
| 4 | all | P6 | ~95 % of the modelled code is upstream; the model belongs to upstream CI. | Owner question (research Q4). | — |

## Proposed end state
Unchanged cases; imported bundle; marker kept until upstream exposes state; candidate to move upstream with LauncherObserver/LauncherOwnership.
