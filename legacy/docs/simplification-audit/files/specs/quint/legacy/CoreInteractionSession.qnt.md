# specs/quint/legacy/CoreInteractionSession.qnt
- Lines: 172 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream InteractionSession leases: at-most-once commit, expired/mismatched claims cannot commit, reconciled crash replayable, resumed lease fences old owner; 2 configurations, 5 runs. Duplicates: none. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/InteractionSession.tla), `legacy/core/check-interaction-session-refinement.mjs` (bundles current upstream via `bundleVendorCore`, real `node:sqlite` database), `test/quint-core-interaction-session.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Real integration-style refinement (real module + real SQLite). Exactly the kind of harness the owner wants. | Keep; relocate. | Low |

## Proposed end state
Move to `specs/quint/services/CoreInteractionSession.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
