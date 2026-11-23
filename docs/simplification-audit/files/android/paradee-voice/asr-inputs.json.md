# android/paradee-voice/asr-inputs.json
- Lines: 26 | Role: reviewed pin of the on-device ASR slot (backend + one Phonon-2 GGUF with sha256/bytes, licence, attribution) | Verdict: SIMPLIFY
- Importers: `scripts/paradee-runtime.ts:89-91` (`asrSlotFiles`, checks staged bytes), `scripts/voice-host.ts:18,120-124` (`VOICE_ASR_SLOT`, cross-checks against `qualified-voice-host.json`), `scripts/ci/speech-candidate.ts:35-37` (`files[].path`). Text/path pins: `qualified-voice-host.json:17` (`asrSlot.record`), `test/paradee-runtime.test.mjs`, `test/voice-host-absent-admission.test.mjs`, `test/android-build-path.test.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | A7 / C6 | `"runtimeEnv": {"ELIZA_ASR_BACKEND": "ggml"}` has no reader (grep `runtimeEnv`: only this file); the value is hard-coded instead in `scripts/host-speech-admission.ts:54` (`ELIZA_ASR_BACKEND:'ggml'`). | Delete the key (or make host-speech-admission read it — one source). Prefer delete; the native loader already defaults per `qualified-voice-host.json:22`. | None |
| 2 | 9-14, 16-24 | C6 | `license`, `attribution`, `licenseFlags`, `sha256`, `bytes`, `path`, `role`, `backend` are repeated in `android/voice-host/qualified-voice-host.json:117-134` (`models[1]`) and `asrSlot` (`:16-23`); `voice-host.ts:123` exists only to prove the two copies agree. | Keep this file as the single ASR pin (paradee-runtime and speech-candidate read it) and remove the copied licence/attribution text from one side, OR fold this file into `qualified-voice-host.json` (its `models` row already carries everything) and point `paradee-runtime.ts`/`speech-candidate.ts` at the `asr-model` rows. Recommended: fold (one record, delete `voice-host.ts:118-125` equality check). | Medium: `generate-licenses.ts` reads attribution/licenseFlags from the host record's models; keep those there. |
| 3 | 3 | A8 | 500-char `description` explaining the mechanism and the policy for changing models. | Shorten to one sentence; mechanism belongs in `scripts/paradee-runtime.ts` doc comment (already at `:47`). | None |
| 4 | 23 | A8 | `source` string mixes provenance with status ("status unpublished: built locally, never downloaded"). | Keep provenance, drop status narrative. | None |

## Local types and helpers
None (data). Twin record: `android/voice-host/qualified-voice-host.json` `models[role=asr-model]` + `asrSlot`.

## Proposed end state
Either deleted (folded into `qualified-voice-host.json`), or ~20 lines: `schemaVersion`, `slot`, `backend`, `model`, `license`, `files[{path, role, bytes, sha256, architecture, source}]`.

## Verification
`node --test test/paradee-runtime.test.mjs test/voice-host-absent-admission.test.mjs test/voice-host-record.test.mjs test/android-build-path.test.mjs`; `node scripts/voice-host.ts --verify`; `npm run android:build:local` (runs `verifySpeechInputs`/`verifyVoiceHost`).
