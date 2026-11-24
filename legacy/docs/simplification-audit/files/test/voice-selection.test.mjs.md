# test/voice-selection.test.mjs
- Lines: 157 | Kind: transplant (regex-strips imports/exports of `runtime/voice-selection.ts` and evals it in `vm` with a fake `connectionController`) + source-text (lines 36-39, 136-138) | Verdict: REWRITE as `test/integration/voice.test.mjs` (real import)
- Covers: the run-time speech route (Cloud / device / direct) from account, credential and Cartesia key; plan and rate-limit holds; network-failure hold durations per error code; the recorder route in production vs test-mocks; send policy. Duplicates: `test/browser/voice-route-preference.spec.ts`, `test/browser/dev-speech-account-switch.spec.ts`, `test/voice-turn-routes.test.mjs:233-256` (also transplants this file). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-23 | T2 | Text rewrite + vm eval; the module is transplanted only because it imports `connection-ui.tsx`. | Import the module; inject the snapshot reader (or import with the real controller in a test-mocks build). | Medium |
| 2 | 36-39, 136-138 | T1 | `doesNotMatch` over `voice-selection.ts` and `build-flags.ts` for removed names and `localStorage`. | Delete. | None |
| 3 | 120-131 | A4/D8 | Tests `setVoiceSendPolicyForTests` / `voiceSendPolicy` (voice-selection.ts:22-27), the test-only send-policy override DECISIONS D8 deletes. | Delete with the switch. | None |
| 4 | 133-144 | A1 | Seeds `alphaphone:voice-route:v1` and `alphaphone:speak-replies:v1` from "an earlier build" to prove they are ignored. | Delete (D1). | None |
| 5 | 60-103 | T3 exception | `networkSpeechFailureHoldMs` code→hold table (401-404 → 10 min, 5xx → 1 min, 429 Retry-After capped at 1 h, non-network → null) and per-account/per-key hold. A risky pure decision a UI journey cannot enumerate. | Keep as table cases in the integration file. | Medium |
| 6 | 105-118 | D5 | Branches on `testMocksEnabled`; production cases (route ignores requested preference) are the only ones worth keeping. | Keep production rows only. | Low |

## Proposed end state
Delete this file. `test/integration/voice.test.mjs` imports `voice-selection.ts` (and `voice-turn-routes.ts`, `voice-timing.ts`, see that report) and keeps: (a) route by account/credential/own-key, (b) plan/rate-limit lapse times, (c) the network-failure hold table and per-account/per-key scoping. Product prerequisite: `voice-selection.ts` reads the connection snapshot through an injectable function so Node can import it without `connection-ui.tsx`. The browser `voice-route-preference.spec.ts` keeps the visible route.
