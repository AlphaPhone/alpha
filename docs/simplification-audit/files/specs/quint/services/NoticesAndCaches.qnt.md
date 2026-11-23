# specs/quint/services/NoticesAndCaches.qnt
- Lines: 96 | Kind: Quint model (services family, live; 4 tests) | Verdict: MERGE (cache half into `ServiceReadCache.qnt`; notice half stays as an upstream notice-owner model)
- Covers: two unrelated machines in one state: (a) read-cache owner/epoch/age isolation and the clear fence, (b) notice delivery ownership: claim, post, tap, single acknowledgement, retirement retry. Sources exist (`service-read-cache.ts`, `service-read-cache-store.ts`, `gmail-background.ts`, `workflow-device-contract.ts`, `hosted-result-notices.ts`, `WorkflowNoticeDelivery.java`, `prototype/workflow-adapter.ts`). Duplicates: (a) is a strict subset of `ServiceReadCache.qnt` (per-service documents, clear fence, owner switch, expiry), and both are refined against the same `ServiceReadCache` class (`cache.mjs` here, `service-read-cache-replay.mjs` there). (b) is refined against upstream `NoticeOwnerCoordinator` (`.eliza/client-features/packages/contracts/src/notice-routes.ts`); `WorkflowNoticeTaps.qnt` covers the product tap path. Callers/importers: manifest; harness `refinement/services/cache.mjs` (imports `ServiceReadCache` and `NoticeOwnerCoordinator` directly, no slicing); services aggregate only (no wrapper test).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-38, 80, 92-95 | T4 / C5 | Cache half duplicates `ServiceReadCache` (clear fences an in-flight write, owner isolation, expiry). | Delete the cache fields/actions/tests; keep `ServiceReadCache` as the one cache model; delete the cache part of `cache.mjs`. | Low: `ServiceReadCache` invariants are stronger (`ClearFencesPut`, `ShownOwnerIsolation`). |
| 2 | 39-74 | ci §2.9 | Notice half models the upstream `NoticeOwnerCoordinator`. | Keep as `NoticeOwnerCoordinator.qnt` (rename), gated on upstream pin; upstream follow-up. | Low |
| 3 | manifest sources | A2 / D4 | Sources list includes `hosted-result-notices.ts` and `prototype/workflow-adapter.ts`, which the model does not represent separately. | Trim to the coordinator source after the split. | None |

## Proposed end state
~55-line notice-owner model driven against the upstream coordinator; cache behaviour covered once by `ServiceReadCache`.
