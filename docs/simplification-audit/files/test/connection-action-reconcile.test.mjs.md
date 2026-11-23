# test/connection-action-reconcile.test.mjs
- Lines: 49 | Kind: source transplant (`connectionController.reconcile` sliced from `connection-ui.tsx` between `  async reconcile(entryId` and `  async reconcileAction(`, type-stripped with `node:module` `stripTypeScriptTypes`, run in `vm`) | Verdict: DELETE
- Covers: an "It happened / It did not happen" answer re-reads action history; if the connection changed during the read (epoch bump), nothing is written into the new connection; on the same connection the read replaces history or drops the answered row on failure. Duplicates: none direct; staleness-fence pattern covered by Quint connection models where listed. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T2 / D7 | Text slice of the god module. | Delete. | Medium: only check of this epoch fence. |
| 2 | 4 | C5 | Third strip-types mechanism (`node:module` built-in) next to `support/strip-types.mjs` and `fixtures/ts-source.mjs`. | Goes with the file. | None |
| 3 | 7 | A8 | Ticket id `MS-024-F01` in the header. | - | - |

## Proposed end state
Deleted. When action history reconcile moves to its own module in the connection-ui split, one case "reconcile after a connection change writes nothing" joins `test/integration/connection-cloud.test.mjs` (or the action-history integration file). The visible flow ("It happened" updates the row) is a step in `journeys/chat.spec.ts`.
