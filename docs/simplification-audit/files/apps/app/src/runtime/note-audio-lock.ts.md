# apps/app/src/runtime/note-audio-lock.ts
- Lines: 3 | Role: binds the shared notes deletion lock to the installed lock name `alpha.notes-audio-effects.v1`. | Verdict: MERGE into a notes bindings module (with notes-store/notes-secure-store/permanent-voice-deletion constants)
- Importers: `runtime/browser-notes-document.ts:8`, `runtime/note-audio-deletions.ts:2-3` (import + re-export), `runtime/notes-trash.ts:25` (re-exported as `withNotesDeletionLock`).
- Text/path pins: `specs/quint/application/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4 | one binding line `createNotesDeletionLock('alpha.notes-audio-effects.v1')`, re-exported under two names elsewhere. | Move into the notes bindings module; export one name (`withNotesDeletionLock`) and update the 4 importers. | Low |
| 2 | 3 | D11 | named "audio" but also guards every Notes Trash write (`notes-trash.ts:20-25`). | Name it `withNotesDeletionLock`. Keep the lock string exactly. | Low (lock name is installed identity across tabs) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `withAudioDeletionLock` | const | 3 | alias `withNotesDeletionLock` (`notes-trash.ts:25`) | notes bindings module |

## Proposed end state
File deleted; one line in the notes bindings module.

## Verification
Notes trash and audio-delete browser specs; Quint application manifest path list.
