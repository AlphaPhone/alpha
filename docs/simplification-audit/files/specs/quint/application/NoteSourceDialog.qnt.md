# specs/quint/application/NoteSourceDialog.qnt
- Lines: 196 | Kind: Quint model (live in application manifest; ITF trace-replay harness) | Verdict: DELETE
- Covers: Android note "source document" dialog: link a picked file, open/verify the linked source, release picker grants, retain/maintain Android source references. Duplicates: none. Callers/importers: manifest row (sources `apps/app/src/prototype/note-source-adapter.ts` + shared `plugin-files/src/documents/source-links.ts`, 10 symbol pins); harness specs/quint/refinement/application/note-source-dialog.mjs (bundles the adapter with esbuild + stubbed ports via notes-files-media-itf.mjs `loadProductModule`, a good import-based technique); wrapper test/quint-note-source-dialog.test.mjs; application README

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | A1/A7 | Models `note-source-adapter.ts`, which delete-candidates C1/A99 lists as part of the legacy "Previous notes" engine (D1) and which is already deleted (`git status`: D). | Delete model, manifest row, harness `note-source-dialog.mjs`, wrapper test, README rows. | L |
| 2 | manifest | P6 | quint-lib.ts:233 `readFileSync`s every manifest `sources` entry; this file is already deleted in the worktree, so every Quint command (`quint:check`, `quint:changed`, refinement) throws before any model runs until this row is removed. | Remove the row in the same commit as the source deletion. | H (CI red now) |
| 3 | harness | T10 (n/a) | The harness is one of the few that imports and runs the real module; the technique (`loadProductModule` in notes-files-media-itf.mjs) is the template other ports should copy. | Keep notes-files-media-itf.mjs for the surviving importers (notes-document-transfer, etc.). | L |
| 4 | 1-196 | B5 | Android source-reference grant/maintenance logic (refs, leaked grants) has no other model; once the adapter is gone it protects nothing. | None. | L |

## Proposed end state
The model, its manifest row, `specs/quint/refinement/application/note-source-dialog.mjs` and test/quint-note-source-dialog.test.mjs are deleted together.
If Android `SelectedDocumentAccess` source references survive in native code, their maintenance is covered (or not) by native models, not here.
Lower the application floor in test/quint-checker.test.mjs only if the total drops below 116 (it does not: 187 rows today).
