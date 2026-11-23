# apps/app/src/prototype/notes-recorder-control.ts
- Lines: 10 | Role: module-level registry for the open Notes recorder's start/stop, set by the voice adapter and read by the notes organise executor | Verdict: MERGE into `note-recorder.ts` (or the notes view owner)
- Importers: `voice-adapter.ts:46,1211` (set), `notes-organize-executor.ts:5,117-118` (read).
  Text/path pins: `specs/quint/application/manifest.json:3430`, `specs/quint/refinement/application/notes-recorder-media-admission.mjs`, `test/fixtures/notes-recorder-media.mjs:75`, `test/fixtures/cloud-voice-view.mjs:61-65` and `.d.mts:58`, `test/support/feature-parity.mjs:400`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-10 | D3 | `let control … setNotesRecorderControl/notesRecorderControl` — module-level service locator between two adapters. | Pass the recorder control to `notesOrganizeShellHost` explicitly (the voice adapter owns it; the agent adapter builds the host), or hold it on the notes controller. Then delete this file. | Low; Quint manifest and two fixtures pin the path. |
| 2 | 5-7 | C1 | `NotesRecordStart`/`NotesRecordStop`/`NotesRecorderControl` types. | Move into `note-recorder.ts` (types of the recorder). | None. |
| 3 | whole | — | Tiny file (research §5 "Tiny files to merge"). | Merge. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NotesRecordStart`, `NotesRecordStop` | type | 5-6 | none | `note-recorder.ts` |
| `NotesRecorderControl` | interface | 7 | mirrored in `test/fixtures/cloud-voice-view.d.mts` | `note-recorder.ts` |

## Proposed end state
Deleted; three types live in `note-recorder.ts`; the control is an explicit dependency of the organise host. 0 lines.

## Verification
Quint notes-recorder-media admission, `scripts/test-cloud-voice-flow.ts`, `node --test test/notes-organize.test.mjs`, feature-parity test.
