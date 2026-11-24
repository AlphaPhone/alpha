# scripts/fixtures/loopback.ts
- Lines: 20 | Kind: test support (listen on 127.0.0.1:0 and return the origin; close) | Verdict: KEEP; MOVE to `test/support/loopback.ts` and adopt it in the test files that hand-roll the same thing
- Covers: starting a throwaway loopback HTTP server. Duplicates: hand-written `listen(0, '127.0.0.1')` blocks in at least 14 files, e.g. `test/managed-google-agent-broker.test.mjs`, `test/direct-transcription-proxy.test.mjs`, `test/dev-local-launcher.test.mjs`, `test/browser-cloud-dev-bridge.test.mjs`, `test/calendar-managed-rejection.test.mjs`, `test/automations-transport.test.mjs`, `scripts/test-local-redaction.ts`. Callers/importers: 15 scripts (`test-remote-protocol`, `test-workflow-*-ui-flow`, `test-cloud-delegation`, `test-connection-history`, `eval-device-action-clarification`, `test-local-agent-stream`, `test-hosted-live-source-picker`, `test-workflow-protocol`, `test-device-actions`, `test-cloud-protocol`, `test-cloud-personal-flow`, `test-local-agent`, `fixtures/speech-bridge.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-20 | C3 | The right helper, under-used: the same 8 lines are copied in about 14 test files. | One helper in `test/support/`; replace the copies when those tests are merged. | L |
| 2 | 12 | — | The `typeof address === 'string'` guard is a real type narrowing for `server.address()`. | Keep. | L |

## Proposed end state
`test/support/loopback.ts`, unchanged code. `eval-device-action-clarification.ts` stays in `scripts/` (an eval tool) and imports it from
`test/support`, or the helper lives in `scripts/lib/` if a script must keep importing it; pick one home and use it everywhere.
