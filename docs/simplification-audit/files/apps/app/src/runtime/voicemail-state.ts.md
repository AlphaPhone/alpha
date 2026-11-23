# apps/app/src/runtime/voicemail-state.ts
- Lines: 63 | Role: pure state machine for the one open voicemail in the Phone view (audio fetch, transcript, playback, delete confirmation), each reply fenced by a ticket. Refines `specs/quint/native/Voicemail.qnt`. | Verdict: KEEP (one owner-gated SIMPLIFY)
- Importers: `prototype/phone-adapter.ts:5` (all 15 exports). Specs: `specs/quint/refinement/native/telephony.mjs` (drives every transition against the Voicemail model).
- Text/path pins: `specs/quint/native/manifest.json` (source path), `test/support/feature-parity.mjs:622` (exact inventory).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5, 7, 41-45 | A4 / A8 | The header says "Transcription follows the owner's speech setting" and `transcriptRequested(…, mode: 'local'\|'cloud', …)` keeps a `'cloud'` engine, but the only installer (`voicemail-transcription.ts:12`) hard-codes `mode: () => 'local'` and its header says voicemail audio "is never sent to a cloud recognizer". `'cloud'` is reachable only from the Quint driver (`telephony.mjs` `cloud()` → `setStt('cloud')`) and `Voicemail.qnt` (`cloudUploads`). | Owner decision. If voicemail is on-device only: drop `mode`, `TranscriptEngine` `'cloud'`, and the `engine: mode==='local'?'device':'cloud'` branch; remove `VoicemailTranscriber.mode` in phone-adapter; update `Voicemail.qnt` (`setStt`, `cloudUploads`) and `telephony.mjs` scenario "the cloud setting transcribes in the cloud". Fix the header either way. | Medium: Quint model + driver change together. |
| 2 | 56 | none | `callStarted = paused` alias — the name documents the model action; keep. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `TranscriptEngine` | type | 7 | phone-adapter `OpenVoicemailRead.engine` imports it | stays |
| `OpenVoicemail` | type | 8-19 | none | stays |
| `closedVoicemail` | helper | 20-21 | none | stays |

## Proposed end state
Unchanged (63 lines), or ~58 lines without the `'cloud'` mode if the owner confirms on-device-only voicemail transcription; header corrected to match `voicemail-transcription.ts`.

## Verification
Quint native replay `specs/quint/refinement/native/telephony.mjs` (Voicemail model); Playwright Phone/voicemail journeys; feature-parity inventory.
