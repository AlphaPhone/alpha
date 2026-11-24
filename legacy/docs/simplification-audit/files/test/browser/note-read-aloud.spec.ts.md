# test/browser/note-read-aloud.spec.ts
- Lines: 64 | Kind: Playwright spec, chromium, 3 tests; legacy Notes UI, reading started by importing `speakNote` from `/src/prototype/local-speech-playback.ts` | Verdict: DELETE (carry the toolbar check into `journeys/notes.spec.ts`)
- Covers: read-aloud uses only the agent's on-device speech; editing or leaving the note stops it; finishing reports completion; the editor has no Read aloud/Dictate buttons. Duplicates: `native-speech.production.spec.ts` Notes cases (same behaviour, production lane, also legacy). Callers/importers: none; imports `helpers/legacy-notes.ts`, `voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 18, 25 | A1 | Opens legacy "Previous notes" and reads `browser-notes-document.ts` (D1). | Delete. | Coverage: "editing stops read-aloud" has no canonical test |
| 2 | 22-31 | T6 | Starts and observes reading through module functions (`speakNote`, `currentNoteReading`); the comment admits there is no UI entry ("reading a note is asked of Alpha"). | A journey must ask Alpha in chat to read the open note; then edit and assert speech stops (voice fixture counts cancels). Owner decides whether that path exists for canonical notes. | Medium |
| 3 | 57-64 | ok | Asserts the toolbar has Back, Turn into checklist, More, and no Read aloud/Dictate. | Carry as two assertions in the notes journey's editor step. | None |
| 4 | 9 | T8 | 120 s timeout for a "slow shared dev server". | Drop with the file. | None |

## Proposed end state
File deleted. The toolbar-shape assertion lives in the canonical editor step of `journeys/notes.spec.ts`; a chat-driven "read this note" step is added only if canonical Notes keeps read-aloud.
