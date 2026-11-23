# scripts/fixtures/speech-bridge.ts
- Lines: 63 | Kind: integration support (runs the real `createLocalAgentDevHandler` dev-server proxy in front of a fake local agent on loopback) | Verdict: MOVE to `test/support/speech-bridge.ts` (keep while the local-agent dev bridge exists)
- Covers: the Vite dev bridge's speech/TTS forwarding with owner-token auth, origin checks and abort. Duplicates: the fake agent auth endpoints (`/api/auth/status`, `/pair-code`, `/pair`, `/me`) are also faked in `test/browser-cloud-dev-bridge.test.mjs` and `test/local-agent-voice-bridge.test.mjs`. Callers/importers: `scripts/test-agent-speech-bridge.ts`, `scripts/test-agent-tts-bridge.ts` (child suites of `test/local-agent-contracts.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-35 | C5 | A fake local agent with the auth handshake routes; at least two test files build the same fake. | One `fakeLocalAgent(handle)` in `test/support/`, used by all three. | L |
| 2 | 36-62 | — | Correct cleanup on both success and failure paths. | Keep. | L |
| 3 | file | D6 | Tests dev-only middleware (`scripts/local-agent-dev-bridge.ts`, the Vite dev server). This is development tooling, not product; it is still worth a test because developers and e2e runs depend on it. | Keep, in the dev-tooling area of `test/`. | L |

## Proposed end state
`test/support/speech-bridge.ts` built on a shared fake-local-agent helper. The two speech-bridge suites merge into one dev-bridge integration file
(research/tests-host.md proposes a native-resident / dev-tooling grouping).
