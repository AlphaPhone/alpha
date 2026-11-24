# scripts/test-local-agent-stream.ts
- Lines: 271 | Kind: integration (real `local-agent-stream.ts`, `alpha-client.ts`, `local-agent.ts`, `remote-protocol.ts`, `local-agent-native-stream.ts` and the dev proxy `scripts/local-agent-dev-bridge.ts`, bundled by `test/fixtures/browser-source.mjs`; a loopback HTTP agent; SSE byte streams) | Verdict: MERGE with `scripts/test-local-agent.ts` into `test/integration/local-agent.test.ts`; delete the `RemoteProtocol` cases with C4
- Covers: SSE framing (CRLF, heartbeats, split UTF-8, revisions), planning labels never become reply text, terminal validation and limits, abort cancels the body, owner binding and no replay through the dev proxy, stale progress callbacks after cancel, authored text sent byte-exact, one persisted-reply read after a dropped stream (never on Stop or refusal), voice trace header only for canonical voice turns, explicit turn abort, navigation metadata only from the authenticated terminal frame, `reply_ready` retention and revocation, native stream adapter incl. WebView without `AbortSignal.any`. Duplicates: `test/browser/chat-continuity.spec.ts` / `journey-a-conversation.spec.ts` exercise sending through the UI but not framing limits; `specs/quint/native/manifest.json` pins `local-agent-stream` by path. Callers: `test/local-agent-contracts.test.mjs:6`; fixture `scripts/fixtures/local-agent-stream.ts` is not used here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 140-155, 176-190 | A3 (C4/D5) | `RemoteProtocol` replay and remote abort cases test the paired/hosted class that C4 deletes (keeping only `conversationRoomId`/`turnAbortPath`/`turnAbortOutcome`, moved to `local-agent.ts`). | Delete these blocks with the class; the local abort block (161-175) keeps covering the moved helpers. | L |
| 2 | 23 | — | Real bundling through `loadBrowserModule`; right level. | Keep. | — |
| 3 | 88 | T8 | 2 s `setTimeout` race waiting for the upstream socket to close. | Await the server `close` event with the test timeout. | L |
| 4 | 92-98 | D8 | Lines up to 400 characters with several statements. | Split. | L |
| 5 | 205 | — | Uses `viewId:'wallet'` as the ignored tool-frame value; only a string, but Wallet is deleted (D2). | Use any non-terminal view id (e.g. `settings`). | L |
| 6 | 89, 191, 201, 220, 271 | — | Narrative success logs. | Remove; use `test()` names. | L |

## Proposed end state
`test/integration/local-agent.test.ts` with `describe` groups: stream framing/limits, dev proxy owner binding, client progress fences, dropped-stream recovery, turn abort (local), navigation/ready metadata, native adapter. About 200 lines after removing remote cases and log lines. Shim test `test/local-agent-contracts.test.mjs` rows for both files deleted.
