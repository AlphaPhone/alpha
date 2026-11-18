# specs/quint/refinement/campaigns.mjs
- Lines: 24 | Kind: formal harness library (campaign aggregator) | Verdict: KEEP (becomes the single aggregator once `legacy/index.mjs` is deleted)
- Covers: runs a list of `[campaign, check]` adapters, collects receipts/obligations and records failures per campaign. Duplicates: `collectLegacyCampaigns` in `legacy/index.mjs:244-258` (same job, different result normalisation). Callers: `native/index.mjs`, `services/index.mjs`; test `test/quint-refinement-campaigns.test.mjs` (tooling test of this helper, T5).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | Twin of `legacy/index.mjs` `collectLegacyCampaigns`. | Deleting the legacy family (see `legacy/index.mjs.md`) removes the twin; `application/index.mjs` should use this too if it has its own loop. | Low |
| 2 | 3-10 | B3 | `record` re-validates the shape of results returned by our own in-repo adapters (`typeof receipt?.passed !== 'boolean'`) and accepts four result shapes (`{receipts}`, array, `{receipt}`, bare receipt). | Fix one adapter return shape (`{receipts, obligations}`), drop the normalisation and the validation. | Low; touches every adapter's return line. |
| 3 | — | T5 | `test/quint-refinement-campaigns.test.mjs` tests this 24-line helper with stubs. | Delete that test; the family runs exercise it. | Low |

## Proposed end state
About 12 lines: loop over campaigns, `await check()`, push `{receipts, obligations}`, record failing receipts and thrown errors.
One result shape for every adapter. The only aggregator in the refinement tree.
