# scripts/test-agent-tts-bridge.ts
- Lines: 45 | Kind: integration (real dev bridge over loopback, synthetic upstream TTS) | Verdict: MOVE/MERGE into `test/local-agent-speech-bridge.test.ts`; delete its shim case in `test/local-agent-contracts.test.mjs:23`
- Covers: the development bridge returns Paradee TTS audio byte-exact with request id/provider checks, rejects malformed or over-long requests without dispatch, maps wrong id/type/provider/invalid WAV to 502 and oversize to 503 without leaking audio, enforces owner binding, and cancels upstream on abort. Duplicates: structure twin of `test-agent-speech-bridge.ts` (same fixture, same shape). Callers: `test/local-agent-contracts.test.mjs:23` (T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 / C5 | Second copy of the speech-bridge test harness pattern. | One file, two tests. | Low |
| 2 | 43 | T8 | 300×10 ms polling loop. | Await a handler-signalled promise. | Low |
| 3 | 39 | — | `/api/tts/kokoro` rejection: Kokoro is retired upstream; the case still proves non-Paradee paths are refused. | Keep one "other provider path" case. | — |

## Proposed end state
Merged into `test/local-agent-speech-bridge.test.ts` (see the ASR report).
