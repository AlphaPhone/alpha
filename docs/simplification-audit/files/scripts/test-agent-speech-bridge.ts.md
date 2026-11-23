# scripts/test-agent-speech-bridge.ts
- Lines: 46 | Kind: integration (real `scripts/local-agent-dev-bridge.ts` handler over loopback HTTP, synthetic upstream host) | Verdict: MOVE to `test/local-agent-speech-bridge.test.ts` (merge with `test-agent-tts-bridge.ts`); delete the two shim cases in `test/local-agent-contracts.test.mjs`
- Covers: the development bridge forwards ASR audio byte-exact with the owner token kept server-side, binds requests to the owner, rejects malformed/oversized/foreign-origin requests without dispatching, accepts the 2 MiB maximum, and cancels upstream on client abort. Duplicates: none found. Callers: `test/local-agent-contracts.test.mjs:19` (spawns `node --import tsx`, T9). Fixture: `scripts/fixtures/speech-bridge.ts` (shared with the TTS script).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Real test hidden in `scripts/` behind a child-process shim. | Move into one `node:test` file with the TTS bridge test; move `scripts/fixtures/speech-bridge.ts` (+ `loopback.ts`) to `test/fixtures/`. | Low |
| 2 | 42, 44 | T8 | Polls `calls` every 10 ms up to 3 s; races with a 3 s timer. | Resolve a promise from the fake upstream handler when the request arrives and await it. | Low |
| 3 | 30, 40 | D8 | Many assertions per line. | One per line. | — |

## Proposed end state
`test/local-agent-speech-bridge.test.ts` with two tests (ASR, TTS) sharing the loopback fixture; cases kept
as they are (each is a boundary rule), waiting on events instead of polling.
