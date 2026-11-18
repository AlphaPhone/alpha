# test/browser/legacy-list-identity.spec.ts
- Lines: 20 | Kind: Playwright spec, `chromium`; seeds `localStorage['alpha.browser.bookmarks.v1']` with a duplicate URL and reads `AlphaBrowser.bookmarks()` via `/src/platform-plugins.ts` (T6) | Verdict: DELETE
- Covers: duplicate URLs in a legacy localStorage bookmark list render once and the stored array is not rewritten. Duplicates: none. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | A1 | The duplicate can only come from the legacy localStorage value that `BrowserDomainDocument` reads as its initial state (`preference-documents.ts:7`, `()=>localStorage.getItem(key)`); `setBookmark` (`browser-surface.ts:67`) removes an existing URL before adding it, so the current format never holds duplicates. | Delete with the localStorage→document migrate-on-read (D1). | Low. |
| 2 | 15-18 | T6 | Store read by in-page plugin import. | Gone. | - |

## Proposed end state
File deleted. Bookmark add/remove is covered by the browser journey through the Bookmarks UI.
