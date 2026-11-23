# scripts/host-speech-admission.ts
- Lines: 64 | Kind: dev/host runtime admission (verifies the host inference library and pinned ASR/TTS assets before a local agent starts) | Verdict: KEEP, SIMPLIFY
- Covers: refuses to start desktop speech unless the inference library and every model file match reviewed SHA-256 and size, and the ASR/VAD directories hold exactly the expected GGUF files. Duplicates: the streaming no-follow hash check has no twin in scripts. Callers/importers: `scripts/start-combined-agent.ts`, `scripts/start-local-voice-agent.ts`, `scripts/start-local-remote.ts`, `scripts/fingerprint-voice-assets.ts`; tests `host-speech-admission`, `agent-speech-environment`; copied into a scratch repository by `specs/quint/refinement/services/combined-agent-launcher-probe.mjs:16-17` (file list) and listed in `specs/quint/services/manifest.json:2086` and `scripts/quint-lib.ts:17`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 59 | A8 | `refuseRetiredSpeechNames` (from `speech-env.ts`) throws on environment names retired by an earlier migration (`ALPHA_WHISPER_*`, `ELIZA_KOKORO_*`, renamed names). The package was renamed and starts fresh (DECISIONS D1); there is no install base of old env files. | Delete the call; delete `RENAMED`/`RETIRED` in `speech-env.ts` (research/scripts.md agrees). | L |
| 2 | 19-22 | D8 | The hashing loop is four statements per line. | Format into a short loop. | L |
| 3 | 7 | A7 | `export {speechAssets}` exists only for `test/host-speech-admission.test.mjs`. | The test can import the JSON itself. | L |
| 4 | 15 | — | `verifiedFile` (O_NOFOLLOW, fstat before and after, size bound) is a sound trust-boundary check of files supplied by environment. | Keep. | L |
| 5 | — | T10 | The Quint launcher probe copies this file by path into a scratch tree; a rename or merge must update `combined-agent-launcher-probe.mjs` and `combined-agent-launcher.mjs`. | Note for the formal port. | L |

## Proposed end state
About 55 lines: settings table, `verifiedFile`, `modelsIn`, `admitSpeech`, `speechEnvironment`, without the retired-name refusal or
the test-only re-export. Behaviour of admission unchanged.
