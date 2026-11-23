# test/browser/browser-audio.spec.ts
- Lines: 97 | Kind: Playwright spec, chromium; module-in-page (T6) against the browser stand-ins of `AlphaVoiceCloud`/`AlphaNoteAudio` and `browser/note-audio-store.ts`, 5 tests | Verdict: DELETE
- Covers: the browser voice stand-in records via MediaRecorder, saves audio to IndexedDB atomically, cancels pending transcription on pagehide, releases tracks/object URLs; note-audio-store keeps bytes across transcript edits and deletion restore. Duplicates: voice and note-audio journeys driven through UI (`voice-*`, `notes-*audio*` specs, other chunks). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-27, 50-68 | P7/T6 | Exercises the web implementation of `AlphaVoiceCloud`, which the APK replaces with the native plugin; calls plugin methods directly. | Delete. | Low. |
| 2 | 20-21 | P3 | `IDBObjectStore.prototype.add` patched to abort the transaction. | n/a. | None. |
| 3 | 13 | T8 | `waitForTimeout(400)` for encoding. | n/a. | None. |
| 4 | 33-35 | P2 | Overrides `connectionController.getBrowserSpeechAgent`. | n/a. | None. |
| 5 | 80 | T6 | Injects its own Play button into the DOM to get a user gesture. | n/a. | None. |
| 6 | 92-97 | T3 | `retainAudio/changeAudioDeleted/audioRecord` unit calls on note-audio-store. | Delete; note audio restore is a Notes journey step. | Low. |

## Proposed end state
File deleted. Note recording, playback and trash-restore of audio stay covered (if anywhere) by `journeys/notes.spec.ts` through the voice fixture.
