# scripts/test-tts-worker-lifecycle.ts
- Lines: 101 | Kind: source transplant of upstream code (`standalone-speech-service.ts`, `standalone-asr-service.ts` from `vendor/eliza`, linked in `vm` with a fake `spawn`) | Verdict: DELETE
- Covers: upstream TTS/ASR worker pipe-failure handling, generation fencing, cancellation drain, env not forwarding provider keys. Duplicates: upstream's own tests. Callers/importers: `test/tts-worker-lifecycle.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31, 47 | T5/T2 | Reads and evaluates vendor source text. | Delete; list "provider key not forwarded to speech worker env" as an upstream follow-up. | Low |
| 2 | 34 | - | Mutates `process.env` globally. | Goes with the file. | None |

## Proposed end state
Deleted with its shim.
