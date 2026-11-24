# specs/quint/legacy/notes-view/README.md
- Lines: 42 | Kind: documentation for a historical Quint comparison harness | Verdict: DELETE (with `legacy/notes-view/` and `NotesView.qnt`, C17/D11)
- Covers: prose for `check-notes-view-refinement.mjs`: canonical vs "Previous notes" source identity, retained folder rename/restore, recorder segment durability. Duplicates: the harness `assumptions` (`check-notes-view-refinement.mjs:442-448`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-42 | P6, A1 | Two of its three paragraphs describe "Previous notes" (the legacy Notes source) which D1 deletes; `apps/app/src/prototype/legacy-notes-access.ts` and `notes-trash-adapter.ts` are already deleted in this worktree. | Delete. | None |

## Proposed end state
File removed with `specs/quint/legacy/notes-view/`.
