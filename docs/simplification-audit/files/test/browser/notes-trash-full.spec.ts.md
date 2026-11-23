# test/browser/notes-trash-full.spec.ts
- Lines: 199 | Kind: Playwright spec, chromium, 2 tests, 120 s timeouts; legacy Notes, served `notes-trash-policy.ts` rewritten to lower limits | Verdict: DELETE
- Covers: a deletion that would overfill the local Notes Trash (entry or byte limit) is refused with the "Full" dialog; the note stays saved, Trash unchanged, reload loses nothing, making room lets it through. Duplicates: `notes-trash-recovery.spec.ts` covers the same dialog (header says so). Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 23 | A1 | Legacy "Previous notes" and its device-local Trash (`/src/runtime/notes-trash.ts`). Canonical Notes Trash is held by the agent record store (fixture `state.trash`). | Delete with legacy Notes. | Coverage: local Trash limits (legacy only) |
| 2 | 42-51, 113-122 | T1/T10-like | `page.route` regex-rewrites `NOTES_TRASH_MAX_ENTRIES`/`NOTES_TRASH_MAX_BYTES` in the served module; two copies (also in `notes-trash-recovery` and `notes-permanent-delete-backstop`). | n/a. | None |
| 3 | 159-167 | T6 | Calls `addNotesTrashEntry`, `notesTrashOverflows`, `isNotesTrashFull` directly. | n/a. | None |
| 4 | 68, 148 | T8 | Waits up to 15 s for an Undo toast to expire. | n/a. | None |

## Proposed end state
File deleted with legacy Notes. Quint model `specs/quint/refinement/application/notes-trash-read-publication.mjs` must be checked by the formal reviewer (it reads `notes-trash` code).
