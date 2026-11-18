# specs/quint/refinement/application/photos-window.md
- Lines: 37 | Kind: harness narrative note | Verdict: DELETE (move 3–4 scope lines into the header of `specs/quint/application/PhotosWindow.qnt`)
- Covers: prose description of the PhotosWindow campaign, a past visibility race fix and the model bounds. Duplicates: the `assumptions` array in `photos-window.mjs:404-409` says the same thing. Callers/importers: none (whole-repo grep for `photos-window.md` outside `docs/` finds nothing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-29 | A8 | History narration ("The initial source reproduced a visibility race… now invalidates"; "A separate source regression…"). | Delete. | None |
| 2 | 1-16, 31-37 | T4 | Restates the harness `assumptions` and model bounds. | Keep one copy, in the `.qnt` header. | None |

## Proposed end state
File deleted. `PhotosWindow.qnt` header states the bounds (three identities, two cursors, four load identities, hidden catalogs cannot publish) and the unmodelled protocols.
