# test/notes-view.test.mjs
- Lines: 114 | Kind: unit (imports the real pure modules `runtime/notes-folders-model.ts`, `runtime/notes-view.ts`) + source-text (lines 97-100 regex over `model.js` and `voice-adapter.ts`) | Verdict: MERGE into `test/integration/notes.test.mjs` (selected cases)
- Covers: Notes folder document validation, unique names, delete/rename/restore folder rules, content search (titles, items, transcripts, clips), read-only filter and label, sort and date labels. Duplicates: `notes-organize.test.mjs:109-113` (search), `test/browser/canonical-notes.spec.ts` / `canonical-notes-design.spec.ts` (folders in the UI); the rule names (FolderRefsValid, RenameKeepsMembership, RestoreReturnsToFolder) come from `specs/quint/legacy/NotesView.qnt`, a historical model. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 97-100 | T1 | Regex over `model.js` and `voice-adapter.ts` for timestamp stamping, inside a sort test. | Delete the regex lines; keep the sort assertion. | None |
| 2 | 11-27 | B3 | `validateNotesFolders` is the persisted-document boundary (storage → typed value). | Carry the bad-input table (it is a trust-boundary validator). | - |
| 3 | 29-62 | T3 | Folder release/rename/restore rules on pure functions. | Carry rename-keeps-membership and delete-releases-notes as one case; drop trivial `withNoteFolder` identity checks. | Low |
| 4 | 64-90 | T3 | Search/filter helpers. | Carry the filter-is-read-only case; search is also covered by journeys. | Low |
| 5 | 102-114 | T3 | Date labels with fixed locale/timezone. | Carry (cheap, locale-sensitive, unreachable from a journey with a fixed clock otherwise). | - |
| 6 | 4-5 | A8 | Comment "view wiring is covered by browser specs" is fine; header can go with the merge. | - | - |

## Proposed end state
Deleted as a file. `test/integration/notes.test.mjs` imports the real folder/view modules and holds about four cases: the folder document validator table, folder rename/delete keeps membership, the filter is read-only and combines criteria, and sort and date labels. The source-text lines are dropped.
