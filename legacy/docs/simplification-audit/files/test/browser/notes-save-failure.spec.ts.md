# test/browser/notes-save-failure.spec.ts
- Lines: 49 | Kind: Playwright spec, chromium + firefox + webkit (in `scripts/storage-specs.ts`), 2 tests (loop); legacy Notes with quota or concurrent-edit failure, recovery download | Verdict: DELETE
- Covers: after a quota or concurrent-edit save failure the editor keeps unsaved text, does not overwrite the concurrent value, and the "Recover browser Notes" dialog downloads a backup with saved and draft text. Duplicates: `canonical-notes.spec.ts` "canonical failed save retains the owner draft until explicit discard and reload". Callers/importers: `scripts/storage-specs.ts:25`; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 14-22 | A1 | Legacy store (`browserNotesPort`, key `alpha.browser.notes.v1`). | Delete; remove from `scripts/storage-specs.ts`. | Low (canonical twin, chromium only) |
| 2 | 37-47 | D3 | "Recover browser Notes" / "Download Notes backup" is the backup/export surface D3 deletes. | Delete. | None |
| 3 | 20-21 | P3 | `IDBObjectStore.prototype.put` quota fault. | n/a. | None |

## Proposed end state
File deleted. Consider running the canonical failed-save step in the cross-browser lane so the engine coverage this file gave is not lost.
