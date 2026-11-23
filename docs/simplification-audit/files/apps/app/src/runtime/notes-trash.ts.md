# apps/app/src/runtime/notes-trash.ts
- Lines: 57 | Role: durable Notes Trash storage (Android slot `notes-trash:v1:device` / browser `alpha.browser.notes-trash.v1`) on the shared trash store; saved-notes readback. | Verdict: SIMPLIFY
- Importers: `prototype/agent-adapter.ts:47`, `prototype/notes-trash-adapter.ts:3`, `prototype/voice-adapter.ts:21`. Android: `NOTES_TRASH_SLOT` literal in `AlphaNoteAudioPlugin.java` and `NotesTrashBackstopInstrumentedTest.java`; `savedNotes` name in that instrumented test.
- Text/path pins: legacy `check-notes-view-refinement.mjs:37,75`, `specs/quint/application/manifest.json`, browser specs `notes-trash*`, `notes-permanent-delete-backstop`, `feature-parity.mjs`. (`phone.css:572`/`template.html` hits are a class name, not this file.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-18, 33-42 | C4/P3 | Builds two complete stores (Android CAS port and browser edit port) and picks at call time. | `durableSlot(NOTES_TRASH_SLOT, browserNotesTrashKey)` exposing `read`/`compareExchange`/`edit`, one `createNotesTrashStore`. | Medium (installed names) |
| 2 | 49-55 | C3 | `savedNotes` raw readback duplicated in `note-audio-deletions.ts:29-33`. | `readSavedNotesRaw()` in `notes-secure-store.ts`; `savedNotes` parses it. | Low |
| 3 | 7, 25 | D4 | `export * from './notes-trash-policy'` and re-export of the lock under a second name. | Callers import policy and lock from their homes. | Low |
| 4 | 15 | A7 | `browserNotesTrashKey` exported, 0 users. | Unexport. | None |
| 5 | 17 | D11 | variable `document` shadows the DOM global. | Rename. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `android` | helper | 16 | 5 copies | `native.ts` `isAndroid` |
| two-store switch | helper | 33-42 | `notes-folders.ts`, `note-audio-deletions.ts`, `reminder-journal-store.ts` | `runtime/durable-slot.ts` |
| saved-notes readback | helper | 49-55 | `note-audio-deletions.ts:29-33` | `notes-secure-store.ts` |

## Proposed end state
~25 lines: slot constants, one trash store over `durableSlot`, `readNotesTrash`, `editNotesTrash`, `savedNotes`/`savedNoteIds`.

## Verification
Browser specs `notes-trash`, `notes-trash-full`, `notes-trash-recovery`, `notes-trash-resume`, `notes-permanent-delete-backstop`; Android `NotesTrashBackstopInstrumentedTest`; update-retention check on device/emulator.
