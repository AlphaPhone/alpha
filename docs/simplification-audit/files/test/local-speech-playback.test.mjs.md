# test/local-speech-playback.test.mjs
- Lines: 115 | Kind: transplant. Tests 1-2 use `test/fixtures/cloud-voice-view.mjs` (a vm harness shared by 10 files that evaluates voice sources with fakes); tests 3-4 evaluate `runtime/voice-selection.ts`, `runtime/local-speech-text.ts`, `.eliza/.../cloud-speech-chunks.ts` and `prototype/local-speech-playback.ts` in one `vm` box with ~20 fake globals and a fake `Shell` class | Verdict: REWRITE as steps in `test/browser/journeys/voice.spec.ts` (Listen) and `journeys/notes.spec.ts` (read aloud); DELETE
- Covers: reading a long note aloud with Cloud in ≤5000-character pieces, one request at a time; a Cloud failure before audio falls back to on-device speech and holds that account; without on-device speech the Cloud cause is shown, a failure after audio says "Stopped · …", private error text never shown; message Listen refuses text with a link on both routes before any audio; Listen on Cloud chunks a long reply. Duplicates: `test/browser/note-read-aloud.spec.ts` (read aloud start/stop), `test/cloud-conversation-chunks.test.mjs` and 8 other `cloud-voice-view` users; `specs/quint/native/manifest.json:3299-3326` model sources include `prototype/local-speech-playback.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 58-93 | T2, D2 | Loads four sources by regex-deleting imports and installs `installLocalSpeechPlayback` on a fake `Shell` (the monkey-patch adapter pattern). | Delete. | Low |
| 2 | 11-55 | T2 | `cloudVoiceViewFixture` vm harness; overrides `f.box.speakLocalText`/`createOnDeviceVoice` mid-test. | Delete this importer (fixture survives while 9 others remain). | Low |
| 3 | 25-55 | — | Fallback-and-hold rule and user-visible error copy ("Eliza Cloud sign-in expired…", "Stopped · Eliza Cloud declined voice for billing.") have no browser coverage found. | Carry into `journeys/notes.spec.ts` with the Cloud voice fixture returning 401/402. | Medium |
| 4 | 95-105 | — | Listen refusal for links ("This message has a link or email address…") has no browser spec (grep of `test/browser` for the copy finds none). | Carry into `journeys/voice.spec.ts` (or chat): agent message with a URL, tap Listen, copy shown, no audio request. | Medium |
| 5 | 11-23, 107-115 | T4 | Cloud chunking ≤5000 characters duplicates `test/cloud-conversation-chunks.test.mjs` and the upstream chunker. | Delete. | Low |
| 6 | 9 | — | 12 000-character fixture string built at module load. | Gone. | Low |

## Proposed end state
File deleted. Two journey steps: notes read-aloud falls back to the device voice on a Cloud 401 and shows the Cloud cause
only when no device voice exists; chat Listen refuses a message with a link. Chunk sizing stays with the chunker's own
coverage.
