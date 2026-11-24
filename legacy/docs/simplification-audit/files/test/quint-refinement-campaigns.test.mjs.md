# test/quint-refinement-campaigns.test.mjs
- Lines: 53 | Kind: tooling (tests `specs/quint/refinement/campaigns.mjs`) | Verdict: DELETE (with the family aggregates); else MERGE into `test/quint/tooling.test.mjs`
- Covers: `collectRefinementCampaigns` keeps earlier receipts and keeps running later campaigns after one throws or reports `passed:false`. Duplicates: none Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job. `campaigns.mjs` is imported only by `refinement/services/index.mjs` and `refinement/native/index.mjs`, i.e. only by the aggregates..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-53 | T5 | Tests the failure-retention loop that only the aggregate campaigns use. A per-model runner (one `test()` per model) gets this isolation from `node:test` itself. | Delete with `campaigns.mjs` when the aggregates go. If `quint:refinement` keeps family campaigns, move the three cases into `test/quint/tooling.test.mjs`. | Low |

## Proposed end state
- Gone with the aggregates; node:test isolates failures per model.
