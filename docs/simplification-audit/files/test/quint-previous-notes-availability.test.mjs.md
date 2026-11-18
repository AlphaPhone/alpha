# test/quint-previous-notes-availability.test.mjs
- Lines: 10 | Kind: Quint wrapper (application index; driver strips/slices `prototype/agent-adapter.ts` and `prototype/legacy-notes-access.ts`) | Verdict: DELETE (with model and driver)
- Covers: "Previous notes" presence follows the owner and visible probe (8 traces). Duplicates: application index runs the same campaign. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10 | A1, D1 | Models the legacy Previous-notes source that C1 deletes (`legacy-notes-access.ts`); delete-candidates C1 names this driver. | Delete this file, `previous-notes-availability.mjs`, its `.qnt`, the manifest row and the application-index entry with C1. | None |

## Proposed end state
Deleted with C1.
