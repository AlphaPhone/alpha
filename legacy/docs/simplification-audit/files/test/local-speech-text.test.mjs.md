# test/local-speech-text.test.mjs
- Lines: 99 | Kind: transplant (vm-evaluates `runtime/local-speech-text.ts`, `.eliza/.../native-speech-request.ts`, `apps/app/src/local-speech-playback.ts`, `runtime/local-voice.ts` with imports regex-deleted); tests 1-4 are table tests of the pure planner `planLocalSpeech` | Verdict: MERGE tests 1-4 into `test/integration/voice.test.ts` via a real import (T3 exception: only coverage of a risky pure algorithm); DELETE tests 5-6
- Covers: on-device speech text planning: times, money, ranges, phone numbers and dates read naturally; bullets/quotes without labels; conversation mode folds accents/slashes/web prefixes while Listen refuses them; credentials (password/secret/card numbers) refused as a whole reply with code `speech-refused`; on-device voice folds and resolves silence for unsayable text; silent recordings report `no-speech`. Duplicates: none for the planner (no Quint model lists `local-speech-text.ts`); `local-speech-playback.test.mjs` loads `screenSpeechText` from the same file. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-13 | T2 | vm transplant of a 91-line module that has no imports: it can be imported directly (`node --experimental-strip-types` / the test loader). | Import `planLocalSpeech` from the real module. | Low |
| 2 | 53-61 | — | Credential refusal (never read a password or card number aloud) is a privacy rule; the only test. | Keep. | Medium if lost |
| 3 | 18-51 | T3 (accepted) | Normalisation tables: cheap, catch regressions in spoken output. | Keep as one table per mode. | Low |
| 4 | 63-99 | T2 | Loads `local-voice.ts` + `local-speech-playback.ts` + upstream request runner into one vm box to test fold-then-synthesize and transcribe errors. | Delete; the fold is the planner (already covered), and `no-speech` vs generic failure copy is a single mapping better asserted in the voice journey. | Low |

## Proposed end state
File deleted; `test/integration/voice.test.ts` gets a "speech text planning" block importing `planLocalSpeech` with
three tables (listen normalisation, conversation folding/refusals, credential refusals).
