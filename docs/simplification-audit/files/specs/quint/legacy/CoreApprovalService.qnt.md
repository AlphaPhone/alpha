# specs/quint/legacy/CoreApprovalService.qnt
- Lines: 119 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: DELETE
- Covers: upstream ApprovalService design: selection/timeout failure settles once, timer-vs-selection race, stop cannot steal callback; 2 configurations, 4 runs. Duplicates: `specs/quint/services/CoreApprovalServiceCurrent.qnt` (116 lines) refined by `refinement/services/current-approval-service.mjs` against current `vendor/eliza/packages/core/src/services/approval.ts`. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/ApprovalService.tla), `legacy/core/check-approval-service-refinement.mjs` (executes the *historical* approval.ts fragment at 4787d51a, lines 197-203, materialized from a fetched revision), `test/quint-core-approval-service.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | T4 | Twin of `services/CoreApprovalServiceCurrent.qnt`, which refines the current source; this one refines a superseded fragment. | Delete model, harness, test. | Low |
| 3 | — | B5 | Harness receipts assert historical-revision provenance only. | Delete. | None |

## Proposed end state
Delete the model, its manifest/inventory entries, `legacy/core/check-approval-service-refinement.mjs` and `test/quint-core-approval-service.test.mjs`. Before deleting, confirm `CoreApprovalServiceCurrent` scenarios include the timer-wins race and stop-cannot-steal-callback cases; add them there if missing.
