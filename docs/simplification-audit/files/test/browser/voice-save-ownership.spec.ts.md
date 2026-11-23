# test/browser/voice-save-ownership.spec.ts
- Lines: 19 | Kind: Playwright spec, chromium, 2 tests (success/failure) | Verdict: MERGE into `journeys/notes.spec.ts` (voice-note recording section; failure case only)
- Covers: after Stop, the recorder shows Saving… until the Notes write is confirmed; a failed write keeps the recording (`Not saved`, state `stopped`) and a successful one closes the recorder and offers Play. Duplicates: the success path is covered by every `recordAndFinish` user (`voice-preparation-ownership` test 2, `journey-b-voice-note-actions`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T6 | Holds and fails the save by patching `DocumentNotesStore.prototype.replace` in the page. | Use a storage-fault option in the harness (IndexedDB `put` failure for the notes document key) so the product code is untouched. | Low. |
| 2 | 7 | A1 | `openLegacyNotes`. | Rebase on the current Notes view. | Breaks when A2 lands. |
| 3 | 12, 15-16 | T6 | Reads `noteRecordingStatus()` via `registerPlugin` in the page. | Assert the visible recorder state only. | None. |
| 4 | 17 | T6 | Reads the raw notes document to count voice notes. | Assert the note list instead. | None. |
| 5 | 6 | T4 | Success variant duplicates other recorder journeys. | Drop it. | None. |

## Proposed end state
One step in the notes recording section: record, inject a notes-write failure, Stop, see `Not saved` with the
recording retained and one visible voice note. Needs `harness/voice.ts` and a `storageFault` harness option. File deleted.
