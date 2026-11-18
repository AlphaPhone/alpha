# test/notes-organize.test.mjs
- Lines: 113 | Kind: unit (imports the real `runtime/notes-organize-contract.ts`, `prototype/notes-organize-executor.ts`, `runtime/notes-view.ts`; the executor runs over a hand-written fake host) | Verdict: MERGE into `test/integration/notes.test.mjs` (contract validation) and REWRITE the executor cases as `journeys/notes.spec.ts`
- Covers: agent Notes organise tools: strict operation validation (trust boundary for agent input), filter is read-only, move applies only to the reviewed revision and only into an existing folder, folder create reuses names, restore outcome mapping, record start/stop through the recorder. Duplicates: `test/notes-view.test.mjs:64-77` (content search), `test/browser/notes-trash.spec.ts` (restore), `test/browser/canonical-notes.spec.ts` (folders). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-31 | - | `validateNotesOrganizeOperation` and `notesOrganizeContextAllowed` are the boundary that admits agent operations; table of bad inputs is real value. | Carry into the Notes integration file as one table-driven case. | - |
| 2 | 33-47 | T3, C4 | Fake host re-implements list/target/commit/folders/recorder; the executor is tested against the fake, not against the shell. | Replace with a journey: agent proposes a move, owner edits the note, approval is refused; agent move into a missing folder fails and creates nothing. | Medium: needs the dev agent-mock to emit `notes_move`. |
| 3 | 89-94 | T3 | Restore outcome→status mapping is a lookup table checked against itself. | Delete; `notes-trash.spec.ts` covers restore. | Low |
| 4 | 96-107 | T3 | `notes_record` start/stop through fake recorder. | Delete; covered by recorder journey (`notes-audio-journey.spec.ts`). | Low |
| 5 | 109-113 | T4 | Transcript search duplicates `notes-view.test.mjs:64-77`. | Delete. | None |

## Proposed end state
Gone as a file. One validation case moves to `test/integration/notes.test.mjs`; two agent-review journeys (stale revision refused, missing folder refused without creating it) go to `journeys/notes.spec.ts` using the dev agent-mock harness. Restore and record are left to existing journeys.
