# test/notes-empty-close.test.mjs
- Lines: 51 | Kind: transplant (slices `function notesFind(` … `function notesLast(` and the Notes `onLeave` body from `apps/app/src/prototype/model.js`, runs them in `vm`) plus one real import of `runtime/note-default-title.ts` | Verdict: DELETE tests 1-5; MERGE test 6 into `test/integration/notes.test.ts`
- Covers: closing an existing empty note keeps it, a new blank note is discarded on close or Home, a note that was once meaningful survives being cleared, Home keeps a meaningful note open, and default titles number around existing and trashed ones. Duplicates: `test/canonical-notes-webview-abort.test.mjs`, `test/canonical-recording-audio-save.test.mjs` (import `nextDefaultNoteTitle`); `journey-core-loops.production.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T2 | Slices the 5.9k-line `model.js` (D1) by function names and a 2600-character window. | Delete. | Medium: blank-note discard has no other host check. |
| 2 | 46-51 | - | Real import, user-visible naming rule. | Keep one table case. | None |

## Proposed end state
`journeys/notes.spec.ts`: new note then Back leaves no note; type, clear, Back keeps it; new note is titled
"New note 4" next to "New note", "New note #2" and a trashed "New note 3". Notes integration keeps the
`nextDefaultNoteTitle` table.
