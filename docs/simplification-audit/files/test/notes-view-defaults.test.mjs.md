# test/notes-view-defaults.test.mjs
- Lines: 54 | Kind: transplant (slices the `/* ===== module: notes ===== */` block of `prototype/model.js`, type-strips `runtime/notes-folders-model.ts`, `runtime/notes-view.ts` and `prototype/canonical-notes-ui.ts` with imports/exports regex-removed, runs in `vm`/`new Function`) | Verdict: DELETE
- Covers: the Notes renderer's default surface, a voice row without duration shows no NaN, checklist blank-item action names, and the canonical projection's offline / "Previous notes" naming. Duplicates: `test/browser/canonical-notes-checklist-labels.spec.ts` (checklist labels), `canonical-notes.spec.ts`, `legacy-notes-access.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-7, 32-34 | T2, D7 | Relies on the `/* ===== module: notes ===== */` marker comments in `model.js` and on regex-stripping imports; blocks the `model.js` split (Stage F). | Delete. | None |
| 2 | 44-54 | A1 | "Previous notes" naming, `olderNotesAction`, legacy source availability. | Delete with C1. | None |
| 3 | 18-29 | T4 | Checklist labels duplicate `canonical-notes-checklist-labels.spec.ts`. | Delete. | None |
| 4 | 14-17 | - | Voice row without duration shows no "NaN". | Carry one assertion into `journeys/notes.spec.ts` (seed a voice note without duration, row text has no NaN). | Low |
| 5 | 36-43 | - | Offline agent Notes shows "Agent offline", no create/record. | Carry into `journeys/notes.spec.ts` if `canonical-notes.spec.ts` does not already assert it. | Low |

## Proposed end state
Deleted. Two user-visible assertions (no NaN on a duration-less voice row, offline Notes shows "Agent offline" with no create/record) live in `journeys/notes.spec.ts`.
