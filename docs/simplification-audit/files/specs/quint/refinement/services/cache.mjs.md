# specs/quint/refinement/services/cache.mjs
- Lines: 60 | Kind: Quint refinement harness (imports real `ServiceReadCache` from `apps/app/src/runtime/service-read-cache.ts` and upstream `NoticeOwnerCoordinator` from `.eliza/client-features/packages/contracts/src/notice-routes.ts`) | Verdict: KEEP
- Covers: model `NoticesAndCaches`: CAS-persisted cache entries survive a new instance and expire exactly at 30 days; `clear()` invalidates an in-flight write so a late put cannot repopulate; a failed notice owner transition marks retry and the same identity retries (5 traces). Duplicates: `service-read-cache-replay.mjs` (forward replay `ServiceReadCache` model) covers per-owner epochs of the same class more broadly; no host integration test of the 30-day boundary found. Importers: `index.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 / §2.3 | Manifest sources of `NoticesAndCaches` also list `gmail-background.ts`, `workflow-device-contract.ts`, `hosted-result-notices.ts`, `WorkflowNoticeDelivery.java`, `workflow-adapter.ts`, none executed here; edits to them reselect this model. | Trim manifest sources to `service-read-cache.ts`, `service-read-cache-store.ts`. | Low |
| 2 | 43-58 | §2.9 | The notice owner trace exercises upstream code only. | Keep (small); upstream follow-up candidate. | — |
| 3 | 26-29 | — | Fault injection by wrapping the store's `read` (a port object, not a global): fine. | None. | — |
| 4 | — | P4 risk | Only runner is the services aggregate (DELETE). | Include in the manifest-driven runner. | Medium if missed |

## Proposed end state
Unchanged; manifest sources narrowed.
