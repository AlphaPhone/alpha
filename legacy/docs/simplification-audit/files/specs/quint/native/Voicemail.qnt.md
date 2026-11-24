# specs/quint/native/Voicemail.qnt
- Lines: 125 | Kind: Quint model (live) | Verdict: KEEP; trim manifest sources
- Covers: visual voicemail: nothing without a ready carrier, generation fences on audio/transcript replies, local transcription never silently falls back to cloud, cloud upload only by setting, play marks heard, calls pause and lock stops playback, delete needs confirm. Duplicates: Playwright `test/browser/dev-voicemail-audio.spec.ts` and `aosp-telephony-views.spec.ts` drive the view; no other model. Callers/importers: `quint:check`; `refinement/native/telephony.mjs:85-143` (`checkTelephonyVoicemail`, esbuild import of `apps/app/src/runtime/voicemail-state.ts`), run from `refinement/native/index.mjs:171`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | – (good) | Import-based replay of `voicemail-state.ts`. | Keep. | – |
| 2 | manifest `sources` | T10 | Lists `phone-adapter.ts` and `voicemail-transcription.ts`; the harness imports only `voicemail-state.ts` (and hashes its bundle graph). `phone-adapter.ts` is a large prototype adapter; pinning it re-runs this model on every Phone UI edit. | Reduce `sources` to `voicemail-state.ts`. | Low |
| 3 | 93, 101 | – (formal strength) | `CloudOnlyWhenChosen` only says the engine is `local` or `cloud` while running/done; it does not tie a cloud engine (or `cloudUploads`) to `stt == "cloud"` at transcription time. The no-silent-fallback rule is carried by `noSilentCloudFallbackTest` and by the `transcribe` guard, not by an invariant. | Formal-owner question: add a ghost `uploadedWhileLocal` flag (set if `transcribe` uploads with `stt == "local"`) and an invariant that it stays false. Not a simplification; listed so the privacy rule is not assumed to be invariant-checked. | Low |
| 4 | 23-24 (`cleared`) | – | Small, clear model. | None. | – |

## Proposed end state
Model unchanged; manifest `sources: [apps/app/src/runtime/voicemail-state.ts]`. One import-based replay in the
telephony lane. Device acceptance (SIM + carrier visual voicemail) stays a listed obligation.
