# specs/quint/refinement/application/previous-notes-availability.mjs
- Lines: 134 | Kind: Quint refinement harness, source transplant (slices `agent-adapter.ts` by text, strips types, runs in `vm` with stubs) | Verdict: DELETE (models the legacy "Previous Notes" source — D1/A1)
- Covers: presence probe for the retired legacy Notes store (owner ABA, native collection→draft read, foreground/suspension retirement). Duplicates: `test/browser/legacy-notes-access.spec.ts` (also legacy). Callers/importers: `index.mjs:58,140`, `test/quint-previous-notes-availability.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10, 13-16 | A1, T2 | Product code it runs is already gone in this worktree: `apps/app/src/prototype/legacy-notes-access.ts` is deleted and `agent-adapter.ts` no longer contains `  function previousNotesOwnerKey(` / `  async function previousNotesObservation(` (assert at l.16 fails). The harness is currently broken. | Delete this file together with `specs/quint/application/PreviousNotesAvailability.qnt`, its manifest entry (`application/manifest.json` ~l.3501), `index.mjs` import + adapter entry, and `test/quint-previous-notes-availability.test.mjs`. | None (feature deleted) |
| 2 | 4 | — | Imports `test/support/strip-types.mjs`; ~200 other files still import it, so it survives this deletion. | None. | — |

## Proposed end state
File, model, manifest row, aggregate entry and wrapper test deleted in the same commit as the legacy Notes reader removal. `Quint` stays at 100 % because the model leaves the manifest with its harness.
