# apps/app/src/runtime/note-audio-deletions.ts
- Lines: 42 | Role: binds the shared plugin-notes recording-deletion journal to Alpha's installed slot (`notes-audio-deletions:v1:device`) / browser document (`alpha.browser.notes-audio-deletions.v1`). | Verdict: SIMPLIFY (→ notes bindings + durable slot)
- Importers: `prototype/voice-adapter.ts:19` (`pendingAudioDeletions`, `withAudioDeletionLock`, `changeAudioDeletion`, `audioDeletionNoteState`, `audioDeletionJournal`, `AudioDeletion`), `prototype/agent-adapter.ts:46` (`audioDeletionRecovery`).
- Text/path pins: browser specs import the path (`note-audio-delete-recovery`, `notes-document-storage`, `notes-permanent-delete-backstop`, `notes-trash-recovery`, `notes-trash`); `specs/quint/application/manifest.json`, `specs/quint/native/manifest.json`; `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-28 | C4/P3 | Per-feature Android-slot/browser-document switch: own `android()`, own read, own CAS edit with its own "changed" error. Same as `notes-folders.ts`, `notes-trash.ts`, `reminder-journal-store.ts`. | Use one `durableSlot<T>(slot, browserKey)` (generalised `reminder-journal-store.ts`). Keep both names exactly. | Medium (installed identity) |
| 2 | 29-33 | C3 | "read saved notes raw" duplicated with `notes-trash.ts:50-51`. | `readSavedNotesRaw()` in `notes-secure-store.ts` (or the notes bindings module). | Low |
| 3 | 2-3 | D4 | imports and re-exports `withAudioDeletionLock` from `note-audio-lock`. | Callers import the lock from the bindings module. | Low |
| 4 | 35-42 | D4 | renamed aliases `audioDeletionJournal=journal`, `pendingAudioDeletions=journal.pending`, … | Export `audioDeletionJournal` only; voice-adapter calls `.pending/.change/.noteState`. | Low (browser specs call `pendingAudioDeletions`) |
| 5 | 18-21 | A7 | `audioDeletionDocument` exported, no external user (0 src, 0 tests). | Unexport. | None |
| 6 | 17 | D11 | module variable named `document` shadows the DOM global. | Rename `browserDocument`. | None |
| 7 | 16 | C3/P8 | `const android=()=>Capacitor.getPlatform()==='android'`. | `isAndroid` from `native.ts`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `android` | helper | 16 | `notes-trash.ts:16`, `notes-folders.ts:9`, `reminder-journal-store.ts:10`, `workflow-intents.ts:19` | `native.ts` `isAndroid` |
| slot/document switch | helper | 18-28 | `notes-folders.ts:7-19`, `notes-trash.ts:16-42`, `reminder-journal-store.ts:9-19`, `service-read-cache-store.ts:17-22` | `runtime/durable-slot.ts` |
| saved-notes raw reader | helper | 29-33 | `notes-trash.ts:49-55` | `notes-secure-store.ts` `readSavedNotesRaw` |
| `AudioDeletion` | type alias | 14 | upstream `NotesRecordingDeletion` | import upstream name |

## Proposed end state
~15 lines inside a `notes/bindings.ts`-style module: slot and key constants, `durableSlot(...)`, `createNotesRecordingDeletionJournal({...durable, readSavedNotes: readSavedNotesRaw})`, `audioDeletionRecovery`.

## Verification
Browser specs `note-audio-delete-recovery`, `notes-document-storage`, `notes-permanent-delete-backstop`, `notes-trash-recovery`, `notes-trash`; Quint application/native manifests; Android update-retention check for the slot name (distinct from an APK build).
