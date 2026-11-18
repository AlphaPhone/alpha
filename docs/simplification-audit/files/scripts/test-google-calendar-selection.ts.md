# scripts/test-google-calendar-selection.ts
- Lines: 41 | Kind: unit (`apps/app/src/runtime/google-calendar-selection.ts` with a Map storage) | Verdict: DELETE (feature deleted by D4 / C3)
- Covers: the nonsecret per-account Google Calendar selection used only by the client-side Calendar linked-sync stack. Duplicates: none needed. Callers: `test/google-calendar-selection.test.mjs` (child-suite shim). `delete-candidates.md` C3 lists this script and `runtime/google-calendar-selection.ts` (A97) by name.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A2 / D4 | The module under test has no product importer outside the retired stack (C3 evidence: `openCalendarSyncSettings` and `startCalendarSyncHost` have 0 importers). | Delete the script, `test/google-calendar-selection.test.mjs`, and the module in the same change as C3. | L |
| 2 | 9 | C5 | Hand-rolled `check()`/`ok N` runner. | Gone. | — |

## Proposed end state
Gone, with its shim and the module. Nothing replaces it.
