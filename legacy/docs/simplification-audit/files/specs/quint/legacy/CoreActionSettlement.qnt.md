# specs/quint/legacy/CoreActionSettlement.qnt
- Lines: 122 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream ActionSettlement: ordered late callback delivery, buffering before settlement, denial and reply/handler failure drop callbacks; template + two configurations (late, outcomes); 5 runs. Duplicates: none (services `AutomationRequestSettlement` models a different, app-side settlement). Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/ActionSettlement.tla), `legacy/core/check-action-settlement-refinement.mjs` (bundles current `packages/core/src/runtime/action-handler-settlement.ts` and `security/processing-policy.ts` via `bundleVendorCore`; imports real modules, no text slicing), `legacy/core/interaction-metadata.json` (only read by unused `check-configurations.mjs`); test via aggregate, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Harness executes the *current* pinned upstream module the product's agent ships, so this is live conformance evidence, not history. | Keep the model; relocate. | Low |
| 3 | — | T4 | No per-model `test/quint-*.test.mjs`; runs only through the legacy aggregate. | Give it one entry in the services aggregate. | Low |

## Proposed end state
Move to `specs/quint/services/CoreActionSettlement.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
