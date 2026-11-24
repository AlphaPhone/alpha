# test/cloud-speech-chunks.test.mjs
- Lines: 93 | Kind: unit of an upstream module (imports `planCloudSpeechChunks` / `speakCloudSpeechChunks` from `.eliza/client-features/packages/voice/src/cloud-speech-chunks.ts`, generated from `vendor/eliza`) | Verdict: MERGE into `test/integration/voice.test.ts` (interim), upstream follow-up to move it to `vendor/eliza`
- Covers: Cloud speech chunking: short replies are one request; long replies start with their natural first sentence (abbreviations/decimals kept), fall back to clause/word boundaries, stay within provider bounds and preserve text; chunks are spoken sequentially with one first-audio callback; abort, account change or playback failure stops the sequence. Duplicates: none: `vendor/eliza` has no test of this module (grep found only the source). Callers/importers: `npm test` glob. Product use: `apps/app/src/prototype/voice-adapter.ts`, `prototype/local-speech-playback.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T5 / D13 | Tests upstream code through a deep `.eliza` path. Alpha cannot change it, but Alpha's first-audio latency depends on it and nothing else tests it. | Keep the cases (T3 exception: only coverage of a risky pure algorithm); file D14 follow-up so upstream owns the test; then delete here. Use the `@eliza/*` alias (D13) when it exists. | Low |
| 2 | 9-40 | - | Planning cases. | Keep three as one table. | None |
| 3 | 42-93 | - | Sequencing/abort cases with deferred promises; no sleeps. | Keep. | None |

## Proposed end state
Cases live in `test/integration/voice.test.ts` under "Cloud speech chunks (upstream)" until upstream adds its own test, then this block is deleted. File removed.
