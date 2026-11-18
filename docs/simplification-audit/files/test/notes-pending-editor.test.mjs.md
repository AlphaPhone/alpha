# test/notes-pending-editor.test.mjs
- Lines: 168 | Kind: transplant (type-stripped `.eliza` plugin-notes client modules loaded as `data:` URLs; `p.vset`, draft keeper and agent Notes write sliced out of `prototype/agent-adapter.ts` and rebuilt with `new Function`) | Verdict: DELETE
- Covers: the legacy ("Previous notes") document-store editor: CAS-serialised edits, foreign writes, encrypted draft retention/merge, and the agent Notes write while an editor save is pending. Duplicates: `test/notes-owner-retirement.test.mjs`, `test/browser/legacy-notes-access.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43, 55, 114 | A1 | The fixture is `notesSourceMode:'legacy'` with `DocumentNotesStore`; the agent reply asserted at 114 is "Select Previous notes before reviewing a device-record change". All of it is the legacy Notes engine (DECISIONS D1, delete-candidates C1/B201). | Delete with the engine. | None |
| 2 | 14-25 | T2, D7 | Five literal-marker slices of `agent-adapter.ts` (`  p.vset = function (key: string`, `  /** Status for a Notes save`, `      if(isNotesOperation(operation)){` ...), rebuilt with 9-15 positional `new Function` parameters. Any reformat breaks it. | Delete. | None |
| 3 | 6 | T9 | `ALPHA_NOTES_TEST_SDK` env knob set by nothing. | Delete. | None |
| 4 | 9-12, 19 | T2 | Transforms upstream client sources by string-replacing import specifiers. | Delete. | None |

## Proposed end state
File deleted with the legacy Notes engine. Canonical Notes editing conflicts are covered by the canonical Notes Quint models and `test/browser/canonical-notes.spec.ts` (`journeys/notes.spec.ts`). No replacement needed for the legacy behaviours.
