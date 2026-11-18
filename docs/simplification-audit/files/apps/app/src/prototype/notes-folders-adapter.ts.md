# apps/app/src/prototype/notes-folders-adapter.ts
- Lines: 68 | Role: exposes `api('notes').notesFolders.{create,rename,remove,reload}` over the encrypted folder slot (`runtime/notes-folders`) and returns focus to the ⋯ button for menu actions | Verdict: SIMPLIFY (then MERGE into the notes view owner)
- Importers: `main.tsx:150` only. Consumers of `api.notesFolders`: `model.js:3003-3040`.
  Text/path pins: `specs/quint/application/manifest.json:285`; `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs` (legacy harness, P6); `test/support/feature-parity.mjs:396`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-45 | A1 (P10) | `if(shell.notesSourceMode!=='legacy')return true; const list=…releaseNotesFolder(list,id); …vset('notes',{list:released})` — releasing note folder references runs only for Older notes. | Delete with the legacy-notes decision; `remove()` ends after the slot write. Drop `releaseNotesFolder` import. | Owner decision P10. |
| 2 | 6 | A8 | Doc comment cites `PLAN.md section 3, decision N1` — `PLAN.md` does not exist (research A8). | Remove the reference; keep the behavioural description. | None. |
| 3 | 3, 13 | C1 | `type Shell=any`, `type Bag`. | `ShellHost` shared type. | None. |
| 4 | 15, 48-52 | D2 | Wraps `Component.prototype.api` to attach `notesFolders` to every `api('notes')` call. | Notes view owner provides `notesFolders` once. | Low. |
| 5 | 20, 27, 34, 40 | B1 | `catch{…vset({folders:[]…})}`, `catch{shell.toast('Not created');…}` — each is a specified user-facing outcome; ok. Line 34 matches on error **message text** `'Folder name in use'`. | Give `renameNotesFolder` a typed error code and match the code (D10 label-string behaviour). | Low. |
| 6 | 54 | D9/A6 | Render starts a side effect (`loading=Promise.resolve().then(()=>api.notesFolders.reload())`) and checks `api.notesFolders` (always present after line 50, B2). | Load on Notes open (mount/onOpen hook) instead of from render; drop the `api.notesFolders &&` check. | Low. |
| 7 | 56-65 | D10/NEW | Focus-return wrapper finds the ⋯ button via `document.querySelector('button[aria-haspopup="dialog"][aria-expanded="true"]')` and wraps `pin/del/moveTo` of `view.ed/vo/lk` "whichever adapter supplies the action". Accessibility glue that belongs to the menu component. | Move to the menu owner (`subview-accessibility.ts` already manages popup focus). Preserve behaviour exactly (focus returns to ⋯ before the action). | Medium (a11y semantics). |
| 8 | — | owner | `voice-adapter.ts:1252-1253` forces `folder:null` and closes `menu:'move'` on every Notes render ("this Notes surface is one complete list"). If the folder UI is no longer reachable, `create/rename` from `model.js:3011-3026` may be unreachable too, leaving only the agent `notes_folder_create/notes_move` path (`notes-organize-executor.ts`). | Owner/implementer: confirm which folder UI actions remain reachable before simplifying further. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Shell`, `Bag` | type | 2-3 | 60× / `agent-adapter.ts:88` etc. | shared types |
| `load/create/rename/remove` | helper | 18-46 | `notes-organize-executor.ts notesOrganizeShellHost.showFolders` writes the same `{folders, foldersLoaded:true}` patch | notes view owner (one `showFolders`) |

## Proposed end state
~45 lines inside the notes view owner: folder CRUD over `runtime/notes-folders`, load on open, one `showFolders(doc)` shared with the organize executor host; focus-return moved to the menu/accessibility owner; no legacy release path, no PLAN.md reference.

## Verification
Playwright Notes folder journeys (if folder UI remains), `node --test test/notes-organize.test.mjs`, Quint application manifest, feature-parity test.
