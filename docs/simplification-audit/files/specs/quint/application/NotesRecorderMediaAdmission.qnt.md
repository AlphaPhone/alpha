# specs/quint/application/NotesRecorderMediaAdmission.qnt
- Lines: 82 | Kind: Quint model (live; Playwright-driven refinement harness) | Verdict: KEEP
- Covers: Notes microphone capture is admitted only after saved-audio playback has confirmed it stopped, only for the current start attempt, and a retired agent control cannot claim a later capture. Duplicates: test/browser specs for the recorder cover the UI journey, not the drain/attempt race. Callers/importers: manifest row (9 sources, no symbols); harness specs/quint/refinement/application/notes-recorder-media-admission.mjs + test/fixtures/notes-recorder-media.mjs (imports real modules in the page via `import('/src/...')`); wrapper test/notes-recorder-media-admission.test.mjs; mentioned in specs/quint/develop-state-review.md

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-82 | - | Models current canonical recorder code (`note-recorder.ts`, `notes-recorder-control.ts`, `voice.ts`, `audio-capture.ts`); all sources exist. | Keep. | L |
| 2 | manifest sources | B5 | Lists `template.html`, `canonical-notes-ui.ts`, `note-audio-store.ts`, `note-recording-journal.ts` though the abstraction says playback journal/writes are out of scope; every listed file is hashed/read each run. | List only modules the fixture imports. | L |
| 3 | harness | T6 | The fixture runs product modules via `page.evaluate(import('/src/...'))` (a browser-hosted integration of real modules, acceptable for a refinement harness), but it needs a Vite server, making this a slow host test. | Keep; schedule it in the formal lane, not `npm test`. | L |
| 4 | C1 interplay | A1 | If C1 removes `voice-adapter.ts` legacy voice-note paths, re-check that the fixture still finds `notesRecorderControl`/`NoteRecorderSession` exports. | Verify after stage A. | M |

## Proposed end state
Unchanged model; manifest `sources` trimmed to the imported modules; run in the formal lane.
