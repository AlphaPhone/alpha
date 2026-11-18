# test/browser/note-audio-legacy-restore.spec.ts
- Lines: 14 | Kind: Playwright spec, chromium, 5-way loop; legacy Notes, rewrites IndexedDB rows to the pre-operation-history shape | Verdict: DELETE
- Covers: restoring a voice recording whose audio row predates deletion-operation history (legacy shape), plus empty/other-owner/expired/failed-commit refusals. Duplicates: none live; the behaviour is a legacy reader (A1). Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 7 | A1 | Seeds legacy audio rows (`delete row.deletionOperations`) and drives "Previous notes". Both deleted by D1. | Delete. | None (data shape cannot exist in the renamed package) |
| 2 | 7, 10 | T6 | Replaces `BrowserVoice.prototype.remove` and `IDBObjectStore.prototype.put`. | n/a. | None |

## Proposed end state
File deleted with the legacy audio-row reader in `note-audio-store.ts`.
