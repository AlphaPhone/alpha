# specs/quint/refinement/application/browser-files-trash.md
- Lines: 27 | Kind: narrative note (bug history + harness description) for `browser-files-trash.mjs` | Verdict: DELETE
- Covers: history of a Trash/Restore marker race fixed in upstream commit `0510aba0…`, baseline `458ae1b8…`, schedule list, run command. Duplicates: harness assumptions; the model `BrowserFilesTrash.qnt`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 16-18 | A8 | Commit-hash changelog ("The authenticated repair in…", "The baseline in … preserves two source replays that failed"). | Delete. | None |
| 2 | 20 | A1 | "Legacy hidden rows" listed as remaining obligation — legacy readers are out of scope (D1). | Delete. | None |
| 3 | 3, 5 | P6 / §2.9 | Documents that the replay targets the pinned upstream `plugins/plugin-files/src/browser/storage-volume.ts`: the model covers upstream code. Worth recording in the chunk summary as an upstream-owned model candidate. | Carry into the upstream follow-up list (D14). | Low |
| 4 | 22-27 | P1 | Run command names `test/files-browser-atomic-placement.test.mjs` and the per-model wrapper. | Delete with file. | None |

## Proposed end state
File removed. If the harness stays here, a 2-line header in `browser-files-trash.mjs` names the upstream module replayed.
