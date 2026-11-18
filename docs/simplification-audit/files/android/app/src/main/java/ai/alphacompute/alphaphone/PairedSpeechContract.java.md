# android/app/src/main/java/ai/alphacompute/alphaphone/PairedSpeechContract.java
- Lines: 15 | Role: request/response contract for ASR/TTS on a selected paired development agent (`/api/asr/libelizainference`, `/api/tts/paradee`) | Verdict: DELETE (owner decision P15)
- Importers: `AlphaVoiceCloudPlugin` (8 uses). Text/path pins: `test/fixtures/PairedSpeechContractTest.java` + `test/paired-speech-contract.test.mjs`, `test/campaign-speech-routes.test.mjs`, `scripts/android-browser-reading-live.ts`, androidTest (1 `Paired*` class), `specs/quint/refinement/native/note-bridge-platform.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-15 | A3 (P15) | "Exact explicit development-host contract" for paired agents, which the PRD excludes. | Delete with `PairedAgentCredential` and the paired methods (see that report). | Medium (owner decision). |
| 2 | 9-14 | D8 | Every method on one line. | n/a if deleted; else format. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ASR_PATH`, `TTS_PATH`, providers | const | 7-8 | renderer `paired-voice.ts` | deleted |
| `requestId` UUID check | helper | 9 | UUID regexes (P9) | deleted |

## Proposed end state
File removed.

## Verification
`npm run verify` after removing the paired tests and campaign script route.
