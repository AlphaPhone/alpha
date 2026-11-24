# apps/app/src/runtime/remote-protocol.ts
- Lines: 338 | Role: Eliza app-host REST client for remote-agent pairing/session (pair, restore, revoke, conversations, send, abort) plus conversation helpers shared with the local agent. | Verdict: SPLIT (leaf helpers → local-agent module; `RemoteProtocol` class → dev/test-mocks module or DELETE, owner)
- Importers: `runtime/connection-ui.tsx:54,71` (`RemoteProtocol`, `RemoteProtocolError`, `MessagePage`), `runtime/local-agent.ts:14` (`conversationViewHeaders`, `conversationRoomId`, `messagePageQuery`, `turnAbortOutcome`, `turnAbortPath`, types), `runtime/local-agent-stream.ts:3` (type), `runtime/native-connection.ts:12` (types); scripts `fixtures/workflow-host.ts:7,66`, `test-connection-history.ts:14,37`, `test-local-agent-stream.ts`, `test-remote-protocol.ts`.
- Text/path pins: `specs/quint/application/manifest.json`, `test/dev-surface-gates.test.mjs`, `test/prepared-navigation-route.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 94-296 | A3 | `RemoteProtocol` is constructed only in `connectRemote` (`connection-ui.tsx:1140`), which throws `pairingRetired()` unless `testMocksEnabled` (L1138). PRD: no hosted-agent pairing. | Move the class (with `RemoteCredential(Store)`, `RemoteRequester`, `normalizeRemoteOrigin`, `remoteCredentialStore`, `nativeRemoteRequest`) to a dev module stubbed out of production, or delete once the host-test harness uses the local agent. | Medium (owner; workflow-host and connection-history scripts) |
| 2 | 297-338 | D11 | production helpers (`conversationRoomId`, `turnAbortPath`, `turnAbortOutcome`, `MessagePage`, `messagePageQuery`, `conversationViewHeaders`, `RemoteChatReply`, `RemoteConversation`, `TurnAbortOutcome`) live in a retired-feature file. | Move to `runtime/agent-conversation.ts` (or into `local-agent.ts`). | Low |
| 3 | 78-82 | D7 | `import.meta.env === undefined ||` so Node tests can import without Vite. | Use `testMocksEnabled`; tests run through a loader. | Low |
| 4 | 31-46, 326 | A7 | `RemoteIdentity`, `RemoteAuthStatus`, `droppedResponse` exported, 0 external users. | Unexport. | None |
| 5 | 65-76 | C3 | `object`/`string`/`boolean` validators: correct at a network boundary, but `object` is one of ~35 copies. | Shared `asRecord(value, () => new RemoteProtocolError('invalid_response'))`. | Low |
| 6 | 316 | C3 | `uuidPattern`. | `isUuid`. | None |
| 7 | 77 | D4 | `abort(signal)` wraps `signal?.throwIfAborted()`. | Inline. | None |
| 8 | 256 | B1 | `catch { signal?.throwIfAborted(); return false; }` in revoke — specified (revocation failure is reported as false). | Keep. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `object`/`string`/`boolean` | helper | 65-76 | `native-calendar-sync.ts:14`, `owner-reminder-notification-protocol.ts:24`, `cloud-protocol.ts:124` | `lib/records.ts` |
| `uuidPattern` | const | 316 | 5 UUID regexes | `lib/ids.ts` |
| `RemoteRequester`, `RemoteCredentialStore` | type | 17, 26 | `native-connection.ts` implementations | dev module |
| conversation helpers | helper | 300-338 | used by `local-agent.ts` | `runtime/agent-conversation.ts` |

## Proposed end state
Production keeps `runtime/agent-conversation.ts` (~45 lines: conversation/turn-abort/page/view-header helpers and their types). `RemoteProtocol` (~240 lines) moves to `dev/remote-protocol.ts` behind the test-mocks module boundary, or is deleted with remote pairing.

## Verification
`scripts/test-remote-protocol.ts`, `scripts/test-local-agent-stream.ts`, `scripts/test-connection-history.ts`, `scripts/fixtures/workflow-host.ts` (and every workflow host test using it), `test/dev-surface-gates.test.mjs`, `test/prepared-navigation-route.test.mjs`, `audit-production-bundle.ts`.
