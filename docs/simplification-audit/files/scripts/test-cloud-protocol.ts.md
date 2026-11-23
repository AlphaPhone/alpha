# scripts/test-cloud-protocol.ts
- Lines: 328 | Kind: integration (real `CloudProtocol` and `CloudSignInError` over a loopback HTTP server through a fake native transport) + prototype-shape assertions + D5 hosted-agent parts | Verdict: MOVE to `test/cloud-protocol.test.ts` (node:test cases), absorb `test-cloud-subscription.ts`; delete the hosted-agent and prototype-shape parts
- Covers: in-app Cloud sign-in through the host port (email, MFA, Google, cancel, one at a time, refused foreign/extra/unstored outcomes), the browser sign-in hand-off (`login`) with previous-key revocation order, Maps request idempotency keys and tile validation, Gmail scopes/search paging/read/thread/HTML size limits/read-state capability/disconnect, outage without retry. Duplicates: `test/managed-service-routes.test.mjs` (route shapes), `test/cloud-sign-in-state.test.mjs`, `test/browser-cloud-dev-bridge.test.mjs`. Callers/importers: `test/adapter-contracts.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | T9 | Re-spawns itself with `--import=tsx` when the loader is missing. | Delete; `node:test` with the test loader. | L |
| 2 | 18-20 | T1/A8 | Asserts `login` exists and nine hosted-agent methods are absent from `CloudProtocol.prototype` (a property of the source, and a tombstone). | Delete. | L |
| 3 | 15, 163, 168, 189-200, 239, 244-248 | A3 / D5 | `DevelopmentCloudAgentProtocol` agent list/detail/conversations/send/shared routing and outage-on-agents checks. | Delete with D5 (cross-file-actions U-R5 lists "test-cloud-protocol.ts (personal parts)"). Move the outage-without-retry check onto a managed route (e.g. `identity`). | L |
| 4 | 279-323 | — | Browser hand-off `login()` is "the product path until the in-app readiness probe passes". Still live; keep. | Keep as its own `test()`; owner question whether it stays. | M |
| 5 | 37-116 | D8 | One server with a global `mode` string switch for ~25 modes. | One small route table per `test()`. | L |
| 6 | 52-63 | A1 | `apiKey: 'synthetic-legacy-key'` preference check ("session token preferred over legacy API key"). | Keep only if the server can still return `apiKey`; otherwise drop with the legacy reader. Owner/agent check. | L |

## Proposed end state
`test/cloud-protocol.test.ts`: `sign-in (in-app host)`, `sign-in hand-off`, `previous key revocation`, `maps requests`, `gmail`, `subscription` (from `test-cloud-subscription.ts`), `outage/no retry`; ~220 lines, no child process, no hosted-agent code.
