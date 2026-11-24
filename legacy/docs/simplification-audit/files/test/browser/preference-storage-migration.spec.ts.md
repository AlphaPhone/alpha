# test/browser/preference-storage-migration.spec.ts
- Lines: 34 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:16`); module-in-page calls on `preference-documents.ts` and `BrowserSurface`, with an `IDBObjectStore.prototype.put` fault and one Device-controls recovery dialog | Verdict: DELETE (carry two cases into `journeys/browser.spec.ts`)
- Covers: empty bookmark reads and the clock's sound polling create no stored data; concurrent bookmark writers in two tabs keep all 20 addresses across reload and never write the legacy localStorage key; a failed commit keeps prior bookmarks; bookmark and alert-sound documents preserve exact **legacy** bytes and refuse a changed older copy; a stale recovery capture cannot erase a newer edit; damaged (legacy-key) bookmarks download exact bytes before an explicit reset. Duplicates: `product-recovery-entry.spec.ts` test 1 (same damaged-bookmark download/reset via the Browser menu), `reset-only.production.spec.ts`, Quint `domain-document-creation`. Callers: `scripts/storage-specs.ts` (cross-browser lane).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-22 | A1 (C6) | "preserves exact legacy bytes and refuses a changed older copy" tests the legacy import path of `domain-document.ts` (`Envelope.legacy`, `unchanged()`), a C6 delete. | Delete with the reader. | None. |
| 2 | 27-34 | A1, T4 | Damage seeded through the legacy localStorage key; duplicates `product-recovery-entry.spec.ts` test 1 via Device controls. | Delete; recovery (if kept) is covered once with a current-store seed. | None. |
| 3 | 23-25 | A1, T3 | Stale `store.reset(before)` refusal compares a capture that includes the legacy field. | Delete; the generic revision fence is Quint `domain-document-creation`. | Low. |
| 4 | 3-10 | T6, T3 | Wraps `alertSoundDocument.read` to count clock polls, then reads `capture()`; no user action. | Delete; "opening Browser creates no bookmark record" can be one assertion in the browser journey. | Low. |
| 5 | 11-18 | T6 | Two-tab writers and the failed-commit fault call `BrowserSurface.setBookmark` directly. | Rewrite as UI: bookmark pages in two tabs, reload, all present; a failing store write shows an error and keeps prior bookmarks (harness IndexedDB fault). | Low. |
| 6 | 1-34 | D8 | Lines up to ~500 characters. | Gone. | None. |

## Proposed end state
File deleted and removed from `scripts/storage-specs.ts`. `journeys/browser.spec.ts` (bookmarks) gains: (1) two tabs bookmark concurrently, reload shows all; (2) a failed save keeps earlier bookmarks and says so. Everything legacy goes with C6.
