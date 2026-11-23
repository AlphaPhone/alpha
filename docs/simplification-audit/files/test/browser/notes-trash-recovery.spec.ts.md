# test/browser/notes-trash-recovery.spec.ts
- Lines: 484 | Kind: Playwright spec, chromium, 10 tests, fake clock, served-module rewrite, two-context tests | Verdict: DELETE
- Covers: legacy Notes Trash under a lowered entry limit: readable/restorable/purgeable above the limit; full-Trash refusal with confirmed permanent delete; stale-view and newer-revision protection; voice notes erased with their recording; interrupted permanent deletion recovered after restart; backwards clock never purges early; write-ahead row crash safety; two tabs never settle each other's pending deletion. Duplicates: `notes-trash-full.spec.ts`, `notes-permanent-delete-backstop.spec.ts`, `notes-trash.spec.ts` overlap heavily. Callers/importers: none; imports `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 21 | A1 | Every test opens legacy "Previous notes" and its device-local Trash. | Delete. | Coverage: local Trash crash/clock/two-tab rules (legacy only) |
| 2 | 40-49 | T1/T10-like | Same `NOTES_TRASH_MAX_ENTRIES` source rewrite as two other files. | n/a. | None |
| 3 | 153, 174-184, 243-247, 370-374, 448-452 | T6 | Writes Trash and Notes documents and patches `DocumentNotesStore.prototype.execute`/`BrowserVoice.prototype.purge` in page. | n/a. | None |
| 4 | 62, 311-357 | T8 | `page.clock.install` with real timers; 60-90 s timeouts. | n/a. | None |

## Proposed end state
File deleted. Canonical Trash rules (dated deletion, Undo cannot restore a replacement) stay in `canonical-notes.spec.ts`, to be merged into `journeys/notes.spec.ts`.
