# test/fixtures/previous-notes-source-opening.mjs
- Lines: 167 | Kind: transplant (slices `agent-adapter.ts` between `  function canonicalNotesKey(` and `  function context(shell: Shell)`, strips types, runs in `vm`; plus `sourceContext` over `legacy-notes-access.ts`) | Verdict: DELETE
- Covers: opening "Previous Notes" (the legacy notes source) vs canonical Notes: selection epochs, owner changes, retained drafts, recovery statuses ("There are no previous notes on this phone." etc.). Duplicates: `test/previous-notes-source-opening.test.mjs`, `specs/quint/refinement/application/previous-notes-availability.mjs`, `test/browser/legacy-notes-access.spec.ts`. Callers/importers: `test/previous-notes-source-opening.test.mjs:5`, `specs/quint/refinement/application/previous-notes-source-opening.mjs:2` (registered `application/index.mjs:60,142`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-27, 81 | T2 / T10 | Text-marker slice of `apps/app/src/prototype/agent-adapter.ts` (markers at lines 542ff today) with ~20 fake globals. | Delete. | — |
| 2 | 9, 58-61, 131-153 | A1 | Exercises `legacy-notes-access.ts`, `notesLegacySource`, `legacy-app-notes-source`, `LEGACY_NOTES_SOURCE_KEYS`: all on the D1 delete list (`delete-candidates.md` A99, C1). | Delete the fixture, its test, its harness, index entry and Quint model with the legacy Notes source. | Low |
| 3 | 63-68, 82 | — | The only non-legacy behaviour touched is `canonicalNotesKey` / canonical UI retirement on owner change. | Cover owner change of canonical Notes in the Notes journey (`journeys/notes.spec.ts`: switch account, Notes list re-reads for the new owner). | Low |

## Proposed end state
File deleted with the legacy Notes source. Canonical owner-switch behaviour lives in the Notes journey spec and the canonical Notes models.
