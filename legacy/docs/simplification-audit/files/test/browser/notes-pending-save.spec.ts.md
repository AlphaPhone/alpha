# test/browser/notes-pending-save.spec.ts
- Lines: 25 | Kind: Playwright spec, chromium, 1 test; legacy Notes UI with `browserNotesPort.compareExchange` held | Verdict: DELETE
- Covers: an edit made while the previous save is still committing is saved, not refused as a conflict. Duplicates: `canonical-notes.spec.ts` "slow saves: typing during a new note's first save makes one record…" covers the canonical equivalent. Callers/importers: none; imports `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14, 21 | A1, T6 | Opens legacy "Previous notes", patches `browserNotesPort.compareExchange` on the legacy store. | Delete. | None (canonical twin exists) |

## Proposed end state
File deleted.
