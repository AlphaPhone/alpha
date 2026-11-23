# apps/app/src/prototype/notes-organize-executor.ts
- Lines: 120 | Role: executes approved agent Notes organisation operations (filter, record start/stop, folder create, move, restore) against an injected host; plus the shell-backed host | Verdict: SIMPLIFY + MOVE executor to `apps/app/src/runtime/notes-organize-executor.ts`
- Importers: `agent-adapter.ts:36,1058` (`executeNotesOrganize`, `notesOrganizeShellHost`); `test/notes-organize.test.mjs:52-65`.
  Text/path pins: `test/support/feature-parity.mjs:397`. No Quint manifest pin.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 100, 102, 111-116 | A1 (P10) | `ready:()=>!!shell.live&&!!shell.notesStore&&!shell.notesStorageFailed&&!shell.notesPending` — `notesStore` is set only for Older notes (`agent-adapter.ts:570,617`); in the default canonical mode it is `null`, so `notes_record`, `notes_folder_create`, `notes_move` and `notes_restore` all return "Notes unavailable". `restore` reads `api('notes').notesTrash`, which canonical mode sets to `undefined` (`canonical-notes-ui.ts:320,342`). Only `notes_filter` works for agent Notes. | Owner decision: either route these operations to the canonical Notes client (then `ready()` reads the canonical binding) or delete them with legacy notes. As it stands the host is legacy-bound. | Owner question; behaviour change either way. |
| 2 | 98, 101-110 | C1/D3 | `shell:any` and direct reads of ad-hoc shell fields (`notesStore`, `notesStorageFailed`, `notesPending`, `S().view`, `openView`). | Type via `ShellHost`/notes controller. | None. |
| 3 | 106 | C5 | `showFolders` writes `{folders, foldersLoaded:true}` — same patch as `notes-folders-adapter.ts:19,25,32`. | One `showFolders` on the notes owner. | None. |
| 4 | 51, 54, 62, 74, 82, 84 | B1 | `.catch(()=>'failed')`, `.catch(()=>null)`, `.catch(()=>false)` map failures to specified receipts ("Mic failed", "Not created", "Unconfirmed"). This is the documented contract. | Keep. | — |
| 5 | 75 | NEW (JSON identity) | `JSON.stringify(target)!==JSON.stringify(operation.target)` structural compare. | Compare `target.revision`/id fields explicitly (or shared `sameTarget`). | Low. |
| 6 | 8 | C1 | `NotesRestoreOutcome` re-declares the outcome union already local to `notes-trash-adapter.ts:126` (`RestoreOutcome`, minus `'missing'`). | Export one `NotesRestoreOutcome` from the trash owner (or `runtime/notes-trash`). | None. |
| 7 | 7 | C1 | `type Note={id:string;folderId?:unknown;…}` local minimal record; `NoteRecord` exists in `runtime/notes-store`. | Use `Pick<NoteRecord,'id'|'folderId'>`. | None. |
| 8 | 117-118 | B2 | `notesRecorderControl()` null-checks — the control is registered once by `voice-adapter.ts:1211` at install. | Keep the null check only if voice adapter can be absent (fixture mode); otherwise inject the control. | Low. |
| 9 | whole file | D11 | Executor is pure domain logic with an injected host; it belongs in `runtime/` (the contract already lives at `runtime/notes-organize-contract.ts`). | Move `executeNotesOrganize` + `NotesOrganizeHost` to `runtime/`; keep `notesOrganizeShellHost` with the notes owner. | Path pin in feature-parity. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Note` | type | 7 | `NoteRecord` (`runtime/notes-store`) | delete, use `Pick<NoteRecord,…>` |
| `NotesRestoreOutcome` | type | 8 | `notes-trash-adapter.ts:126 RestoreOutcome` | one export |
| `NotesOrganizeHost`, `NotesOrganizeReceipt` | interface | 10-28 | `ReviewResult` in `notes-query-executor.ts:37` (same shape `{status,summary}`) | shared `DeviceActionReceipt` |
| `summaries` | const | 85-93 | none | stays |

## Proposed end state
`runtime/notes-organize-executor.ts` (~85 lines) unchanged in behaviour, typed host; the shell host (~20 lines) in the notes view owner, bound to the canonical notes controller (or reduced to `notes_filter` + recording if the owner drops legacy without porting). Est. ~105 lines total.

## Verification
`node --test test/notes-organize.test.mjs`, agent-action integration tests that drive notes organise operations, Playwright Notes organise journeys, feature-parity test.
