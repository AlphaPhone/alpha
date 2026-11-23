# test/notes-state-trash-compat.test.mjs
- Lines: 36 | Kind: unit of upstream (imports `vendor/eliza/plugins/plugin-notes/src/validation.ts` and `types.ts` through `tsx` with a `register()`-ed loader stub for `@elizaos/core`) | Verdict: DELETE
- Covers: the pinned upstream Notes reader accepts schema 3 with trash, upgrades schema 2, and fails closed on duplicates/unknown fields. Duplicates: `test/notes-logical-revision.test.mjs` (restart reads the schema 3 document the store wrote, `invalid persisted note revision metadata fails closed`), `notes-store-lifecycle.test.mjs` restarts. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-15 | T5 | Tests upstream `parseNotesDocument` directly with a hand-built `@elizaos/core` stub registered as a global loader hook (affects every later import in the process). | Delete; upstream owns its validator tests. | Low |
| 2 | 28-31 | A1 | Schema 2 upgrade: data that cannot exist on this package (D1). | Delete. | None |
| 3 | 5-9 | A8 | Comment narrates a past Pixel incident. | Gone with the file. | None |
| 4 | 20-26 | T4 | "schema 3 with trash is admitted" is exercised whenever the merged Notes-store integration restarts a store that has trash. | Make sure one restart in `test/integration/notes-store.test.mjs` has a non-empty trash (the restore-order case does). | Low |

## Proposed end state
Deleted. The pin-compatibility concern (a newer pin must read what the old pin wrote) is covered by the Notes-store integration restart cases, which run the actual pinned store end to end.
