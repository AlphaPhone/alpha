# test/browser/helpers/legacy-notes.ts
- Lines: 69 | Kind: Playwright fixture (seeds the legacy browser Notes document and selects "Previous notes") | Verdict: **DELETE** (D1)
- Covers: opens the legacy "Previous notes" source, seeding `alpha.browser.notes.v1` with the `{version:1,archive:{v1,v2,daily},currentRaw}` envelope (production) or `openBrowserNotes().replace()` (dev). Duplicates: `native-notes.ts` (same envelope in the native slot). Callers/importers: `openLegacyNotes` 50 files, `selectLegacyNotes` 8, `openLegacyAttachment` 2, `selectLegacyNotesSource` only `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`; the same harness pins this file's text.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-69 | A1 (D1) | The legacy Notes engine, "Previous notes" UI and the archive envelope are deleted in stage A2. Every helper here targets them. | Delete; callers move to `harness/plugins/notes.ts` (canonical Notes) where the behaviour is Notes UI, or are deleted where they test the legacy source. | High blast radius: ~55 specs (e.g. `gmail-mvp-scope` share-to-email, many `notes-*`) only use it as "a Notes screen". They must switch fixture in the same change. |
| 2 | 2 | T6 | Imports a product type from `apps/app/src/runtime/browser-notes-document.ts` into the Node test process (P15). | n/a (deleted). | none |
| 3 | 8-12, 38-41 | T6, P2 | Dev path imports `/src/runtime/browser-notes-document.ts` in the page. | n/a. | none |

## Proposed end state
File deleted with the legacy Notes engine. `harness/plugins/notes.ts` (from `canonical-notes.ts`) is the only Notes
fixture. The legacy Quint notes-view harness that imports it is retired with `specs/quint/legacy` (P6) or ported first.
