# scripts/test-local-agent.ts
- Lines: 182 | Kind: integration (real dev proxy `scripts/local-agent-dev-bridge.ts`, `scripts/local-agent-dev-storage.ts`, `apps/app/src/runtime/local-agent.ts` and `local-agent-storage.ts`, bundled by `test/fixtures/browser-source.mjs`; loopback HTTP agent; temp directory journal) | Verdict: MERGE with `scripts/test-local-agent-stream.ts` into `test/integration/local-agent.test.ts`
- Covers: dev proxy path allowlist, origin/Host/header gates, owner binding (409), token never exposed, pairing, approvals and trajectory diagnostic reads (exact query shapes), truncate confirmation, no replay after 401, token file permission check, cancellation and stale responses, owner-access refusal, durable dev journal and workflow-draft compare-exchange, and `developmentDeviceStore` available only under the dev flag combinations (production and partial flags make no request). Duplicates: none at HTTP level; the allowlist is also pinned by Quint manifests listing `local-agent-dev-bridge.ts`. Callers: `test/local-agent-contracts.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54-56, 70, 75-79, 85-86, 98 | T4 | Most paths are asserted twice: `localAgentPathAllowed(path)` and then the same path through `invoke()` → status. | Keep only the HTTP assertions (the trust boundary); drop direct allowlist calls except where no HTTP case exists. | L |
| 2 | 151-180 | — | Production gating of the dev device store by env (`DEV:false` → no request): a release rule. | Keep; it is the only host proof that dev storage is unreachable in production (the bundle audit checks text, not behaviour). | — |
| 3 | 116-123 | — | Cancellation/stale/owner-access refusal on `LocalAgentProtocol` with inline bridges. | Keep. | — |
| 4 | 124-150 | — | Dev journal and draft slot CAS in `local-agent-dev-storage.ts`. | Keep (dev surface retained by D6). | — |
| 5 | 1, 48-52 | C5 | `startLoopback`/`stopLoopback` + host/proxy setup duplicated in the stream file. | One shared setup in the merged file. | L |
| 6 | 181 | — | Narrative success log. | Remove. | L |

## Proposed end state
Part of `test/integration/local-agent.test.ts`: groups "dev proxy gates", "diagnostic reads", "client lifecycle", "dev journal", "dev storage gating". The shim `test/local-agent-contracts.test.mjs` loses both rows (it keeps or loses the remaining digest/speech rows per their own reports).
