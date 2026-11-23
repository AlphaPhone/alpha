# apps/app/src/runtime/voicemail-transcription.ts
- Lines: 20 | Role: installs the Phone view's voicemail transcriber — the on-device recognizer only. | Verdict: KEEP (minor SIMPLIFY; consider MERGE into `prototype/phone-adapter.ts` call site in `main.tsx`)
- Importers: `main.tsx` (`installVoicemailTranscription`). No tests import it.
- Text/path pins: `specs/quint/native/manifest.json` (source path), `test/support/feature-parity.mjs:623` (exact inventory).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 14 | A4 | `mode: () => 'local'` and the ignored `_mode` parameter exist only because `VoicemailTranscriber` in phone-adapter still models a `'cloud'` mode (see voicemail-state.ts report, finding 1). | Drop with the owner decision on cloud voicemail transcription. | Low. |
| 2 | 13 | B1 | `await voice.ready(signal).catch(() => false)` — any readiness error reads as "not available", which is the specified behaviour (state `'unavailable'`, never a cloud fallback). | Keep; add "unavailable recognizer is reported, not retried elsewhere" comment or rely on the header. | — |
| 3 | 13, 15 | C3 (local) | `createOnDeviceVoice()` is created twice per voicemail (available + transcribe). | Acceptable; or create once per call in `transcribe` only. | None. |
| 4 | 8 | NEW (layering) | A `runtime/` module imports `../prototype/phone-adapter` to register itself — runtime depends on the prototype layer. | Have `main.tsx` call `setVoicemailTranscriber(onDeviceVoicemailTranscriber)` with this module exporting only the transcriber object. | Low. |

## Local types and helpers
None.

## Proposed end state
~12 lines exporting an on-device transcriber object (`available`, `transcribe`), registered by `main.tsx`; no mode argument.

## Verification
Playwright Phone/voicemail journey; Android voicemail transcription on device (on-device recognizer); feature-parity inventory.
