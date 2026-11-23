# test/browser/legacy-notes-access.spec.ts
- Lines: 78 | Kind: Playwright spec, `chromium`, 4 tests; seeds and monkey-patches `browserNotesPort.read` and `connectionController.getAppRecordClient` in-page (T6) | Verdict: DELETE
- Covers: the "Previous notes" route over the legacy browser Notes document: visible route and return, absent when no legacy document exists, recovery on unreadable legacy bytes, and an owner change cannot expose a stale legacy recovery entry. Duplicates: none outside legacy-notes specs (`helpers/legacy-notes.ts` and ~55 specs use the same source). Callers/importers: none; imports `helpers/canonical-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-78 | A1 | Every test is about the legacy "Previous notes" source (`browser-notes-document.ts` legacy store), deleted by D1. | Delete with the feature. | Low. |
| 2 | 28-31, 43-44, 57-67 | T6 | Replaces product functions in-page (`browserNotesPort.read`, `getAppRecordClient`). | Gone. | - |

## Proposed end state
File deleted. Current Notes behaviour stays covered by `journeys/notes.spec.ts` (from the `canonical-notes*` specs).
