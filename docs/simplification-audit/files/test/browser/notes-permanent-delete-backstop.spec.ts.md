# test/browser/notes-permanent-delete-backstop.spec.ts
- Lines: 353 | Kind: Playwright spec, chromium, 7 tests, 60 s timeout; legacy Notes state written through product storage modules, served modules rewritten by `page.route` | Verdict: DELETE
- Covers: recovery of a permanent voice-note deletion interrupted at each stage (before tombstone, after tombstone, recording trashed or erased first) when "Older notes" is explicitly selected; exact ownership; no orphaned recording; a lost tombstone commit is not settled by the same process. Duplicates: native backstop is `NotesTrashBackstopInstrumentedTest` (Android, separate gate, named in the header). Callers/importers: none; imports `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7, 18-29 | A1 | Every test is "explicit source activation" of the retained legacy source (D1). Canonical Notes never touches it. | Delete with legacy Notes and `note-audio-deletions.ts`/`notes-trash.ts` if those go with it. | Coverage: crash-recovery of permanent voice deletion (browser build) |
| 2 | 234-241, 335-340 | T1/T10-like | `page.route` rewrites served `notes-trash-policy.ts` (`NOTES_TRASH_MAX_ENTRIES`) and `voice.ts` (regex on `await changeAudioDeleted(…)`) to inject behaviour. Breaks on any reformat. | n/a (deleted). | None |
| 3 | 51-65 | T6 | `interrupt` writes intermediate durable state via product modules and holds a Web Lock forever. | n/a. | None |
| 4 | 272-279 | T6 | Monkey-patches `DocumentNotesStore.prototype.execute` and `BrowserVoice.prototype.describe`. | n/a. | None |

## Proposed end state
File deleted. Ask the owner whether canonical voice-note permanent deletion has a crash-recovery requirement on the browser build; if so it is a server/agent test, not this spec.
