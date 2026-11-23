# test/automations-transport.test.mjs
- Lines: 64 | Kind: integration (real `DevelopmentCloudAgentProtocol`, `LocalAgentProtocol` and `scripts/local-agent-dev-bridge.ts` handler over a real HTTP server) | Verdict: MERGE cases 3-4 into `test/integration/automations.test.mjs`; DELETE cases 1-2
- Covers: automation mutations (PUT/DELETE/POST on triggers and LifeOps definitions) are sent only on canonical owner-scoped routes, with the current credential, and a reply that arrives after an account or connection change is refused; the local dev bridge forwards only canonical scoped routes and rejects 20 malformed or foreign routes. Duplicates: `scripts/test-cloud-protocol.ts` covers hosted-agent request admission. Callers/importers: `npm test`; `browser-source.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 18-40 | A3 | Cases 1-2 drive `runtime/development-cloud-agents.ts`, the hosted/personal Cloud agent protocol listed for deletion (delete-candidates A100, C4, D5). | Delete these cases when that module goes; until then they are the harness coverage D5 keeps. | Med |
| 2 | 41-64 | — | Cases 3-4 are real integration of the resident agent transport and the dev bridge: worth keeping. | Move to `test/integration/automations.test.mjs`. | — |
| 3 | 16 | — | The `invalid` route table (20 entries) is shared by both halves; keep it with the surviving cases. | Carry. | — |
| 4 | 8-10 | — | Four blank lines left from a removed import block. | Gone when moved. | — |

## Proposed end state
Resident-transport stale-reply and dev-bridge route-admission cases live in `test/integration/automations.test.mjs` with the shared invalid-route table. The development Cloud-agent cases are deleted with `development-cloud-agents.ts`.
