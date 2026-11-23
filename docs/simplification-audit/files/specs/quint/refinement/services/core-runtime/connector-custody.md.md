# specs/quint/refinement/services/core-runtime/connector-custody.md
- Lines: 15 | Kind: model/harness prose | Verdict: KEEP, trim; fix the link to the legacy baseline
- Covers: scope of `CoreConnectorCustody` (product-patched `vendor/eliza/packages/core/src/plugin-lifecycle.ts`, listed in `scripts/upstream-core-sources.ts`). Duplicates: assumptions in `connector-custody.mjs:31-37`. Callers/importers: none (repo grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | P6 / A8 | Links `../../../legacy/core/plugin-connector-custody-baseline.md` ("keeps the original late-start discrepancy"); specs-12 proposes deleting that baseline and retiring `specs/quint/legacy`. | Drop the historical sentence and link. | None |
| 2 | 11-15 | T9 | Run command is fine. | Keep. | None |

## Proposed end state
~8 lines describing current scope, bounds and the run command; no reference into `specs/quint/legacy`.
