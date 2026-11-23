# test/native-cloud-streaming.test.mjs
- Lines: 208 | Kind: transplant (reads `.eliza/client-features/packages/voice/src/native-cloud-speech.ts`, deletes imports/exports by regex, strips types, runs in `vm` with fake globals and a fake native port) | Verdict: DELETE (upstream module); REWRITE the user-visible part as `journeys/voice.spec.ts` cases
- Covers: Cloud streaming ASR/TTS turn handling: one final per turn, interims never submit, old-turn drain while muted, 2.5 s mute bound, cancellation, account change, error codes. Duplicates: `test/cloud-streaming-conversation.test.mjs`, `test/browser/cloud-tts-streaming.spec.ts` (uses `cloud-voice-fixture.ts`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | T2 / T5 | Text-rewrites an upstream module to make it evaluable; `createCloudStreamingSpeech(options, port)` already takes the port, so a real import under `--conditions=eliza-source` would work. | Delete from Alpha; upstream follow-up to keep these cases next to the module. | Medium |
| 2 | 24-62, 104-107 | - | Visible: interim text in composer, one submitted segment, no submit after account change. | Two journey cases with the cloud voice fixture: speak → one message submitted, interim not submitted; sign-out mid-turn submits nothing. | Medium |
| 3 | 76-84, 158-185 | T8 | Mock timers ticking 2,500 single milliseconds. | Delete. | Low |

## Proposed end state
File deleted. Voice turn behaviour visible in Alpha is two cases of `journeys/voice.spec.ts`; module-level edge cases are an upstream follow-up.
