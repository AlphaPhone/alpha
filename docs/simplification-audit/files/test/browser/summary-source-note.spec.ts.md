# test/browser/summary-source-note.spec.ts
- Lines: 37 | Kind: Playwright chromium, 5 tests; real UI for the Files → Ask Alpha → Save summary flow, with setup and state reads through `/src` imports and prototype patches (s7 r52) | Verdict: MERGE into `journeys/notes.spec.ts`
- Covers: a displayed answer needs review before a summary note is saved; cancel saves nothing; the saved note has exactly the edited text and a `documentSource` (name, type, size, sha256, `b1:` reference) and never the omitted private line; the linked source opens, follows a rename and reports "Source missing" after deletion; a quota failure is not retried into duplicates; an agent change during review refuses saving; an unverifiable source can be explicitly omitted; an old bridge without source references saves fingerprint-only. Duplicates: `source-reference-integrity.spec.ts` (module-level), `file-email.spec.ts` (Files → Ask Alpha). Callers/importers: chromium; imports `helpers/connection-diagnostics`, `helpers/legacy-notes`, `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 8, 16 | A1 | `openLegacyNotes` selects "Previous notes" (deleted by D1). Setup and the provenance check both depend on it. | Use the current Notes source (`helpers/canonical-notes.ts` / Notes UI). | Medium: setup must be rebuilt. |
| 2 | 35-37 | A1 | "Older document bridges retain fingerprint-only saving": patches `BrowserMailAttachments.prototype` to remove `sourceReferenceVersion`, i.e. compatibility with an older native bridge. Bridge and renderer ship in one APK. | Delete the case and the `sourceReferenceVersion?: 1` optional branch it protects (`note-source-adapter.ts:99`). | Low |
| 3 | 30-33 | T6 | Calls `reviewContentQuestion()` from `/src/browser/content-question.ts` directly with a fake `source()`. | Reach it from Files with an over-limit file, or drop. | Low |
| 4 | 9, 18, 20 | P2 | Imports, renames and deletes the file through `registerPlugin('AlphaFiles')`. | Use the Files UI. | Low |
| 5 | 13 | P2 | Reads notes through `readBrowserNotesRaw()` from the runtime module. | Assert in the Notes UI after reload; keep one raw read of `documentSource` through the harness if provenance fields matter. | Low |
| 6 | 28 | P3 | Agent change simulated by overwriting `connectionController.getSnapshot`. | Use the harness to switch session (offline → reconnect) or drop; `use-in-email` covers the same "session changed under review" rule. | Low |
| 7 | 8 | D5 | Setup goes through Settings → connection diagnostics → "Connect development profile". | Harness fixture for the development agent. | None |

## Proposed end state
In `journeys/notes.spec.ts`: "summary from a file needs review, saves exactly the edited text with source provenance and without omitted lines; the source opens, follows rename, reports missing after delete" and "a refused save is not repeated". Both on the current Notes source with Files driven through its UI. Delete the old-bridge case (A1), the direct `reviewContentQuestion` case and the snapshot-patch case. Delete this file and, once no spec uses it, `helpers/legacy-notes.ts`.
