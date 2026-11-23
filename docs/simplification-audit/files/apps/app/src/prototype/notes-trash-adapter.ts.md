# apps/app/src/prototype/notes-trash-adapter.ts
- Lines: 275 | Role: device-local Notes Trash ("Recently deleted"): move-to-trash, restore, erase, delete-forever when full, scheduled maintenance, and the Trash render | Verdict: DELETE with legacy notes (owner decision); otherwise SIMPLIFY
- Importers: `main.tsx:149` only. API consumers: `model.js:2984` (`api.moveNoteToTrash`), `notes-organize-executor.ts:112` (`api('notes').notesTrash`), `note-source-adapter.ts:74`.
  Text/path pins: `test/note-source-references.test.mjs:37-38` regexes the line `releaseUnusedSourceReferences([...await savedNotes(),...(await readNotesTrash()).entries…` (T1); `test/fixtures/notes-trash-read.mjs` bundles it; `specs/quint/application/manifest.json:3630,7148-7198` pins 12 names (`deleteForever, erase, installNotesTrashAdapter, maintaining, moveToTrash, refused, restore, runMaintenance, scheduleMaintenance, trashConfirm, trashFull, trashOpen`); `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`; `test/support/feature-parity.mjs:402`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39, 48, 51, 57 + whole file | A1 (P10) | Legacy-only. `load()` returns unless `shell.notesSourceMode==='legacy'`; `maintain()` returns when `'canonical'`; `ready()` needs `shell.notesStore` (legacy only, `agent-adapter.ts:570`). Canonical mode explicitly replaces `notesTrash:undefined, moveNoteToTrash:undefined/()=>false` and renders `trashAvailable:false` (`canonical-notes-ui.ts:302,320,342,352`). In the default Agent Notes source none of this file's behaviour is reachable. | With the P10 decision delete the file (275 lines), `main.tsx:149`, `model.js:2984` branch, Trash markup bound to `trash*` fields, the Quint entries and `test/fixtures/notes-trash-read.mjs`. Keep the native WorkManager sweep decision separate (Android owns it; see android audit). | Owner decision; largest single file in this chunk. |
| 2 | 15, 30 | C1 | `type Shell=any`, `type Bag`. | Shared types. | — |
| 3 | 32, 182-209 | D2 | Patches `p.api`, `p.componentDidMount`, `p.componentWillUnmount`; `originalMount?.apply` (B2). | Hook registry / notes owner. | — |
| 4 | 44-45, 62, 135-136, 267 | B2 | `typeof hook==='function'` on `voice(shell).purgeTrashedVoice`, `recoverVoiceDeletions`, `restoreTrashedVoice`, `api.deleteVoiceNoteForever` — methods of our own voice adapter. | Make them required members of a typed notes-voice interface. | Low. |
| 5 | 62, 66, 80-81, 198 | B1 | `catch{/* Unavailable. */}`, `.catch(()=>{})`, `catch{/* Retried. */}` around maintenance. Best-effort maintenance is specified ("retries on the next pass"). | Keep commented ones; delete the `try{…}catch{}` around a synchronous property read at 62 (cannot throw once #4 types it). | Low. |
| 6 | 126, 143 | C1 | Local `RestoreOutcome` union; twin `NotesRestoreOutcome` in `notes-organize-executor.ts:8`. | One exported type. | None. |
| 7 | 16, 37, 139, 233 | C5 | `kindLabel[...]||'Note'` title fallback computed 3 ways (`noteTitle`, inline at 139 and 233 with `'Untitled'`). | One `trashTitle(note)` — keep the two different fallbacks only if copy requires (`'Untitled'` vs `'Note'`). | Copy is user-visible. |
| 8 | 19 | A7 | `export const NOTES_TRASH_MAINTENANCE_INTERVAL_MS` — no importer outside this file (grep). | Unexport. | None. |
| 9 | 223, 229, 255 | D9 | Render schedules side effects (`queueMicrotask(()=>{api.set(...);trash.maintain()})`). | Move to view-open hook. | Low. |
| 10 | 258-261 | NEW? | `trashConfirmLabel` and `trashConfirmText2` are identical expressions. | Check template bindings; delete one. | Low. |
| 11 | 9-11 | D13 | Deep `.eliza` relative imports. | Alias. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag`, `Shell` | type | 14-15 | 60× | shared types |
| `kindLabel` | const | 16 | kind labels in `canonical-notes-ui.ts`/`model.js` | notes owner |
| `RestoreOutcome` | type | 126 | `notes-organize-executor.ts:8` | one export |
| `unavailableMessage`, `noteTitle` | helper | 37, 107 | none | stays |

## Proposed end state
Deleted with Older notes (0 lines). If kept: ~200 lines in `views/notes/trash.ts`, typed voice hooks, no render side effects, one restore-outcome type.

## Verification
`node --test test/note-source-references.test.mjs`, tests using `test/fixtures/notes-trash-read.mjs`, Quint application manifest + legacy notes-view harness, Playwright Notes Trash journeys, Android build (WorkManager sweep unaffected), feature-parity test.
