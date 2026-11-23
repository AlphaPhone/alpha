# specs/quint/refinement/services/core-runtime/connector-custody.mjs
- Lines: 40 | Kind: Quint refinement adapter (projects records from the legacy-tree driver into `CoreConnectorCustody` traces) | Verdict: KEEP; MERGE the driver `specs/quint/legacy/core/check-plugin-connector-custody.mjs` into this folder
- Covers: authenticated plugin connector ownership across start/dispose/withdraw/stop/replacement/rival in the real (product-patched) `AgentRuntime` with PGlite. Duplicates: `legacy/core/check-plugin-lifecycle-refinement.mjs` overlaps (specs-12: DELETE). Callers/importers: `test/quint-plugin-connector-custody.test.mjs`, `refinement/services/index.mjs:47` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | P6 | Live model depends on `../../../legacy/core/check-plugin-connector-custody.mjs`, which blocks retiring `specs/quint/legacy` (D11). | Move the driver to `refinement/services/core-runtime/connector-custody-driver.mjs` (or inline it here) — agreed with specs-12. | Low |
| 2 | 5-21 | — | Projection (`qset`/`qmap`, `sourceView.` prefix) is small and correct. | Keep. | None |
| 3 | 31-37 | C7 | Assumption prose duplicates `connector-custody.md`. | Keep one. | None |
| 4 | whole | CI | Models product-patched upstream code: it can change only when `upstream.lock.json`, `scripts/upstream-core-sources.ts` or `scripts/core-state-patch.ts` change. | Path-scope its lane to those inputs plus this folder. | Low |

## Proposed end state
This file plus the moved driver form one harness under `core-runtime/`; no import from `specs/quint/legacy`; runs only when
the upstream pin or the core patch changes.
