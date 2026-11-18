# test/browser/notes-audio-journey.spec.ts
- Lines: 75 | Kind: Playwright spec, chromium + firefox + webkit (in `scripts/storage-specs.ts`), 1 test; real canonical Notes UI with synthetic WebAudio microphone | Verdict: MERGE into `journeys/notes.spec.ts` (cross-browser storage lane)
- Covers: record, pause, resume and stop a voice note without transcription or upload; the recording survives a client reload in real IndexedDB; Play/Stop; delete then Undo restores the same recording. Duplicates: `canonical-notes.spec.ts` "Stop saves canonical audio locally…", `browser-speech.spec.ts` "unsigned Notes records and saves playable audio…"; this is the only cross-engine copy. Callers/importers: `scripts/storage-specs.ts:26`; imports `helpers/canonical-notes.ts`, `cloud-voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 51-59 | T6 | Calls `AlphaVoiceCloud.saveRecording` directly (owner replay, wrong-owner refusal) and counts IndexedDB rows. | Drop; replay ownership is internal. Keep the visible "one recording, still playable" assertion. | Low |
| 2 | 67-69 | T6 | Reads `AlphaNoteAudio.describe` to check `noteId`/`deletedAt` after delete and Undo. | Replace with playing the restored recording (already done at 70-73). | Low |
| 3 | 11-19 | C5 | Synthetic microphone (oscillator to MediaStream, MediaRecorder byte counter) also built in `notes-browser-segments.spec.ts` and other voice specs. | One `microphone` fixture option in the notes/voice harness. | None |
| 4 | 43 | ok | Re-binds the closed canonical fixture after reload; honest comment that this is not server persistence. | Keep. | None |

## Proposed end state
The cross-browser "voice note" step of `journeys/notes.spec.ts`: record/pause/resume/stop, title, reload, play, delete, Undo, play. Uses the shared microphone fixture; no plugin calls. Drop the same flow from the chromium-only canonical spec if it is a duplicate there.
