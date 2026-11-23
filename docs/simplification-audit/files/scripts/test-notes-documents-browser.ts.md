# scripts/test-notes-documents-browser.ts
- Lines: 42 | Kind: Playwright script spawned from a spec (T9), with in-page imports and a hand-written `window.Capacitor` fake (T6/T7), on the legacy "Previous notes" source | Verdict: DELETE
- Covers: Import text note / Share > Save file / cancelled import / reload on the legacy Notes source. Duplicates: `test/browser/mvp.spec.ts` and `notes-document-receipt.spec.ts` drive Import text note on the current source; `reset-only.production.spec.ts` too. Callers/importers: `test/browser/adapters.spec.ts:6`; imports `test/browser/helpers/legacy-notes.ts` (`selectLegacyNotes`), `test/browser/helpers/page-modules.ts`, `scripts/fixtures/playwright.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-27 | A1 | Opens the legacy browser Notes document and selects "Previous notes" (D1 deletes that source and `helpers/legacy-notes.ts`). | Delete. | None |
| 2 | 15-21 | T7 | Bespoke `AlphaNoteDocuments` Capacitor fake. | The journey harness owns one typed bridge fake. | None |

Cases worth carrying (only if `mvp.spec.ts` lacks them): import keeps exact text with CRLF normalised in the editor; cancelled import adds no note; exported snapshot is `title + blank line + body`.

## Proposed end state
Deleted; entry removed from `adapters.spec.ts`. Any missing case goes to `journeys/notes.spec.ts`.
