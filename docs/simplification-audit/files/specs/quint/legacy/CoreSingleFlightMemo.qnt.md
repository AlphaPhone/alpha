# specs/quint/legacy/CoreSingleFlightMemo.qnt
- Lines: 122 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream SingleFlightMemo: no stale value after invalidate, rejected not cached, readers share one fetch; liveness and safety configurations; 3 runs. Duplicates: none. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/SingleFlightMemo.tla), `legacy/core/check-single-flight-refinement.mjs` (imports `loadAgentRuntime`; current code), `test/quint-single-flight-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Real module execution. | Relocate. | Low |

## Proposed end state
Move to `specs/quint/services/CoreSingleFlightMemo.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
