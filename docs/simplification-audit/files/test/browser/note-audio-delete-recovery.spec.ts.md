# test/browser/note-audio-delete-recovery.spec.ts
- Lines: 60 | Kind: Playwright spec, chromium + firefox + webkit (listed in `scripts/storage-specs.ts`), 9 tests (8-way loop + 1); legacy Notes seeded through `/src` modules, product classes monkey-patched in page | Verdict: DELETE
- Covers: deleting a voice note in legacy "Previous notes" when the audio or Notes reply is lost, stale, recreated or interrupted by navigation; cross-tab restore waits on the audio-effects lock. Duplicates: canonical deletion/Undo in `canonical-notes.spec.ts` ("Undo for a canonical deletion cannot restore a replacement trash entry", "a lost canonical recording save reply is reconciled…"). Callers/importers: listed in `scripts/storage-specs.ts:27`; imports `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 14, 32, 46, 50 | A1 | Every test selects legacy "Previous notes" (`selectLegacyNotes`) and seeds `browser-notes-document.ts`, which D1 deletes. | Delete with the legacy Notes engine (stage A2). Remove the entry from `scripts/storage-specs.ts`. | Coverage: see chunk summary (voice-note delete with lost audio reply under canonical Notes) |
| 2 | 16-23, 47-48 | T6 | Monkey-patches `BrowserVoice.prototype.remove/describe` and `DocumentNotesStore.prototype.execute`; repeated dynamic imports of the same module 10 times on one line. | n/a (deleted). | None |
| 3 | 54 | T1-like | Asserts exactly 3 pending locks named `alpha.notes-audio-effects.v1`, an internal count. | n/a. | None |

## Proposed end state
File deleted. If the owner wants a canonical equivalent, one step in `journeys/notes.spec.ts`: delete a canonical voice note while the fixture drops the reply, then Undo/reload shows one note with its recording.
