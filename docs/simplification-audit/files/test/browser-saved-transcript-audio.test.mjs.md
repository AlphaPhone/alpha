# test/browser-saved-transcript-audio.test.mjs
- Lines: 32 | Kind: transplant (T2; slices `' private savedSpeech?'` .. `' private clip('` out of `browser/voice.ts`, wraps it in `class Audio {...}` and runs in `vm` with fake decoder/encoder) | Verdict: DELETE; carry cases to `test/browser/journeys/notes.spec.ts`
- Covers: transcribing a saved note's audio decodes once, sends 25 s windows in order, clears PCM after the last window, refuses foreign/deleted audio and invalid offsets before decoding, refuses deletion between preparation and upload, sends no empty trailing window. Duplicates: none exact; Playwright `note-audio-lifecycle.spec.ts`, `browser-speech.spec.ts` cover saving/transcription of new recordings, not re-transcription of saved audio. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8, 14 | T2, T10 | Private-member slice; reordering class members breaks it. | Delete. | none |
| 2 | 19 | P8 | Window sample counts (400000/160000) and zero-filled PCM: internal buffer shape. | Journey asserts upload count/order only. | low |
| 3 | 21-29 | — | Foreign/deleted audio and deletion-after-preparation refusals: privacy-relevant. | Carry. | none |

## Proposed end state
Delete. Journey (dev local agent records `speechRequest` bodies): "Transcribe" on a saved 60 s voice note sends three windows in order and shows the transcript; deleting the note while transcription is preparing sends nothing further and shows no transcript.
