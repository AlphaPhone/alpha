# test/notes-recorder-controls.test.mjs
- Lines: 117 | Kind: transplant (slices `prototype/voice-adapter.ts`, `prototype/model.js`, `prototype/canonical-notes-ui.ts` between literal markers and runs them in `vm`) + source-text over `prototype/template.html` | Verdict: DELETE (carry 3 behaviours into `journeys/notes.spec.ts`)
- Covers: recorder sheet controls (Stop/Save labels, disabled while finishing, no discard while a canonical save is uncertain, hardware Back saves), Copy text of a long transcript, transcript selection bypassing shell gestures, playback refusing a foreign/deleted audio handle, playback control restored by the canonical decorator. Duplicates: `test/browser/notes-audio-journey.spec.ts`, `note-audio-lifecycle.spec.ts`, `note-audio-native-fence.spec.ts`, `journey-b-voice-note-actions.spec.ts`, `notes-recorder.test.mjs`; Quint `NotesRecorderMediaAdmission` (via `notes-recorder-media-admission.test.mjs`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-19, 45-47, 60, 71, 79, 91, 98, 106-109 | T2 | Ten literal-marker slices (`  const finishNoteRecording =`, `  function noteRecorderView(`, `notes.back = (state: Bag`, `gDown(e)`, `      vo.hasPlayback = true;` ...). | Delete. | None |
| 2 | 51-57 | T1 | Regex over `template.html` (no "Cartesia", one discard onClick, aria-label). | Delete; production bundle audit already bans provider names where it matters. | None |
| 3 | 22-31 | A1-adjacent | Loops `canonical` true/false; the `false` side is the legacy Notes destination. | Drop with C1. | None |
| 4 | 36-43 | - | Stale controls cannot discard or resubmit while finishing; uncertain canonical save keeps the recording. | Carry as journey assertions (button disabled during save; Discard unavailable while save pending). | Medium |
| 5 | 44-50 | - | Hardware Back saves an open recording. | Carry as journey (press Back while recording, the note is saved). | Low |
| 6 | 59-68 | - | Copy text copies the full transcript and refuses a changed note. | Check `journey-b-voice-note-actions.spec.ts`; carry if absent. | Low |
| 7 | 78-117 | T4 | Playback handle refusal and decorator: `note-audio-native-fence.spec.ts` and `note-audio-lifecycle.spec.ts` drive the same paths. | Delete. | Low |

## Proposed end state
File deleted. `journeys/notes.spec.ts` (from `notes-audio-journey.spec.ts`) asserts: Stop/Save disabled while saving, Back saves the recording, Copy text copies the whole transcript. Needs the fake media-device fixture already used by `notes-browser-segments.spec.ts`.
