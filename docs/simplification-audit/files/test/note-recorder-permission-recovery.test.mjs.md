# test/note-recorder-permission-recovery.test.mjs
- Lines: 25 | Kind: transplant (slices `export function createNoteRecorderDriver` up to `/** An empty result` from `apps/app/src/runtime/note-recorder-driver.ts`, type-strips and runs in `vm`) | Verdict: DELETE
- Covers: the Notes recorder driver passes permission errors through unchanged without dispatching its own UI event, and a device failure is not reported as a permission problem. Duplicates: `test/notes-recorder.test.mjs`, `test/browser-note-pending-audio.test.mjs`, `journey-core-loops.production.spec.ts` (`startNoteRecording`), Quint `NotePermissionTraces.java`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T2 | Marker slice + `vm` with fake `window`/`CustomEvent`. | Delete. | Low |

## Proposed end state
File deleted. `journeys/notes.spec.ts` keeps "denied microphone shows the recovery once; granting later records".
