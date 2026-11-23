# test/local-agent-contracts.test.mjs
- Lines: 24 | Kind: wrapper (6 `execFileSync(node --import tsx scripts/test-*.ts)` child suites, output discarded on success, 30-60 s timeouts each) | Verdict: MERGE (move bodies into `test/integration/resident-runtime.test.ts` and `test/integration/connection-cloud.test.ts`; delete wrapper)
- Covers: `scripts/test-local-agent.ts` (182 lines: synthetic HTTP + durable development journal of the dev local-agent bridge), `test-local-agent-stream.ts` (271: streaming and cancellation over a loopback server), `test-local-digest-storage.ts` (64: `scripts/local-agent-dev-storage.ts` digest persistence, a dev-only surface), `test-digest-cancellation.ts` (47: `DigestInbox` from `runtime/hosted-digests.ts`, itself a binding of the upstream `plugin-workflow` client), `test-agent-speech-bridge.ts` (46) and `test-agent-tts-bridge.ts` (45) (dev speech bridge credential/size/cancel rules). Duplicates: `test/local-agent-voice-bridge.test.mjs` and 7 other files exercise `scripts/local-agent-dev-bridge.ts`; `test/browser/local-agent-stream.spec.ts`/`local-agent-stop.spec.ts` drive the stream in the browser. Callers/importers: `npm test` glob; each script is called only from here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-24 | T9 | Six child processes, each paying a tsx start; failures show only `execFileSync` stderr; `stdio:'pipe'` hides successful output. | Move each script body into the integration files as node:test cases (scripts chunk owns the moves). | Low |
| 2 | 15 | T5 | `test-digest-cancellation.ts` exercises the upstream digest client through Alpha's binding. | Keep only if it asserts Alpha's retained-brief binding; otherwise delete (upstream owns `DigestInbox`). | Low |
| 3 | 10-11, 18-23 | D6 | Three of the six suites test development-only bridges (`local-agent-dev-storage.ts`, dev speech/TTS bridges served by Vite). Their security rules (owner bound, loopback only, credential never returned) matter for developer machines, not product builds. | Keep in one `dev-bridge` block, not in product integration lanes; run only when `scripts/local-agent-dev-*.ts` or `vite.config.ts` change. | Low |
| 4 | 4,7,11,… | C3 | `{cwd:new URL('..',import.meta.url),timeout,stdio:'pipe'}` repeated six times instead of `test/fixtures/child-suite.mjs`. | Gone with the move. | Low |

## Proposed end state
File deleted. Resident protocol and stream cases live in `test/integration/resident-runtime.test.ts`; the dev bridge,
dev storage and dev speech bridge cases join `test/local-agent-voice-bridge.test.mjs` in one
`test/integration/dev-bridge.test.ts`, path-filtered to the dev bridge sources.
