# apps/app/src/runtime/notes-folders-model.ts
- Lines: 81 | Role: pure Notes folders document model (validate, add, rename, remove, note↔folder helpers) and the installed slot/key names. | Verdict: SIMPLIFY
- Importers: `runtime/notes-folders.ts:3-4` (import + `export *`), `runtime/notes-view.ts:1`, `runtime/notes-organize-contract.ts:2`, `prototype/notes-organize-executor.ts:3`.
- Text/path pins: `test/notes-view.test.mjs`, `test/notes-view-defaults.test.mjs`, `specs/quint/application/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42-61 | B3 | `addNotesFolder`/`renameNotesFolder`/`removeNotesFolder` call `validateNotesFolders(doc)` on input and again on output; `notes-folders.ts:16-18` validates again around the same edit. Up to five validations per edit of a document this module just produced. | Validate at decode (`readNotesFolders`) and once on the edited result; edits take a typed `NotesFoldersDocument`. | Low |
| 2 | 17-22 | C3/A2 | `notesFolderName` is byte-identical to upstream `plugin-assistant/.../notes-organize-contract.ts:69` `notesFolderName` (same 40-char max). | Import upstream; delete local copy and `NOTES_FOLDER_NAME_MAX`. | Low |
| 3 | 9-10, 15 | A7 | `NOTES_FOLDER_LIMIT`, `NOTES_FOLDER_NAME_MAX`, `emptyNotesFolders` exported, no external user (0 src, 0 tests). | Unexport. | None |
| 4 | 2 | A8 | "PLAN.md section 3, decision N1" — no PLAN.md exists. | Cite `docs/prd.md` / `specs/notes-view` or drop. | None |
| 5 | 64-68 | C3 | `noteFolderOf` duplicated as `notesFolderOf` in `prototype/model.js:2989`. | model.js imports `noteFolderOf`. | Low |
| 6 | 64 | C1 | local `FolderNote` beside the shared `NoteRecord`. | Use `Pick<NoteRecord,'id'|'folderId'>`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `notesFolderName` | helper | 17 | upstream `plugin-assistant/.../notes-organize-contract.ts:69` | upstream |
| `noteFolderOf` | helper | 66 | `prototype/model.js:2989` `notesFolderOf` | here |
| `FolderNote` | type | 64 | `notes-view.ts:8` `Note`, `NoteRecord` | `NoteRecord` |
| `NOTES_FOLDERS_SLOT`, `browserNotesFoldersKey` | const | 7-8 | — | notes bindings module (installed identity) |

## Proposed end state
~60 lines: model without re-validation of its own outputs, upstream `notesFolderName`, constants moved to the notes bindings module.

## Verification
`test/notes-view.test.mjs`, `test/notes-view-defaults.test.mjs`, `test/browser/mvp.spec.ts` folder flows, legacy `check-notes-view-refinement.mjs`.
