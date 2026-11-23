# test/browser/note-audio-lifecycle.spec.ts
- Lines: 33 | Kind: Playwright spec, chromium (and webkit-shaped rows), 4 tests; module-in-page calls to the browser `AlphaNoteAudio` plugin, buttons injected into the DOM | Verdict: REWRITE as steps in `journeys/notes.spec.ts`; delete the migration cases
- Covers: browser note-audio plugin: legacy row migration (blob and WebKit `{bytes,mimeType}` shapes), save replay ownership, trash/restore ownership and survival across reload, failed trash commit rollback, 60-day purge, malformed-row retention, playback events and cross-tab delete stopping playback. Duplicates: canonical audio save/restore journey in `notes-audio-journey.spec.ts`; ownership refusal also asserted there (lines 52-59). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14, 19-22 | A1 | `migrationStatus`, legacy blob rows and "malformed legacy rows are retained for recovery" test the migrate-on-read path D1 deletes. | Delete test 1 and the malformed/legacy half of test 3. | None |
| 2 | 15-18 | T6 | Trash/restore ownership through direct plugin calls, no UI. | Carry one case: canonical voice note deleted then restored after reload keeps its recording (UI). Wrong-owner refusals are internal. | Low |
| 3 | 23-33 | T6 | Injects fixed-position "Play …" buttons into `document.body` to get user activation, then calls the plugin. | Carry "deleting a recording in another tab stops its playback" as a two-tab canonical step using the real Play recording control. | Low |
| 4 | 20 | P3 | Aborts every `audio` transaction via `IDBObjectStore.prototype.put` to prove rollback. | Drop; storage-boundary rollback is covered by the canonical failed-save journey. | Low |
| 5 | 5-10 | T7 | Hand-built WAV writer duplicated in `note-calendar-handoff.spec.ts:43-44`. | One `wav()` helper in the notes fixture if any step still needs bytes. | None |

## Proposed end state
File deleted. Two steps in `journeys/notes.spec.ts` (cross-browser lane): delete-reload-restore keeps the recording playable; delete in a second tab stops playback in the first.
