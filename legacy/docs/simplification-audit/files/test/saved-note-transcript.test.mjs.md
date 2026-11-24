# test/saved-note-transcript.test.mjs
- Lines: 36 | Kind: unit (real import of `addSavedNoteTranscript` from `apps/app/src/prototype/note-recorder.ts`, stub port) | Verdict: REWRITE as cases in `journeys/notes.spec.ts`
- Covers: adding a transcript to a saved recording transcribes 25 s windows in order and saves once; foreign/deleted/changed audio never reaches a provider; note change or cancel stops further windows; provider failure is not retried; silent audio is not written. Duplicates: none found in `test/browser` (notes specs cover recording and trash, not saved-note transcription). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-36 | T3 | One function with a fake port; the real caller is `voice-adapter.ts:1294`. | Move the user-visible cases to the journey. | Medium: privacy rule (foreign audio never uploaded) |

## Proposed end state
Delete after `journeys/notes.spec.ts` (native note-audio fake, speech provider stub) carries: (1) a 60 s saved recording
transcribes in three ordered windows and the note shows the joined text once; (2) switching to another note during
transcription stops and saves nothing; (3) provider failure shows an error, no retry, note unchanged. The foreign/deleted
audio admission stays with the native selector (upstream).
