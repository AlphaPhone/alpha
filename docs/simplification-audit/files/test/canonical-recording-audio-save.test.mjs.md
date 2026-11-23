# test/canonical-recording-audio-save.test.mjs
- Lines: 67 | Kind: transplant (slices `voiceAudio` and `saveVoice` from `canonical-notes-ui.ts`, plus upstream `note-format.ts` and a slice of `types.ts`, strips types, runs in `vm` with a fake controller) | Verdict: DELETE; carry 3 cases to `journeys/notes.spec.ts` (voice recording)
- Covers: saving a recorded clip creates one voice note and attaches audio by the note's real id; interrupted audio retention never creates a second note; foreign/trashed voice notes are not reused; lost create response is recovered without a duplicate; default "Voice note N" numbering. Duplicates: `test/browser/notes-audio-journey.spec.ts`, `test/browser/recording-question.spec.ts`, `test/quint-canonical-notes-mutation.test.mjs` (create idempotence). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-16 | T2 | Four text markers (`function voiceAudio(`, `function domainOf(`, `async saveVoice(`, `async saveCard(`) across two files, one of them upstream. | Delete. | None |
| 2 | 19 | C1/T3 | 400-character fake controller re-implements note creation. | Delete. | None |
| 3 | 23-34, 46-56 | T3 | "One note per recording even after a lost reply or interrupted audio save" is the risky behaviour. | `journeys/notes.spec.ts`: record, make the dev agent drop the create reply once, save again -> exactly one voice note with audio. | Medium: needs the dev resident to support a one-shot lost reply. |
| 4 | 58-67 | T3 | Default title numbering duplicates the text-note numbering case. | One numbering step in the notes journey covers both. | Low |

## Proposed end state
Deleted. `notes-audio-journey.spec.ts` becomes the voice part of `journeys/notes.spec.ts` with the lost-reply
no-duplicate step; create idempotence stays in the Notes mutation Quint refinement.
