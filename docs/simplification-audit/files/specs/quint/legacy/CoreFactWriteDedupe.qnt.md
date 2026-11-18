# specs/quint/legacy/CoreFactWriteDedupe.qnt
- Lines: 79 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream FactWriteDedupe: no duplicate fact, no lost evidence, writer exclusion under serialised writes; empty and prefilled configurations; 3 runs. Duplicates: partial: `services/FactWriteScope.qnt` covers `runtime/fact-write-dedupe.ts` scoping. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/FactWriteDedupe.tla), `legacy/core/check-fact-write-dedupe-refinement.mjs` (loads current runtime via `refinement/services/task-service/module.mjs` `loadTaskService`; line 11 also names `vendor/eliza/packages/core/tla/FactWriteDedupe` as a hashed design input), `test/quint-fact-write-dedupe-refinement.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | 11 | T10 | Harness hashes the upstream TLA file as a design input; only the executed module matters. | Drop the TLA hash pin when moving. | Low |
| 3 | — | T4 | Possible overlap with `FactWriteScope`. | Compare invariants; if `NoDuplicateFact`/`NoLostEvidence` are already in FactWriteScope, DELETE instead of moving. | Low |

## Proposed end state
Move to `specs/quint/services/CoreFactWriteDedupe.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). Merge into `FactWriteScope` if its invariants already cover NoDuplicateFact and NoLostEvidence.
