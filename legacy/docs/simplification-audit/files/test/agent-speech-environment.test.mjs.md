# test/agent-speech-environment.test.mjs
- Lines: 47 | Kind: unit (`speechEnvironment` from `scripts/host-speech-admission.ts`) | Verdict: DELETE
- Covers: host ASR/TTS are opt-in, need absolute paths and reviewed SHA-256, and renamed/retired env vars are refused with a message. Duplicates: `test/host-speech-admission.test.mjs` covers `admitSpeech` (digest checks); `speechEnvironment` itself is imported only here and by `start-local-remote.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-46 | A8 | Tests `refuseRetiredSpeechNames`: refusal stubs for renamed/retired variables (`ALPHA_LOCAL_ASR`, `ALPHA_WHISPER_*`, `ELIZA_KOKORO_MODEL_DIR`). Tombstones. | Delete the test cases and the refusal code in `scripts/speech-env.ts`. | None |
| 2 | 31-37 | T3 | Input validation of a developer launcher's environment. | Delete; if wanted, one "speech off by default" assertion in the launcher test. | Low |

## Proposed end state
File deleted; `refuseRetiredSpeechNames` and its rename table deleted in the scripts pass. Host speech admission
(`admitSpeech`, digest checks) stays covered by `test/host-speech-admission.test.mjs`, subject to its own review.
