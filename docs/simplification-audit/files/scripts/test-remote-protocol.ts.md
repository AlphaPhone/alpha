# scripts/test-remote-protocol.ts
- Lines: 161 | Kind: integration (real `RemoteProtocol` against a loopback HTTP host) | Verdict: DELETE (with `RemoteProtocol`, D5)
- Covers: hosted-agent pairing, restore, owner change, revocation, expiry, outage, cancellation during credential write, plus view-client header and clientMessageId reuse. Duplicates: `scripts/test-connection-history.ts` uses the same class; conversation helpers it shares with the local agent (`conversationViewHeaders`, `turnAbortPath`, truncate) are exercised by `scripts/test-local-agent.ts` / `test-local-agent-stream.ts`. Callers/importers: `test/connection-contracts.test.mjs:7` (spawn shim); comment in `test/browser/connection-boundaries.production.spec.ts:411`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A3 | `RemoteProtocol` is constructed only in `connectRemote`, which throws `pairingRetired()` unless test mocks are on (product report `runtime/remote-protocol.ts` finding 1); PRD: no hosted-agent pairing. | Delete when `RemoteProtocol` moves out of production or is deleted. Until then it can stay as the dev harness test. | Medium (sequencing with `fixtures/workflow-host.ts`, `test-connection-history.ts`) |
| 2 | 8-11 | T9 | Re-spawns itself under `--import=tsx`. | Goes with the file. | None |

Cases worth carrying (into the local-agent integration test, if absent): view client id is sent as `x-elizaos-client-id` and an invalid one is refused before sending; a send retried after a transport drop reuses the same `clientMessageId`.

## Proposed end state
Deleted with the remote pairing harness; shim entry and the spec comment removed.
