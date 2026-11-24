# test/browser/note-source.spec.ts
- Lines: 31 | Kind: Playwright spec, chromium, 4 tests (2-theme loop + 2); legacy Notes seeded with a `documentSource` record | Verdict: DELETE (REWRITE on canonical only if canonical notes keep source documents; owner question)
- Covers: a note's linked source file is stored as a fingerprint (name, type, sha256, size, no bytes); a changed file is refused; the matching file opens a preview; the dialog fits at 150 % text in both themes; a delayed read after close is ignored; a failed metadata save keeps the note. Duplicates: none. Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 14, 30 | A1 | Seeds and reopens legacy "Previous notes" (`openBrowserNotes().replace`, `openLegacyNotes`). | Delete with legacy Notes. `canonical-notes-ui.ts:19` lists `documentSource` as a local handle, so the feature may survive in canonical Notes; if so, rewrite one step on `canonicalNotesFixture`. | Coverage: source fingerprint mismatch refusal |
| 2 | 15 | D8 | One 1,000+ character line holds the whole layout check (44 px targets, in-viewport, screenshot). | In a rewrite, use the shared accessibility/target-size helper. | None |
| 3 | 15 | T6 | Calls `BrowserDevice.prototype.setTextScale` directly to get 150 % text. | Use the Settings text-size control or a harness `textScale` option. | Low |
| 4 | 20, 28 | P3 | Patches `File.prototype.arrayBuffer` (delayed read) and `IDBObjectStore.prototype.put` on key `alpha.browser.notes.v1` (legacy key). | Keep the delayed-read case if rewritten; the put patch targets a deleted key. | Low |

## Proposed end state
File deleted with legacy Notes. If canonical Notes keeps linked sources: one step in `journeys/notes.spec.ts` (attach, reload, changed file refused, matching file previews) on the canonical fixture.
