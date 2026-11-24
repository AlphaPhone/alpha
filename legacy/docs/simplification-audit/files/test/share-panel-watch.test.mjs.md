# test/share-panel-watch.test.mjs
- Lines: 31 | Kind: transplant (type-strips all of `share-panel.ts` into a `data:` module) + source-text (regexes `share-panel-adapter.ts`) | Verdict: DELETE
- Covers: `unchangedSince` compares by identity first and serialises only replaced objects. Duplicates: `share-panel-adapter.test.mjs`; journey case proposed there. Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | T2 | Could import the module directly; it strips types instead. | Delete. | Low |
| 2 | 8-26 | T3 | Performance property (reads count) of a pure helper. | Delete. | Low |
| 3 | 27-31 | T1 | Asserts no `JSON.stringify` in the adapter and an exact call expression. | Delete. | Low |

## Proposed end state
File deleted.
